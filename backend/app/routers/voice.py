import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.config.database import async_session
from app.services.ollama_service import OllamaLLM
from app.services.ollama_embedder import OllamaEmbedder
from app.services.chroma_store import ChromaVectorStore
from app.services.rag_service import RAGService
from app.services.voice_service import VoiceService
from app.services.project_service import ProjectService
from app.services.conversation_service import ConversationService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice"])

RECEIVE_TIMEOUT = 30


@router.websocket("/ws/voice")
async def voice_ws(ws: WebSocket):
    await ws.accept()
    try:
        config = await asyncio.wait_for(ws.receive_json(), timeout=RECEIVE_TIMEOUT)
        if config.get("type") != "config":
            await ws.send_json({"type": "error", "content": "Premier message doit être config"})
            await ws.close()
            return

        project_id = config["project_id"]
        model = config["model"]
        conversation_id = config.get("conversation_id")
        options = config.get("options", {})

        audio_bytes = await asyncio.wait_for(ws.receive_bytes(), timeout=RECEIVE_TIMEOUT)
        if len(audio_bytes) < 100:
            await ws.send_json({"type": "error", "content": "Audio trop court"})
            await ws.close()
            return

        stt = ws.app.state.stt
        tts = ws.app.state.tts
        semaphore = ws.app.state.voice_semaphore

        async with semaphore:
            async with async_session() as session:
                project_service = ProjectService(session)
                project = await project_service.get(project_id)
                if not project:
                    await ws.send_json({"type": "error", "content": "Projet non trouvé"})
                    await ws.close()
                    return

                conv_service = ConversationService(session)

                rag = RAGService(
                    llm=OllamaLLM(),
                    embedder=OllamaEmbedder(),
                    store=ChromaVectorStore(project.collection_name),
                )
                voice = VoiceService(stt=stt, tts=tts, rag=rag)

                text = await voice.transcribe(audio_bytes)
                if not text.strip():
                    await ws.send_json({"type": "error", "content": "Aucune parole détectée"})
                    await ws.close()
                    return

                await ws.send_json({"type": "transcription", "text": text})

                if not conversation_id:
                    title = text[:50] + ("..." if len(text) > 50 else "")
                    conversation = await conv_service.create(project.id, title)
                    conversation_id = conversation.id
                    await ws.send_json({"type": "conversation_id", "content": str(conversation_id)})

                db_messages = await conv_service.get_messages(conversation_id)
                history = [{"role": msg.role, "content": msg.content} for msg in db_messages]

                await conv_service.add_message(conversation_id, "user", text)

            full_response = ""
            sources_data = []

            async for event in voice.ask_stream(
                question=text,
                model=model,
                conversation=history,
                options=options,
                instruction=project.system_prompt,
            ):
                if event["type"] == "token":
                    full_response += event["content"]
                    await ws.send_json(event)
                elif event["type"] == "sources":
                    sources_data = event["content"]
                    await ws.send_json(event)
                elif event["type"] == "audio":
                    await ws.send_bytes(event["content"])
                    await ws.send_json({"type": "audio_done"})

            async with async_session() as save_session:
                save_service = ConversationService(save_session)
                await save_service.add_message(conversation_id, "assistant", full_response, sources_data)

        await ws.send_json({"type": "done"})

    except asyncio.TimeoutError:
        logger.warning("WebSocket voice: timeout en attente du client")
        await ws.close()
    except WebSocketDisconnect:
        logger.info("Client déconnecté du WebSocket voice")
    except Exception as e:
        logger.error("Erreur WebSocket voice: %s", e)
        try:
            await ws.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
