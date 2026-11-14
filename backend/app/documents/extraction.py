"""Read the text of a PDF, page by page, with PyMuPDF."""

from dataclasses import dataclass

import pymupdf


class ExtractionError(Exception):
    """A problem with one document. The code is safe to store: it never contains document content."""

    def __init__(self, code: str, retryable: bool = False) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int  # 1-based
    text: str
    has_text: bool
    image_count: int


def extract_pages(data: bytes, max_pages: int) -> list[ExtractedPage]:
    """Return the text of every page. Raises ExtractionError for files we cannot or will not read."""
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as error:
        raise ExtractionError("PDF_UNREADABLE") from error

    with document:
        if document.needs_pass:
            raise ExtractionError("PDF_ENCRYPTED")
        if document.page_count < 1:
            raise ExtractionError("PDF_UNREADABLE")
        if document.page_count > max_pages:
            raise ExtractionError("TOO_MANY_PAGES")

        pages: list[ExtractedPage] = []
        try:
            for number, page in enumerate(document, start=1):
                # PostgreSQL text cannot contain NUL characters, and some PDFs produce them.
                text = page.get_text("text").replace("\x00", "")
                pages.append(
                    ExtractedPage(
                        page_number=number,
                        text=text,
                        has_text=bool(text.strip()),
                        image_count=len(page.get_images()),
                    )
                )
        except Exception as error:
            raise ExtractionError("PDF_UNREADABLE") from error
    return pages