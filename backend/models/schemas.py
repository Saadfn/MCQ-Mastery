"""
Pydantic models for API request/response validation.
These mirror the TypeScript types from the frontend.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class BoundingBox(BaseModel):
    """Normalized bounding box coordinates (0-1000 scale)"""
    ymin: float
    xmin: float
    ymax: float
    xmax: float


class QuestionSegment(BaseModel):
    """A single extracted question segment"""
    id: str
    boundingBox: BoundingBox
    text: str
    cropUrl: Optional[str] = None
    imageUrl: Optional[str] = None
    sourceImageUrl: Optional[str] = None
    subject: Optional[str] = None
    chapter: Optional[str] = None
    correctAnswer: Optional[str] = None


class AnalysisResult(BaseModel):
    """Result from Gemini analysis"""
    questions: List[QuestionSegment]


# --- API Request/Response Models ---

class AnalyzeImageRequest(BaseModel):
    """Request body for image analysis"""
    image: str = Field(..., description="Base64-encoded image (with or without data URL prefix)")
    mimeType: Optional[str] = Field("image/png", description="MIME type of the image")


class AnalyzeImageResponse(BaseModel):
    """Response from image analysis"""
    success: bool
    questions: List[QuestionSegment]
    error: Optional[str] = None
    processingTimeMs: Optional[int] = None


class CropImageRequest(BaseModel):
    """Request body for image cropping"""
    image: str = Field(..., description="Base64-encoded source image")
    segments: List[QuestionSegment] = Field(..., description="Segments with bounding boxes to crop")


class CroppedSegment(BaseModel):
    """A segment with its cropped image"""
    id: str
    boundingBox: BoundingBox
    text: str
    cropUrl: str  # Base64 cropped image
    subject: Optional[str] = None
    chapter: Optional[str] = None
    correctAnswer: Optional[str] = None


class CropImageResponse(BaseModel):
    """Response from image cropping"""
    success: bool
    segments: List[CroppedSegment]
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    geminiConfigured: bool


# --- Background Task Models ---

class TaskStatus(str, Enum):
    PENDING = "pending"
    CONVERTING = "converting"
    PROCESSING = "processing"
    SAVING = "saving"
    DONE = "done"
    FAILED = "failed"


class ProcessingTask(BaseModel):
    """Background processing task status"""
    id: str
    fileName: str
    status: TaskStatus
    progress: str
    currentPage: Optional[int] = None
    totalPages: Optional[int] = None
    questionsFound: Optional[int] = None
    error: Optional[str] = None


class PDFAnalysisResponse(BaseModel):
    """Response from PDF analysis"""
    success: bool
    taskId: str
    pages: int
    allQuestions: List[QuestionSegment]
    pageResults: List[AnalysisResult]
    error: Optional[str] = None
    processingTimeMs: Optional[int] = None
