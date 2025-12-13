# MCQ Vision Splitter

**An AI-powered document digitization platform that transforms physical question papers into interactive digital exams using Google Gemini 3 Pro.**

![Status](https://img.shields.io/badge/Status-Prototype-blue) ![Tech](https://img.shields.io/badge/Tech-React%20%7C%20Gemini%20API%20%7C%20Tailwind-indigo)

## 📋 Overview

MCQ Vision Splitter is a web application designed to automate the laborious process of digitizing physical Multiple Choice Question (MCQ) exam papers. Instead of manually typing out questions or cropping images one by one, this tool uses a **Vision-Language Model (VLM)** pipeline to:

1.  **Analyze** a full-page scan of a question paper.
2.  **Segment** individual questions based on visual layout (columns, whitespace, numbering).
3.  **Extract** text and metadata (Subject, Answer Key).
4.  **Crop** the exact region of the image for perfect visual fidelity (preserving diagrams/math formulas).
5.  **Serve** these questions in a student-facing exam interface.

---

## ✨ Key Features

### 🧠 for Admins (Teachers)
*   **One-Click Digitization**: Upload a photo of a generic exam paper. The AI handles layout analysis, identifying columns and question boundaries automatically.
*   **Intelligent Segmentation**: Uses **Gemini 3 Pro** to simulate computer vision blob detection, finding question numbers and splitting the image without relying on error-prone OCR.
*   **Visual Editor**: Interactive canvas to resize bounding boxes, adjust crops, and correct metadata before saving.
*   **Taxonomy Manager**: Organize questions by Subject (e.g., Physics) and Chapter (e.g., Thermodynamics).
*   **Analytics Dashboard**: View exam attempts, average scores, and student performance metrics.

### 🎓 for Students
*   **Interactive Exam Portal**: Take tests based on specific Subjects or Chapters.
*   **Real-time Rendering**: Questions are displayed as high-quality image crops, ensuring complex math equations and diagrams remain perfectly readable.
*   **Instant Grading**: Immediate feedback on answers with a review of the correct options.
*   **Review Mode**: Detailed breakdown of performance after submission.

---

## 🛠️ Architecture & The AI Pipeline

This project employs a unique **"Vision Simulation"** approach. Instead of using traditional OpenCV contours or simple OCR, we prompt the Multimodal LLM (Gemini 3 Pro) to *act* as a computer vision engine.

### The Pipeline Steps:
1.  **Input**: High-resolution Base64 image of the paper.
2.  **Gemini Analysis**:
    *   **Phase 1 (Layout)**: Detects column splits to handle 1, 2, or 3-column layouts.
    *   **Phase 2 (ROI)**: Focuses on the "Question Number Zone" to identify cut points.
    *   **Phase 3 (Inference)**: Reads the text to predict the **Subject** and detects if an answer is already marked (circled/ticked) to auto-populate the **Correct Answer**.
3.  **Client-Side Processing**:
    *   The browser receives normalized coordinates (0-1000 scale).
    *   It uses the HTML5 Canvas API to physically crop the original high-res image into separate `data:image/png` blobs for each question.
4.  **Storage**: Questions are stored in Firebase Firestore, and images are hosted on Firebase Storage.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key with access to `gemini-3-pro-preview`.
*   A Firebase Project with Firestore, Auth (Email/Pass & Anon), and Storage enabled.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/mcq-vision-splitter.git
    cd mcq-vision-splitter
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    # Must use React/Vite prefix depending on your bundler
    REACT_APP_API_KEY=your_google_gemini_api_key
    # OR for Vite
    VITE_API_KEY=your_google_gemini_api_key
    ```

4.  **Run Locally**
    ```bash
    npm start
    ```

---

## 📖 Usage Guide

### 1. Accessing Admin Mode
The app defaults to the Student View. To access the Admin Panel:
1.  Click the small **[π]** symbol in the top right of the header, OR append `#admin` to the URL.
2.  Login with your **Firebase Admin Email & Password**.

### 2. Scanning a Document
1.  Navigate to **Scanner Tool**.
2.  Upload an image (JPG/PNG) of a question paper.
3.  Wait for the 3-phase analysis to complete.
4.  **Review Results**:
    *   **Resize**: Click a question box on the left to adjust its boundaries.
    *   **Edit Metadata**: Update the Subject, Chapter, or Correct Answer on the right.
    *   **Save**: Click "Add to Bank" to save individual questions or "Add All" to batch save.

### 3. Taking an Exam
1.  Go to the **Home** screen (Student Portal).
2.  Select a **Subject** (e.g., Physics).
3.  (Optional) Select a **Chapter**.
4.  Click **Start Exam**.
5.  Answer questions and click **Submit**.

---

## 🗄️ Data Structure

The application uses a specific JSON schema for question segments:

```typescript
interface QuestionSegment {
  id: string;            // Unique UUID
  text: string;          // OCR extracted text (for search)
  cropUrl: string;       // Base64 image of the specific question
  subject: string;       // e.g. "Physics"
  chapter: string;       // e.g. "Kinematics"
  correctAnswer: string; // e.g. "B"
  boundingBox: {         // Normalized 0-1000 coordinates
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
}
```

## 🔒 Security & Privacy

*   **Client-Side Processing**: Image cropping happens entirely in the user's browser using Canvas. The full image is sent to Google's API for analysis.
*   **Firebase Integration**: Data is securely stored in Firestore and files in Firebase Storage with appropriate security rules.

## 📄 License

This project is licensed under the MIT License.