from langchain_text_splitters import RecursiveCharacterTextSplitter

class Chunker:

    def __init__(self, chunk_size: int = 500, overlap: int = 50):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=overlap,
        )

    def chunk(self, text: str) -> list[str]:
        return self.splitter.split_text(text)
