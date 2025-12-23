"""
Gemini AI Service for MCQ extraction and analysis.
Securely handles API key server-side.
"""

import os
import json
import time
from typing import Optional
from google import genai
from google.genai import types

from models.schemas import AnalysisResult, QuestionSegment, BoundingBox


# System prompt for MCQ extraction (same as original)
SYSTEM_PROMPT = """
You are a Computer Vision Simulation Engine for MCQ Extraction.
Your goal is to analyze an image of a question paper and simulate the following segmentation pipeline to identify individual questions.

Additionally, you must analyze the CONTENT of the question to predict its SUBJECT and identify the CORRECT ANSWER if it is marked (e.g., ticked, circled, or bolded).

Core Philosophy:
Do not use OCR (Optical Character Recognition) to find split points, as it is unreliable for mixed languages and mathematical symbols. Instead, use Blob Detection (Contour Analysis) on specific Regions of Interest (ROI) to visually identify "islands of ink" (question numbers) and use those coordinates to slice the document.

Pipeline Logic to Simulate:

Phase 1: Layout Analysis & Column Splitting
Goal: Detect if the page has 1, 2, or 3 columns and split them into separate vertical images.
Strategy A (Line Detection):
- Convert image to binary.
- Apply a Morphological Open operation using a tall, thin kernel.
- Find contours of these lines.
- Split the image at the X-coordinates of these lines.

Phase 2: Content Normalization (Trimming)
Goal: Remove variable whitespace margins.
Logic:
- Convert column to binary.
- Find all non-zero pixels (content).
- Calculate the Bounding Box of the content.

Phase 3: Region of Interest (ROI) Extraction
Goal: Isolate the "Question Number Zone".
Logic:
- Extract the Left 12% of the trimmed column.

Phase 4: Blob Detection & Segmentation (The Core Logic)
Goal: Identify cut points based on the position of question numbers in the ROI strip.
- Use dilation to merge digits (e.g. "1" and "0" -> "10").
- Filter noise.
- Map Y-coordinates back to the full column.
- Sort and deduplicate cut points.

Task:
Return a JSON object containing a list of detected questions.
For each question, provide:
1. The question number/ID.
2. The bounding box (ymin, xmin, ymax, xmax) normalized to a 0-1000 scale.
3. The full text content.
4. The PREDICTED SUBJECT of the question (e.g., Physics, Chemistry, Biology, Math, History, General Knowledge). Infer this from the text context.
5. The CORRECT ANSWER if visible (e.g., "A", "B", "C", "D"). If the user has ticked or circled an option in the image, extract that option. If not marked, return null or empty string.

Do not strictly adhere to pixel-perfect algorithmic kernel sizes as you are a VLM, but adhere to the *intent* of separating questions based on vertical spacing and numbering.
"""


class GeminiService:
    """Service for interacting with Google Gemini API"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")

        # Initialize the client
        self.client = genai.Client(api_key=self.api_key)

        # Model to use (gemini-2.0-flash or gemini-flash-latest)
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    async def analyze_image(self, base64_image: str, mime_type: str = "image/png") -> AnalysisResult:
        """
        Analyze an image using Gemini to extract MCQ questions.

        Args:
            base64_image: Base64-encoded image data (without data URL prefix)
            mime_type: MIME type of the image

        Returns:
            AnalysisResult with extracted questions
        """
        start_time = time.time()

        try:
            # Clean base64 if it has data URL prefix
            if "base64," in base64_image:
                base64_image = base64_image.split("base64,")[1]

            # Create the content with image
            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(
                        data=self._decode_base64(base64_image),
                        mime_type=mime_type
                    ),
                    types.Part.from_text("Perform the MCQ segmentation and content analysis based on the system instructions.")
                ],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema={
                        "type": "object",
                        "properties": {
                            "questions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "string", "description": "The detected question number"},
                                        "text": {"type": "string", "description": "The full text content"},
                                        "subject": {"type": "string", "description": "Inferred subject (Physics, Math, etc.)"},
                                        "correctAnswer": {"type": "string", "description": "The marked correct answer if visible"},
                                        "boundingBox": {
                                            "type": "object",
                                            "properties": {
                                                "ymin": {"type": "number"},
                                                "xmin": {"type": "number"},
                                                "ymax": {"type": "number"},
                                                "xmax": {"type": "number"}
                                            },
                                            "required": ["ymin", "xmin", "ymax", "xmax"]
                                        }
                                    },
                                    "required": ["id", "text", "boundingBox"]
                                }
                            }
                        },
                        "required": ["questions"]
                    }
                )
            )

            # Parse the response
            response_text = response.text
            if not response_text:
                raise ValueError("Empty response from Gemini")

            result_data = json.loads(response_text.strip())

            # Convert to Pydantic models
            questions = []
            for q in result_data.get("questions", []):
                bbox = q.get("boundingBox", {})
                questions.append(QuestionSegment(
                    id=str(q.get("id", "")),
                    text=q.get("text", ""),
                    subject=q.get("subject"),
                    correctAnswer=q.get("correctAnswer"),
                    boundingBox=BoundingBox(
                        ymin=bbox.get("ymin", 0),
                        xmin=bbox.get("xmin", 0),
                        ymax=bbox.get("ymax", 1000),
                        xmax=bbox.get("xmax", 1000)
                    )
                ))

            elapsed_ms = int((time.time() - start_time) * 1000)
            print(f"[Gemini] Analyzed image in {elapsed_ms}ms, found {len(questions)} questions")

            return AnalysisResult(questions=questions)

        except json.JSONDecodeError as e:
            print(f"[Gemini] JSON parse error: {e}")
            raise ValueError(f"Failed to parse Gemini response: {e}")
        except Exception as e:
            print(f"[Gemini] Analysis failed: {e}")
            raise

    def _decode_base64(self, base64_string: str) -> bytes:
        """Decode base64 string to bytes"""
        import base64
        # Add padding if needed
        padding = 4 - len(base64_string) % 4
        if padding != 4:
            base64_string += "=" * padding
        return base64.b64decode(base64_string)

    def is_configured(self) -> bool:
        """Check if the service is properly configured"""
        return bool(self.api_key)


# Singleton instance
_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Get or create the Gemini service singleton"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
