from pathlib import Path
import fitz
from docx import Document


class FileParser:

    def parse(self, file_path: str) -> str:
        path = Path(file_path)
        extension = path.suffix.lower()

        parsers = {
            ".pdf": self._parse_pdf,
            ".docx": self._parse_docx,
            ".txt": self._parse_text,
            ".md": self._parse_text,
        }

        parser = parsers.get(extension)
        if parser is None:
            raise ValueError(f"Format non supporte : {extension}")

        return parser(path)

    def _parse_pdf(self, path: Path) -> str:
        doc = fitz.open(str(path))
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text

    def _parse_docx(self, path: Path) -> str:
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)

    def _parse_text(self, path: Path) -> str:
        return path.read_text(encoding="utf-8")
