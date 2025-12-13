import React, { useState, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { ResultViewer } from './components/ResultViewer';
import { SubjectManager } from './components/SubjectManager';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentExam } from './components/StudentExam';
import { analyzeImage } from './services/geminiService';
import { extractCrops } from './utils/imageUtils';
import { AppState, QuestionSegment, Subject } from './types';
import { Loader2, AlertCircle, ShieldCheck, LogOut, LayoutDashboard, ScanLine, ArrowLeft } from 'lucide-react';
import { ensureAuth, FirebaseService } from './services/firebase';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [segments, setSegments] = useState<QuestionSegment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Used to force a reset of the student exam component when navigating Home
  const [resetKey, setResetKey] = useState(0); 
  
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // 1. Initialize Auth
  useEffect(() => {
    ensureAuth().then((user) => {
      console.log("Authenticated as:", user.uid);
      setIsAuthReady(true);
      // Load subjects after auth
      loadSubjects();
    }).catch(err => {
      console.error("Auth failed:", err);
      setErrorMsg("Could not connect to database.");
    });
  }, []);

  const loadSubjects = async () => {
    try {
      const subs = await FirebaseService.getSubjects();
      setSubjects(subs);
    } catch (err) {
      console.error("Failed to load subjects", err);
    }
  };

  useEffect(() => {
    // Check URL for admin deep link (simulation)
    if (window.location.hash === '#admin') {
      setState(AppState.ADMIN_LOGIN);
    }
  }, []);

  const handleSubjectsUpdate = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    // Note: Saving happens inside SubjectManager individual calls mostly, 
    // but if we do bulk updates we might need a different approach.
    // For now, SubjectManager will call Firebase directly, we just update local state to reflect it.
  };

  const handleGoHome = () => {
    setState(AppState.HOME);
    setResetKey(prev => prev + 1); 
  };

  const handleAdminLogout = () => {
    handleGoHome();
    window.location.hash = '';
  };

  const handleFileSelect = async (file: File) => {
    setState(AppState.ADMIN_UPLOAD); 
    setErrorMsg("");
    setStatusMessage("Preparing image...");
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      setImageSrc(result);
      
      try {
        const base64Data = result.split(',')[1];
        const mimeType = file.type;

        setStatusMessage("Phase 1: Layout Analysis & Column Splitting...");
        await new Promise(r => setTimeout(r, 600)); 
        
        setStatusMessage("Phase 2: Identifying Questions, Subjects & Answers...");
        const analysis = await analyzeImage(base64Data, mimeType);
        
        setStatusMessage("Phase 3: Generating Visual Crops...");
        const segmentsWithCrops = await extractCrops(result, analysis.questions);
        
        // Standardize subjects
        const standardizedSegments = segmentsWithCrops.map(seg => {
           if (seg.subject) {
             const match = subjects.find(s => s.name.toLowerCase() === seg.subject?.toLowerCase());
             if (match) {
               return { ...seg, subject: match.name };
             }
           }
           return seg;
        });

        setSegments(standardizedSegments);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || "Failed to analyze image. Please try again.");
      } finally {
        setStatusMessage("");
      }
    };
    reader.readAsDataURL(file);
  };

  // --- Render Helpers ---

  const renderAdminHeader = () => (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 text-white">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-indigo-400" />
          <h1 className="font-bold text-xl tracking-tight">Admin<span className="text-indigo-400">Panel</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setState(AppState.ADMIN_DASHBOARD); setSegments([]); setImageSrc(null); }}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${state === AppState.ADMIN_DASHBOARD ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button 
            onClick={() => { setState(AppState.ADMIN_UPLOAD); setSegments([]); setImageSrc(null); }}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${state === AppState.ADMIN_UPLOAD ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
          >
            <ScanLine size={16} /> Scanner Tool
          </button>
          <div className="h-6 w-px bg-slate-700 mx-2"></div>
          <button 
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </header>
  );

  const renderStudentHeader = () => (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleGoHome}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
            Q
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">MCQ <span className="text-indigo-600">Mastery</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Secret Admin Link Area */}
          <button 
            onClick={() => setState(AppState.ADMIN_LOGIN)}
            className="text-xs text-slate-300 hover:text-slate-800 transition-colors font-mono"
            title="Staff Access"
          >
            [π]
          </button>
        </div>
      </div>
    </header>
  );

  // --- Initial Loading ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
           <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
           <p className="text-slate-500 font-medium">Connecting to Secure Database...</p>
        </div>
      </div>
    );
  }

  // --- Main Render Switch ---

  if (state === AppState.ADMIN_LOGIN) {
    return (
      <div className="min-h-screen bg-slate-100">
         <div className="absolute top-4 left-4">
           <button onClick={handleGoHome} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
             <ArrowLeft size={16} /> Back to Home
           </button>
         </div>
         <AdminLogin onSuccess={() => setState(AppState.ADMIN_DASHBOARD)} />
      </div>
    );
  }

  // Student Flow
  if (state === AppState.HOME || state === AppState.TAKING_EXAM || state === AppState.EXAM_RESULT) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        {renderStudentHeader()}
        <main className="max-w-7xl mx-auto px-4">
           <StudentExam 
             key={resetKey} // Force reset on new session
             subjects={subjects} 
             onFinish={handleGoHome}
           />
        </main>
      </div>
    );
  }

  // Admin Flow
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {renderAdminHeader()}
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        {state === AppState.ADMIN_DASHBOARD && (
          <AdminDashboard />
        )}

        {state === AppState.ADMIN_SUBJECTS && (
           <SubjectManager 
             subjects={subjects} 
             onUpdateSubjects={handleSubjectsUpdate} // Callback to update local state after DB change
             onBack={() => setState(AppState.ADMIN_UPLOAD)} 
           />
        )}

        {state === AppState.ADMIN_UPLOAD && (
          <>
            {!imageSrc && !statusMessage && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900">Document Scanner</h2>
                  <button 
                    onClick={() => setState(AppState.ADMIN_SUBJECTS)}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
                  >
                    Manage Database Taxonomy
                  </button>
                </div>
                <UploadZone onFileSelect={handleFileSelect} />
              </div>
            )}

            {statusMessage && (
               <div className="flex flex-col items-center justify-center min-h-[60vh]">
                 <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                 <h3 className="text-xl font-semibold text-slate-800">Processing</h3>
                 <p className="mt-2 text-slate-500 text-sm font-mono bg-white px-4 py-2 rounded-md shadow-sm border border-slate-100 animate-pulse">
                   {statusMessage}
                 </p>
               </div>
            )}

            {errorMsg && (
               <div className="flex flex-col items-center justify-center min-h-[60vh]">
                 <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                   <AlertCircle size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-900">Scanning Failed</h3>
                 <p className="mt-2 text-slate-500">{errorMsg}</p>
                 <button onClick={() => { setErrorMsg(""); setImageSrc(null); }} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg">Retry</button>
               </div>
            )}

            {imageSrc && !statusMessage && !errorMsg && (
              <div className="animate-in fade-in zoom-in-95 duration-500">
                 <div className="mb-6 flex justify-between items-center">
                    <button 
                      onClick={() => { setImageSrc(null); setSegments([]); }}
                      className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
                    >
                      <ArrowLeft size={16} /> Scan New Document
                    </button>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                      Scan Successful
                    </span>
                 </div>
                 <ResultViewer 
                   originalImage={imageSrc} 
                   segments={segments} 
                   subjects={subjects}
                 />
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
};

export default App;
