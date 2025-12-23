"""
API Router for image and PDF analysis endpoints.
"""

import time
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from models.schemas import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    CropImageRequest,
    CropImageResponse,
    PDFAnalysisResponse,
    QuestionSegment
)
from services.gemini import get_gemini_service
from services.pdf import get_pdf_service
from services.image import get_image_service

router = APIRouter(prefix="/api", tags=["Analysis"])


@router.post("/analyze", response_model=AnalyzeImageResponse)
async def analyze_image(request: AnalyzeImageRequest):
    """
    Analyze a single image to extract MCQ questions.

    - **image**: Base64-encoded image (with or without data URL prefix)
    - **mimeType**: MIME type of the image (default: image/png)

    Returns extracted questions with bounding boxes, subjects, and answers.
    """
    start_time = time.time()

    try:
        gemini = get_gemini_service()
        result = await gemini.analyze_image(request.image, request.mimeType)

        elapsed_ms = int((time.time() - start_time) * 1000)

        return AnalyzeImageResponse(
            success=True,
            questions=result.questions,
            processingTimeMs=elapsed_ms
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[API] Analysis failed: {e}")
        return AnalyzeImageResponse(
            success=False,
            questions=[],
            error=str(e)
        )


@router.post("/analyze-pdf", response_model=PDFAnalysisResponse)
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Analyze a PDF file to extract MCQ questions from all pages.

    - **file**: PDF file upload

    Returns extracted questions from all pages with bounding boxes.
    """
    start_time = time.time()

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        # Read PDF bytes
        pdf_bytes = await file.read()

        # Get services
        pdf_service = get_pdf_service()
        gemini = get_gemini_service()
        image_service = get_image_service()

        # Convert PDF to images
        print(f"[API] Converting PDF: {file.filename}")
        page_images = await pdf_service.pdf_to_images(pdf_bytes)
        total_pages = len(page_images)

        # Analyze each page
        all_questions: List[QuestionSegment] = []
        page_results = []

        for i, page_image in enumerate(page_images):
            print(f"[API] Analyzing page {i + 1}/{total_pages}")

            # Analyze the page
            result = await gemini.analyze_image(page_image, "image/png")

            # Crop questions from this page
            if result.questions:
                cropped = await image_service.extract_crops(page_image, result.questions)

                # Update questions with crop URLs
                for j, q in enumerate(result.questions):
                    if j < len(cropped):
                        q.cropUrl = cropped[j].cropUrl
                        # Store which page this came from in the ID
                        q.sourceImageUrl = page_image

            page_results.append(result)
            all_questions.extend(result.questions)

        elapsed_ms = int((time.time() - start_time) * 1000)
        print(f"[API] PDF analysis complete: {len(all_questions)} questions in {elapsed_ms}ms")

        return PDFAnalysisResponse(
            success=True,
            taskId=f"pdf_{int(time.time())}",
            pages=total_pages,
            allQuestions=all_questions,
            pageResults=page_results,
            processingTimeMs=elapsed_ms
        )

    except Exception as e:
        print(f"[API] PDF analysis failed: {e}")
        return PDFAnalysisResponse(
            success=False,
            taskId="",
            pages=0,
            allQuestions=[],
            pageResults=[],
            error=str(e)
        )


@router.post("/crop", response_model=CropImageResponse)
async def crop_image(request: CropImageRequest):
    """
    Crop regions from an image based on bounding boxes.

    - **image**: Base64-encoded source image
    - **segments**: List of segments with bounding boxes to crop

    Returns segments with cropUrl populated.
    """
    try:
        image_service = get_image_service()
        cropped = await image_service.extract_crops(request.image, request.segments)

        return CropImageResponse(
            success=True,
            segments=cropped
        )

    except Exception as e:
        print(f"[API] Crop failed: {e}")
        return CropImageResponse(
            success=False,
            segments=[],
            error=str(e)
        )


@router.post("/analyze-with-crop", response_model=AnalyzeImageResponse)
async def analyze_and_crop(request: AnalyzeImageRequest):
    """
    Analyze an image AND automatically crop the detected questions.

    Combines /analyze and /crop into a single call for convenience.
    """
    start_time = time.time()

    try:
        gemini = get_gemini_service()
        image_service = get_image_service()

        # First, analyze the image
        result = await gemini.analyze_image(request.image, request.mimeType)

        # Then, crop the questions
        if result.questions:
            cropped = await image_service.extract_crops(request.image, result.questions)

            # Update questions with crop URLs
            for i, q in enumerate(result.questions):
                if i < len(cropped):
                    q.cropUrl = cropped[i].cropUrl

        elapsed_ms = int((time.time() - start_time) * 1000)

        return AnalyzeImageResponse(
            success=True,
            questions=result.questions,
            processingTimeMs=elapsed_ms
        )

    except Exception as e:
        print(f"[API] Analyze+crop failed: {e}")
        return AnalyzeImageResponse(
            success=False,
            questions=[],
            error=str(e)
        )
