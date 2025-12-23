"""
PDF Processing Service.
Converts PDF pages to images for Gemini analysis.
"""

import io
import base64
from typing import List, Tuple, Callable, Optional

import fitz  # PyMuPDF


class PDFService:
    """Service for processing PDF files"""

    def __init__(self, dpi: int = 200):
        """
        Initialize PDF service.

        Args:
            dpi: Resolution for rendering PDF pages (higher = better quality but larger)
        """
        self.dpi = dpi
        self.zoom = dpi / 72  # PDF default is 72 DPI

    async def pdf_to_images(
        self,
        pdf_bytes: bytes,
        on_progress: Optional[Callable[[int, int], None]] = None
    ) -> List[str]:
        """
        Convert a PDF to a list of Base64-encoded PNG images.

        Args:
            pdf_bytes: Raw PDF file bytes
            on_progress: Optional callback for progress updates (current_page, total_pages)

        Returns:
            List of Base64-encoded PNG images (with data URL prefix)
        """
        images = []

        # Open PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_pages = len(doc)

        try:
            for page_num in range(total_pages):
                # Get the page
                page = doc[page_num]

                # Create transformation matrix for desired resolution
                mat = fitz.Matrix(self.zoom, self.zoom)

                # Render page to pixmap (image)
                pix = page.get_pixmap(matrix=mat, alpha=False)

                # Convert to PNG bytes
                png_bytes = pix.tobytes("png")

                # Encode to base64 with data URL prefix
                base64_str = base64.b64encode(png_bytes).decode("utf-8")
                data_url = f"data:image/png;base64,{base64_str}"
                images.append(data_url)

                # Report progress
                if on_progress:
                    on_progress(page_num + 1, total_pages)

                print(f"[PDF] Converted page {page_num + 1}/{total_pages}")

        finally:
            doc.close()

        return images

    async def get_page_count(self, pdf_bytes: bytes) -> int:
        """Get the number of pages in a PDF"""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        count = len(doc)
        doc.close()
        return count

    async def pdf_to_single_image(self, pdf_bytes: bytes, page_num: int = 0) -> str:
        """
        Convert a single PDF page to a Base64-encoded PNG image.

        Args:
            pdf_bytes: Raw PDF file bytes
            page_num: Page number to convert (0-indexed)

        Returns:
            Base64-encoded PNG image with data URL prefix
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        try:
            if page_num >= len(doc):
                raise ValueError(f"Page {page_num} does not exist (PDF has {len(doc)} pages)")

            page = doc[page_num]
            mat = fitz.Matrix(self.zoom, self.zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            png_bytes = pix.tobytes("png")

            base64_str = base64.b64encode(png_bytes).decode("utf-8")
            return f"data:image/png;base64,{base64_str}"

        finally:
            doc.close()


# Singleton instance
_pdf_service: Optional[PDFService] = None


def get_pdf_service() -> PDFService:
    """Get or create the PDF service singleton"""
    global _pdf_service
    if _pdf_service is None:
        _pdf_service = PDFService()
    return _pdf_service
