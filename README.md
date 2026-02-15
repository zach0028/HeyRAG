# HeyRAG

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB.svg)](https://python.org)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org)

A personal project exploring RAG, voice AI and local LLMs. Chat with your documents privately using Ollama — everything runs on your machine, nothing is sent to external servers.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Voice Support](#voice-support)
- [Configuration](#configuration)
- [License](#license)

---

## Features

- **Multi-project workspace** with separate document collections
- **Conversational RAG** with real-time streaming responses
- **Voice input and output** powered by Whisper and Kokoro (Apple Silicon only)
- **Adjustable model parameters** including temperature, top-p, repeat penalty and context window
- **Per-project system prompts** to customize assistant behavior
- **Conversation history** persisted across sessions
- **Automatic context detection** that adapts the context window to the selected model
- **Works without documents** as a general-purpose local chatbot

---

## Tech Stack

| Layer        | Technology                                     |
|--------------|------------------------------------------------|
| Frontend     | Next.js 16, React 19, shadcn/ui, Tailwind CSS |
| Backend      | FastAPI, SQLModel, Server-Sent Events          |
| LLM          | Ollama (local inference)                       |
| Embeddings   | nomic-embed-text via Ollama                    |
| Vector Store | ChromaDB                                       |
| Database     | PostgreSQL                                     |
| Voice        | MLX Audio — Whisper (STT) + Kokoro (TTS)       |

---

## Prerequisites

Before getting started, make sure the following are installed on your machine:

- [Python 3.11+](https://python.org)
- [Node.js 18+](https://nodejs.org)
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Ollama](https://ollama.com)

### Setting up Ollama

Install Ollama by following the instructions at [ollama.com](https://ollama.com), or run:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

Then pull a chat model and the required embedding model:

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

> [!IMPORTANT]
> The embedding model `nomic-embed-text` is required for document indexing. You can use any chat model you prefer, but the embedding model must be this one.

You can verify everything is running with:

```bash
ollama list
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/zach0028/HeyRAG.git
cd HeyRAG
```

### 2. Start PostgreSQL and ChromaDB

Both services run via Docker Compose:

```bash
docker compose up -d
```

This starts PostgreSQL on port `5432` and ChromaDB on port `8001`.

### 3. Set up the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create your environment file from the template and adjust if needed:

```bash
cp .env.example .env
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. You can verify it is running by visiting `http://localhost:8000/health`.

### 4. Set up the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!TIP]
> Make sure Ollama is running before starting the backend. The application will not be able to list models or generate responses without it.

---

## Voice Support

Voice features use MLX Audio for speech-to-text (Whisper) and text-to-speech (Kokoro). These libraries rely on the MLX framework, which only runs on Apple Silicon (M1/M2/M3/M4).

> [!NOTE]
> Voice is entirely optional. On machines without Apple Silicon, the application starts normally with all other features available. The `/health` endpoint indicates whether voice is enabled.

<details>
<summary>Setup instructions for Apple Silicon</summary>

### Install ffmpeg

ffmpeg is required for audio format conversion:

```bash
brew install ffmpeg
```

### Install Python dependencies

With the backend virtual environment activated:

```bash
pip install torch mlx-audio wsproto
```

### Start the backend with WebSocket support

Voice communication uses WebSockets, which require the `wsproto` backend:

```bash
uvicorn app.main:app --reload --ws wsproto
```

Models for speech-to-text and text-to-speech are downloaded automatically the first time you use the microphone. This may take a few minutes depending on your connection.

</details>

---

## Configuration

All backend settings can be configured through environment variables. Copy `backend/.env.example` to `backend/.env` and adjust as needed:

| Variable             | Default                                                    | Description                        |
|----------------------|------------------------------------------------------------|------------------------------------|
| `OLLAMA_BASE_URL`    | `http://localhost:11434`                                   | Ollama API endpoint                |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text`                                         | Embedding model for document indexing |
| `DATABASE_URL`       | `postgresql+asyncpg://heyrag:heyrag@localhost:5432/heyrag` | PostgreSQL connection string       |
| `CHROMA_HOST`        | `localhost`                                                | ChromaDB host                      |
| `CHROMA_PORT`        | `8001`                                                     | ChromaDB port                      |
| `WHISPER_MODEL`      | `mlx-community/whisper-large-v3-turbo`                     | Whisper model for speech-to-text   |
| `KOKORO_MODEL`       | `prince-canuma/Kokoro-82M`                                 | Kokoro model for text-to-speech    |
| `KOKORO_VOICE`       | `ff_siwis`                                                 | Voice preset for TTS (French)      |
| `TTS_SPEED`          | `1.0`                                                      | Text-to-speech speed               |

The frontend connects to `http://localhost:8000` by default. This can be changed by setting the `NEXT_PUBLIC_API_URL` environment variable before starting the frontend.

---

## License

This project is licensed under the [MIT License](LICENSE).
