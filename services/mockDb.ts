import { ExamSession, QuestionSegment, Subject } from "../types";

// Keys for LocalStorage
const STORAGE_KEYS = {
  SUBJECTS: 'mcq_subjects',
  QUESTIONS: 'mcq_questions',
  SESSIONS: 'mcq_exam_sessions'
};

const DEFAULT_SUBJECTS: Subject[] = [
  { 
    id: 'physics', 
    name: 'Physics', 
    chapters: [
      { id: 'kinematics', name: 'Kinematics' }, 
      { id: 'thermodynamics', name: 'Thermodynamics' }
    ] 
  },
  { 
    id: 'chemistry', 
    name: 'Chemistry', 
    chapters: [
      { id: 'organic', name: 'Organic Chemistry' }, 
      { id: 'inorganic', name: 'Inorganic Chemistry' }
    ] 
  },
  { id: 'math', name: 'Math', chapters: [] },
  { id: 'biology', name: 'Biology', chapters: [] }
];

export const MockDb = {
  // --- Subjects ---
  getSubjects: (): Subject[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return saved ? JSON.parse(saved) : DEFAULT_SUBJECTS;
  },

  saveSubjects: (subjects: Subject[]) => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },

  // --- Questions ---
  saveQuestions: (questions: QuestionSegment[]) => {
    const existing = MockDb.getQuestions();
    const updated = [...existing, ...questions];
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(updated));
  },

  getQuestions: (): QuestionSegment[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    return saved ? JSON.parse(saved) : [];
  },

  getQuestionsForExam: (subjectId: string, chapterId?: string): QuestionSegment[] => {
    const all = MockDb.getQuestions();
    let filtered = all.filter(q => {
        // Match subject (case insensitive)
        const subMatch = q.subject?.toLowerCase() === subjectId.toLowerCase() || 
                         q.subject?.toLowerCase() === MockDb.getSubjectName(subjectId).toLowerCase();
        return subMatch;
    });

    if (chapterId && chapterId !== 'all') {
      filtered = filtered.filter(q => q.chapter === chapterId);
    }
    
    // Shuffle
    return filtered.sort(() => Math.random() - 0.5);
  },

  getSubjectName: (id: string): string => {
    const subs = MockDb.getSubjects();
    return subs.find(s => s.id === id || s.name.toLowerCase() === id.toLowerCase())?.name || id;
  },

  // --- Exam Sessions (Analytics) ---
  saveExamSession: (session: ExamSession) => {
    const existing = MockDb.getExamSessions();
    const updated = [session, ...existing]; // Newest first
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
  },

  getExamSessions: (): ExamSession[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : [];
  }
};