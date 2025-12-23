"""
MCQ-Mastery FastAPI Backend

This backend handles:
- Gemini AI image analysis (secure API key storage)
- PDF to image conversion
- Image cropping for question extraction

Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routers.analyze import router as analyze_router
from models.schemas import HealthResponse


# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("=" * 50)
    print("MCQ-Mastery FastAPI Backend Starting...")
    print("=" * 50)

    # Validate required environment variables
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        print("[WARNING] GEMINI_API_KEY not set! API calls will fail.")
    else:
        print(f"[OK] GEMINI_API_KEY configured (length: {len(gemini_key)})")

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    print(f"[OK] Using Gemini model: {model}")

    print("=" * 50)

    yield

    # Shutdown
    print("MCQ-Mastery Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="MCQ-Mastery API",
    description="Backend API for MCQ extraction and analysis using Google Gemini",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze_router)


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint - returns API health status"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        geminiConfigured=bool(os.getenv("GEMINI_API_KEY"))
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for monitoring"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        geminiConfigured=bool(os.getenv("GEMINI_API_KEY"))
    )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    print(f"Starting server on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
