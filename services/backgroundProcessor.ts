
import { analyzeImage } from './geminiService';
import { extractCrops } from '../utils/imageUtils';
import { FirebaseService, auth } from './firebase';
import { pdfToImages } from './pdfProcessor';

export type TaskStatus = 'pending' | 'converting' | 'processing' | 'saving' | 'done' | 'failed';

export interface PipelineTask {
  id: string;
  fileName: string;
  status: TaskStatus;
  progress: string;
  error?: string;
}

type TaskCallback = (tasks: PipelineTask[]) => void;

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
      // Step 1: Conversion (if PDF)
      let pages: string[] = [];
      if (file.type === 'application/pdf') {
        updateTask({ status: 'converting', progress: 'Converting PDF to images...' });
        pages = await pdfToImages(file, (curr, total) => {
          updateTask({ progress: `Converting page ${curr}/${total}...` });
        });
      } else {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        pages = [base64];
      }

      // Step 2: Loop through pages for AI Analysis
      for (let i = 0; i < pages.length; i++) {
        const pageData = pages[i];
        const pageNum = i + 1;
        updateTask({ 
          status: 'processing', 
          progress: `Analyzing Page ${pageNum}/${pages.length} with Gemini...` 
        });

        const base64Clean = pageData.split(',')[1];
        const analysis = await analyzeImage(base64Clean, 'image/png');
        
        updateTask({ 
          status: 'saving', 
          progress: `Cropping & Saving ${analysis.questions.length} questions from Page ${pageNum}...` 
        });

        // Step 3: Visual Crops & Database Ingestion
        const processedSegments = await extractCrops(pageData, analysis.questions);
        
        for (const segment of processedSegments) {
          const docId = crypto.randomUUID();
          let downloadUrl = "";
          
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
        }
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
}

export const backgroundProcessor = new BackgroundProcessor();
