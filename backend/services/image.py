"""
Image Processing Service.
Handles image cropping based on bounding boxes.
"""

import io
import base64
from typing import List, Optional
from PIL import Image

from models.schemas import QuestionSegment, BoundingBox, CroppedSegment


class ImageService:
    """Service for image processing operations"""

    def __init__(self, padding: int = 10):
        """
        Initialize image service.

        Args:
            padding: Padding to add around cropped regions (in pixels)
        """
        self.padding = padding

    async def extract_crops(
        self,
        base64_image: str,
        segments: List[QuestionSegment]
    ) -> List[CroppedSegment]:
        """
        Crop regions from an image based on bounding boxes.

        Args:
            base64_image: Base64-encoded source image (with or without data URL prefix)
            segments: List of segments with bounding boxes to crop

        Returns:
            List of segments with cropUrl populated
        """
        # Decode the source image
        img = self._decode_image(base64_image)
        width, height = img.size

        cropped_segments = []

        for segment in segments:
            try:
                crop_url = self._crop_segment(img, segment.boundingBox, width, height)

                cropped_segments.append(CroppedSegment(
                    id=segment.id,
                    boundingBox=segment.boundingBox,
                    text=segment.text,
                    cropUrl=crop_url,
                    subject=segment.subject,
                    chapter=segment.chapter,
                    correctAnswer=segment.correctAnswer
                ))

            except Exception as e:
                print(f"[Image] Failed to crop segment {segment.id}: {e}")
                # Still include the segment but with empty cropUrl
                cropped_segments.append(CroppedSegment(
                    id=segment.id,
                    boundingBox=segment.boundingBox,
                    text=segment.text,
                    cropUrl="",
                    subject=segment.subject,
                    chapter=segment.chapter,
                    correctAnswer=segment.correctAnswer
                ))

        return cropped_segments

    async def extract_single_crop(
        self,
        base64_image: str,
        bounding_box: BoundingBox
    ) -> str:
        """
        Crop a single region from an image.

        Args:
            base64_image: Base64-encoded source image
            bounding_box: Bounding box defining the crop region

        Returns:
            Base64-encoded cropped image with data URL prefix
        """
        img = self._decode_image(base64_image)
        width, height = img.size
        return self._crop_segment(img, bounding_box, width, height)

    def _crop_segment(
        self,
        img: Image.Image,
        bbox: BoundingBox,
        width: int,
        height: int
    ) -> str:
        """
        Crop a single segment from the image.

        Args:
            img: PIL Image object
            bbox: Normalized bounding box (0-1000 scale)
            width: Image width in pixels
            height: Image height in pixels

        Returns:
            Base64-encoded cropped image with data URL prefix
        """
        # Convert normalized coords (0-1000) to pixel coords
        x1 = int((bbox.xmin / 1000) * width)
        y1 = int((bbox.ymin / 1000) * height)
        x2 = int((bbox.xmax / 1000) * width)
        y2 = int((bbox.ymax / 1000) * height)

        # Add padding (clamped to image bounds)
        x1 = max(0, x1 - self.padding)
        y1 = max(0, y1 - self.padding)
        x2 = min(width, x2 + self.padding)
        y2 = min(height, y2 + self.padding)

        # Crop the region
        cropped = img.crop((x1, y1, x2, y2))

        # Create a white background canvas (for cleaner look)
        canvas_width = x2 - x1
        canvas_height = y2 - y1
        canvas = Image.new("RGB", (canvas_width, canvas_height), "white")
        canvas.paste(cropped, (0, 0))

        # Convert to base64 PNG
        buffer = io.BytesIO()
        canvas.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)

        base64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{base64_str}"

    def _decode_image(self, base64_image: str) -> Image.Image:
        """
        Decode a base64 image string to a PIL Image.

        Args:
            base64_image: Base64-encoded image (with or without data URL prefix)

        Returns:
            PIL Image object
        """
        # Remove data URL prefix if present
        if "base64," in base64_image:
            base64_image = base64_image.split("base64,")[1]

        # Decode and open as PIL Image
        image_bytes = base64.b64decode(base64_image)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")


# Singleton instance
_image_service: Optional[ImageService] = None


def get_image_service() -> ImageService:
    """Get or create the image service singleton"""
    global _image_service
    if _image_service is None:
        _image_service = ImageService()
    return _image_service
