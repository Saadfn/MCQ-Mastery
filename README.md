# MCQ Vision Splitter

An intelligent document scanner that uses Google's **Gemini 3 Pro** to analyze, segment, and extract individual Multiple Choice Questions from scanned papers.

## Technology Stack

*   **Frontend Framework**: React 19 (via CDN)
*   **Styling**: Tailwind CSS
*   **AI Model**: Gemini 3 Pro (`gemini-3-pro-preview`) via Google GenAI SDK
*   **Image Processing**: HTML5 Canvas API (Client-side cropping and manipulation)
*   **Icons**: Lucide React

## Architecture

The application follows a **Client-Side Heavy** architecture to ensure privacy and speed, leveraging Gemini as an intelligence API rather than a full backend service.

1.  **Input**: User uploads an image.
2.  **Preprocessing**: Image is converted to Base64 in the browser.
3.  **Intelligence Layer (Gemini)**:
    *   The Base64 image is sent to `gemini-3-pro-preview`.
    *   The model acts as a "Computer Vision Simulation Engine".
    *   It performs layout analysis, column detection, and text extraction.
    *   It predicts the **Subject** and **Correct Answer** (if marked).
    *   It returns a JSON object containing bounding box coordinates (0-1000 scale) for each question.
4.  **Post-Processing**:
    *   The browser receives the coordinates.
    *   `utils/imageUtils.ts` uses HTML Canvas to physically crop the original image based on these coordinates.
    *   Metadata (Subject, Chapter, Answer) is attached to the question object.
5.  **Data Structure**:
    *   Questions are structured as objects with unique IDs, text content, image blobs (Data URLs), and classification metadata.

## Database Recommendation

To store the extracted questions, images, and metadata, **Firebase (Google Cloud)** is the recommended free-tier solution.

### Recommended Schema (NoSQL - Firestore)

**Collection: `questions`**
```json
{
  "id": "uuid_v4",
  "subjectId": "physics_101",
  "chapterId": "thermodynamics",
  "text": "What is the second law of...",
  "correctAnswer": "B",
  "imageUrl": "https://firebasestorage.googleapis.com/.../q_123.png",
  "createdAt": "2024-03-20T10:00:00Z",
  "metadata": {
    "examSource": "Midterm 2024",
    "difficulty": "medium"
  }
}
```

**Collection: `subjects`**
```json
{
  "id": "physics_101",
  "name": "Physics",
  "chapters": [
    { "id": "thermodynamics", "name": "Thermodynamics" },
    { "id": "kinematics", "name": "Kinematics" }
  ]
}
```

### Why Firebase?
1.  **Firebase Storage**: Perfect for storing the cropped question images.
2.  **Firestore**: Flexible NoSQL database for the hierarchical subject/chapter data.
3.  **Free Tier**: Generous limits for a startup/prototype application.
4.  **Integration**: Easy to integrate with the existing React frontend.

**Alternative**: **Supabase** (PostgreSQL) is an excellent open-source alternative if you prefer relational databases (SQL).
