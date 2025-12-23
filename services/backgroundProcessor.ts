/**
 * Background Processor - Uses FastAPI backend for PDF/image processing.
 *
 * The heavy lifting (PDF conversion, Gemini analysis, image cropping) is now
 * done server-side. This processor handles:
 * - File upload to FastAPI
 * - Progress tracking
 * - Saving results to Firebase
 */

import { FirebaseService, auth } from './firebase';
import { API_ENDPOINTS } from './apiConfig';
import { QuestionSegment } from '../types';

export type TaskStatus = 'pending' | 'converting' | 'processing' | 'saving' | 'done' | 'failed';

export interface PipelineTask {
  id: string;
  fileName: string;
  status: TaskStatus;
  progress: string;
  error?: string;
}

type TaskCallback = (tasks: PipelineTask[]) => void;

interface PDFAnalysisResponse {
  success: boolean;
  taskId: string;
  pages: number;
  allQuestions: QuestionSegment[];
  error?: string;
  processingTimeMs?: number;
}

interface AnalyzeResponse {
  success: boolean;
  questions: QuestionSegment[];
  error?: string;
  processingTimeMs?: number;
}

class BackgroundProcessor {
  private queue: { file: File; taskId: string }[] = [];
  private activeTasks: PipelineTask[] = [];
  private isProcessing = false;
  private listeners: TaskCallback[] = [];

  subscribe(callback: TaskCallback) {
    this.listeners.push(callback);
    callback(this.activeTasks);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(l => l([...this.activeTasks]));
  }

  async enqueue(file: File) {
    const taskId = crypto.randomUUID();
    const newTask: PipelineTask = {
      id: taskId,
      fileName: file.name,
      status: 'pending',
      progress: 'Waiting in queue...'
    };

    this.activeTasks = [newTask, ...this.activeTasks];
    this.queue.push({ file, taskId });
    this.notify();

    if (!this.isProcessing) {
      this.processNext();
    }

    return taskId;
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { file, taskId } = this.queue.shift()!;

    const updateTask = (updates: Partial<PipelineTask>) => {
      this.activeTasks = this.activeTasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
      this.notify();
    };

    try {
      const isPdf = file.type === 'application/pdf';

      if (isPdf) {
        // Process PDF via FastAPI
        await this.processPdfViaApi(file, updateTask);
      } else {
        // Process single image via FastAPI
        await this.processImageViaApi(file, updateTask);
      }

      updateTask({ status: 'done', progress: 'Finished! All questions added to database.' });

    } catch (err: any) {
      console.error("Background Processing Failed:", err);
      updateTask({ status: 'failed', progress: 'Error', error: err.message });
    } finally {
      // Delay slightly before next task to keep UI smooth
      setTimeout(() => this.processNext(), 1000);
    }
  }

  private async processPdfViaApi(file: File, updateTask: (updates: Partial<PipelineTask>) => void) {
    updateTask({ status: 'processing', progress: 'Uploading PDF to server...' });

    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', file);

    // Call FastAPI PDF analysis endpoint
    const response = await fetch(API_ENDPOINTS.analyzePdf, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data: PDFAnalysisResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'PDF analysis failed');
    }

    updateTask({
      status: 'saving',
      progress: `Saving ${data.allQuestions.length} questions from ${data.pages} pages...`
    });

    // Save each question to Firebase
    await this.saveQuestionsToFirebase(data.allQuestions, updateTask);
  }

  private async processImageViaApi(file: File, updateTask: (updates: Partial<PipelineTask>) => void) {
    updateTask({ status: 'converting', progress: 'Reading image...' });

    // Convert file to base64
    const base64 = await this.fileToBase64(file);

    updateTask({ status: 'processing', progress: 'Analyzing image with Gemini...' });

    // Upload original image first
    const originalPaperId = crypto.randomUUID();
    const originalPaperUrl = await FirebaseService.uploadOriginalImage(originalPaperId, base64);

    // Call FastAPI analyze-with-crop endpoint
    const response = await fetch(API_ENDPOINTS.analyzeWithCrop, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        mimeType: file.type || 'image/png',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data: AnalyzeResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Image analysis failed');
    }

    // Add source image URL to all questions
    const questionsWithSource = data.questions.map(q => ({
      ...q,
      sourceImageUrl: originalPaperUrl,
    }));

    updateTask({
      status: 'saving',
      progress: `Saving ${questionsWithSource.length} questions...`
    });

    // Save to Firebase
    await this.saveQuestionsToFirebase(questionsWithSource, updateTask);
  }

  private async saveQuestionsToFirebase(
    questions: QuestionSegment[],
    updateTask: (updates: Partial<PipelineTask>) => void
  ) {
    for (let i = 0; i < questions.length; i++) {
      const segment = questions[i];
      const docId = crypto.randomUUID();
      let downloadUrl = "";

      // Upload cropped image if available
      if (segment.cropUrl) {
        downloadUrl = await FirebaseService.uploadQuestionImage(docId, segment.cropUrl);
      }

      const payload = {
        ...segment,
        id: docId,
        imageUrl: downloadUrl,
        cropUrl: downloadUrl,
        createdAt: new Date()
      };

      if (auth.currentUser) {
        await FirebaseService.saveQuestion(payload, auth.currentUser.uid);
      }

      updateTask({
        progress: `Saved ${i + 1}/${questions.length} questions...`
      });
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const backgroundProcessor = new BackgroundProcessor();
