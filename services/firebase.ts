import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  User, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";
import { ExamSession, QuestionSegment, Subject, Chapter } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDVDquuKPtgK3k4MspyfPZ7cAc3GhN_aFk",
  authDomain: "mcqfirebasedatabase.firebaseapp.com",
  projectId: "mcqfirebasedatabase",
  storageBucket: "mcqfirebasedatabase.firebasestorage.app",
  messagingSenderId: "402970618536",
  appId: "1:402970618536:web:2baa2df9244d305bb1f09d",
  measurementId: "G-DXL2BKHM25"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- Auth Helper ---
export const ensureAuth = (): Promise<User> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => {
            unsubscribe();
            resolve(cred.user);
          })
          .catch(reject);
      }
    });
  });
};

// --- Storage Helper ---
const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,');
  const mime = parts[0].split(':')[1];
  const binary = atob(parts[1]);
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], { type: mime });
};

export const FirebaseService = {
  // --- Subjects & Chapters (Nested Collection Structure) ---
  
  getSubjects: async (): Promise<Subject[]> => {
    // 1. Fetch all subjects
    const subjectsRef = collection(db, "subjects");
    const snapshot = await getDocs(subjectsRef);
    
    // 2. Fetch chapters for each subject in parallel
    const subjects = await Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const chaptersRef = collection(db, "subjects", docSnap.id, "chapters");
      const chapSnap = await getDocs(chaptersRef);
      const chapters = chapSnap.docs.map(c => ({ id: c.id, name: c.data().name } as Chapter));
      
      return {
        id: docSnap.id,
        name: data.name,
        chapters: chapters
      };
    }));
    
    return subjects;
  },

  createSubject: async (name: string): Promise<Subject> => {
    const id = name.toLowerCase().replace(/\s+/g, '_');
    const newSubject: Subject = { id, name, chapters: [] };
    // Only save the name to the parent doc, chapters are a subcollection
    await setDoc(doc(db, "subjects", id), { name });
    return newSubject;
  },
  
  deleteSubject: async (id: string) => {
    await deleteDoc(doc(db, "subjects", id));
    // Note: This leaves orphaned subcollections in Firestore (client SDK cannot delete collections).
    // In a production app, use Cloud Functions to recursive delete.
  },

  createChapter: async (subjectId: string, chapterName: string): Promise<Chapter> => {
    const chapterId = chapterName.toLowerCase().replace(/\s+/g, '_');
    const chapterData = { name: chapterName };
    await setDoc(doc(db, "subjects", subjectId, "chapters", chapterId), chapterData);
    return { id: chapterId, name: chapterName };
  },

  deleteChapter: async (subjectId: string, chapterId: string) => {
    await deleteDoc(doc(db, "subjects", subjectId, "chapters", chapterId));
  },

  // --- Questions ---
  uploadQuestionImage: async (id: string, base64Image: string): Promise<string> => {
    const blob = base64ToBlob(base64Image);
    const storageRef = ref(storage, `question_images/${id}.png`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  },

  saveQuestion: async (question: QuestionSegment, userId: string) => {
    await setDoc(doc(db, "questions", String(question.id)), {
      ...question,
      userId,
      createdAt: serverTimestamp()
    });
  },

  getQuestions: async (): Promise<QuestionSegment[]> => {
    const q = query(collection(db, "questions"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestionSegment));
  },

  // --- Exam Sessions ---
  startExamSession: async (session: Partial<ExamSession>, userId: string): Promise<string> => {
    const newSessionRef = doc(collection(db, "exam_sessions"));
    const sessionData = {
      ...session,
      id: newSessionRef.id,
      userId,
      status: 'IN_PROGRESS',
      createdAt: serverTimestamp()
    };
    await setDoc(newSessionRef, sessionData);
    return newSessionRef.id;
  },

  completeExamSession: async (sessionId: string, data: Partial<ExamSession>) => {
    const sessionRef = doc(db, "exam_sessions", sessionId);
    await updateDoc(sessionRef, {
      ...data,
      status: 'COMPLETED',
      completedAt: serverTimestamp()
    });
  },

  getExamSessions: async (userId?: string): Promise<ExamSession[]> => {
    let q;
    if (userId) {
      q = query(collection(db, "exam_sessions"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, "exam_sessions"), orderBy("createdAt", "desc"));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ExamSession));
  }
};