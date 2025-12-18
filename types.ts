
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
  cropUrl?: string; // This can be Base64 (local) or HTTP URL (remote)
  imageUrl?: string; // Explicitly for the stored URL in Firestore
  
  // Metadata fields
  subject?: string;        
  chapter?: string;        
  correctAnswer?: string;  
  
  userId?: string; // Owner ID
  createdAt?: any;
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
  timeSpentMs?: number; 
}

export interface StudentMetadata {
  userAgent: string;
  timestamp: number;
  ip?: string; 
}

export interface ExamSession {
  id: string;
  userId?: string; // Required for security rules
  status?: 'IN_PROGRESS' | 'COMPLETED';
  studentMetadata: StudentMetadata;
  subjectId: string;
  subjectName: string;
  chapterId?: string; 
  chapterName?: string;
  score: number;
  totalQuestions: number;
  answers: UserAnswer[];
  createdAt?: any;
  completedAt?: any;
}

export enum AppState {
  HOME = 'HOME',                 
  TAKING_EXAM = 'TAKING_EXAM',   
  EXAM_RESULT = 'EXAM_RESULT',   
  
  ADMIN_LOGIN = 'ADMIN_LOGIN',   
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD', 
  ADMIN_UPLOAD = 'ADMIN_UPLOAD', 
  ADMIN_SUBJECTS = 'ADMIN_SUBJECTS',
  ADMIN_BANK = 'ADMIN_BANK' 
}
