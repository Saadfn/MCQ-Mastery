# MCQ-Mastery FastAPI Backend

This backend handles secure Gemini API integration, PDF processing, and image cropping for the MCQ-Mastery application.

## Why FastAPI?

- **Security**: API keys are stored server-side, not exposed in browser
- **Performance**: Heavy PDF/image processing offloaded from browser
- **Async**: Native async/await for efficient I/O-bound operations
- **Type Safety**: Pydantic models match TypeScript frontend types
- **Auto-docs**: Built-in OpenAPI documentation at `/docs`

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Run the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or using Python directly
python main.py
```

### 4. Verify Installation

Visit http://localhost:8000/docs to see the API documentation.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | Health check with Gemini status |
| `POST` | `/api/analyze` | Analyze a single image for MCQs |
| `POST` | `/api/analyze-with-crop` | Analyze image + crop questions |
| `POST` | `/api/analyze-pdf` | Analyze PDF (all pages) |
| `POST` | `/api/crop` | Crop regions from an image |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model to use |
| `HOST` | No | `0.0.0.0` | Server host |
| `PORT` | No | `8000` | Server port |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins |

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── models/
│   ├── __init__.py
│   └── schemas.py       # Pydantic models
├── routers/
│   ├── __init__.py
│   └── analyze.py       # API routes
└── services/
    ├── __init__.py
    ├── gemini.py        # Gemini API integration
    ├── pdf.py           # PDF processing
    └── image.py         # Image cropping
```

## Usage Examples

### Analyze Image

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"image": "data:image/png;base64,...", "mimeType": "image/png"}'
```

### Analyze PDF

```bash
curl -X POST http://localhost:8000/api/analyze-pdf \
  -F "file=@/path/to/exam.pdf"
```

## Frontend Integration

The frontend calls this API instead of Gemini directly:

```typescript
// services/apiConfig.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// services/geminiService.ts
const response = await fetch(`${API_BASE_URL}/api/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64Image, mimeType: 'image/png' })
});
```

## Development

### Running with Frontend

1. Start the backend: `cd backend && uvicorn main:app --reload`
2. Start the frontend: `cd .. && npm run dev`
3. Frontend will automatically connect to `http://localhost:8000`

### Testing

```bash
# Health check
curl http://localhost:8000/health

# Response:
# {"status":"healthy","version":"1.0.0","geminiConfigured":true}
```

## Production Deployment

For production, consider:

1. Use a production ASGI server like Gunicorn with Uvicorn workers
2. Set up HTTPS with a reverse proxy (nginx/Caddy)
3. Use environment variables for all secrets
4. Enable rate limiting
5. Set appropriate CORS origins

```bash
# Production example
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```
