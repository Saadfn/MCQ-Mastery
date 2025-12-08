export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface QuestionSegment {
  id: string | number;
  boundingBox: BoundingBox;
  text: string;
  cropUrl?: string; // Generated client-side
  
  // Metadata fields
  subject?: string;        // Predicted or Selected Subject
  chapter?: string;        // Selected Chapter
  correctAnswer?: string;  // Predicted or Input Answer
}

export interface AnalysisResult {
  questions: QuestionSegment[];
}

export interface Chapter {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

// --- Analytics & Exam Types ---

export interface UserAnswer {
  questionId: string | number;
  selectedOption: string;
  isCorrect: boolean;
  timeSpentMs?: number; // Optional: track time per question
}

export interface StudentMetadata {
  userAgent: string;
  timestamp: number;
  ip?: string; // Note: Reliable IP requires backend
}

export interface ExamSession {
  id: string;
  studentMetadata: StudentMetadata;
  subjectId: string;
  subjectName: string;
  chapterId?: string; // 'all' or specific ID
  chapterName?: string;
  score: number;
  totalQuestions: number;
  answers: UserAnswer[];
}

export enum AppState {
  HOME = 'HOME',                 // Student Landing
  TAKING_EXAM = 'TAKING_EXAM',   // Student Exam Interface
  EXAM_RESULT = 'EXAM_RESULT',   // Student Result
  
  ADMIN_LOGIN = 'ADMIN_LOGIN',   // Admin Gate
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD', // Admin Analytics
  ADMIN_UPLOAD = 'ADMIN_UPLOAD', // The original "Scanner" tool
  ADMIN_SUBJECTS = 'ADMIN_SUBJECTS' // Subject Manager
}