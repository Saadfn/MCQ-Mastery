import React, { useState, useEffect } from 'react';
import { Subject, Chapter, QuestionSegment, UserAnswer, ExamSession } from '../types';
import { MockDb } from '../services/mockDb';
import { ChevronRight, BrainCircuit, CheckCircle, XCircle, Trophy, LayoutList, MonitorPlay } from 'lucide-react';

interface StudentExamProps {
  subjects: Subject[];
  onFinish: () => void;
}

export const StudentExam: React.FC<StudentExamProps> = ({ subjects, onFinish }) => {
  const [step, setStep] = useState<'SELECT' | 'EXAM' | 'RESULT'>('SELECT');
  
  // Selection State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  
  // Exam State
  const [questions, setQuestions] = useState<QuestionSegment[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // qId -> option
  const [session, setSession] = useState<ExamSession | null>(null);
  
  // View Toggle State
  const [viewMode, setViewMode] = useState<'PAGINATED' | 'SCROLLING'>('PAGINATED');

  const startExam = () => {
    if (!selectedSubjectId) return;
    const qs = MockDb.getQuestionsForExam(selectedSubjectId, selectedChapterId || 'all');
    if (qs.length === 0) {
      alert("No questions found for this selection. Please try another subject.");
      return;
    }
    setQuestions(qs.slice(0, 20)); // Limit to 20 for a session
    setStep('EXAM');
    setCurrentQIndex(0);
  };

  const submitExam = () => {
    // Calculate Score
    let score = 0;
    const detailedAnswers: UserAnswer[] = [];

    questions.forEach(q => {
      const selected = answers[q.id];
      // Simple exact match logic. Case insensitive cleanup might be needed in real app.
      const isCorrect = selected?.toLowerCase() === q.correctAnswer?.toLowerCase();
      if (isCorrect) score++;
      
      detailedAnswers.push({
        questionId: q.id,
        selectedOption: selected || "SKIPPED",
        isCorrect: isCorrect
      });
    });

    const selectedSub = subjects.find(s => s.id === selectedSubjectId || s.name.toLowerCase() === selectedSubjectId.toLowerCase());
    const selectedChap = selectedSub?.chapters.find(c => c.id === selectedChapterId);

    const newSession: ExamSession = {
      id: crypto.randomUUID(),
      studentMetadata: {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      subjectId: selectedSubjectId,
      subjectName: selectedSub?.name || selectedSubjectId,
      chapterId: selectedChapterId,
      chapterName: selectedChap?.name,
      score: score,
      totalQuestions: questions.length,
      answers: detailedAnswers
    };

    MockDb.saveExamSession(newSession);
    setSession(newSession);
    setStep('RESULT');
  };

  const scrollToQuestion = (index: number) => {
    const element = document.getElementById(`question-${index}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (step === 'SELECT') {
    const activeSubject = subjects.find(s => s.id === selectedSubjectId || s.name.toLowerCase() === selectedSubjectId.toLowerCase());

    return (
      <div className="max-w-xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900">Student Portal</h2>
          <p className="text-slate-500 mt-2">Select your topic to begin the assessment.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
          {/* Subject Select */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <select 
              value={selectedSubjectId}
              onChange={(e) => { setSelectedSubjectId(e.target.value); setSelectedChapterId(""); }}
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            >
              <option value="">Choose a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter Select */}
          <div className={`transition-opacity duration-300 ${!selectedSubjectId ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <label className="block text-sm font-medium text-slate-700 mb-2">Chapter (Optional)</label>
            <select 
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            >
              <option value="">All Chapters (Shuffle)</option>
              {activeSubject?.chapters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={startExam}
            disabled={!selectedSubjectId}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200 mt-4 flex items-center justify-center gap-2"
          >
            Start Exam <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'EXAM') {
    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / questions.length) * 100);

    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        {/* Header: Progress & Toggle */}
        <div className="mb-6 space-y-4 sticky top-16 z-40 bg-slate-50/95 backdrop-blur py-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700">Exam in Progress</span>
              <span className="text-xs text-slate-500">{answeredCount} of {questions.length} Answered</span>
            </div>
            
            <div className="flex bg-slate-200 p-1 rounded-lg border border-slate-300">
              <button
                onClick={() => setViewMode('PAGINATED')}
                className={`p-2 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${
                  viewMode === 'PAGINATED' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Single Question View"
              >
                <MonitorPlay size={16} />
                <span className="hidden sm:inline">Single</span>
              </button>
              <button
                onClick={() => setViewMode('SCROLLING')}
                className={`p-2 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${
                  viewMode === 'SCROLLING' 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Scrolling List View"
              >
                <LayoutList size={16} />
                <span className="hidden sm:inline">Scroll</span>
              </button>
            </div>
          </div>
          
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
             <div 
               className="h-full bg-indigo-600 rounded-full transition-all duration-300" 
               style={{ width: `${progress}%`}}
             />
          </div>
        </div>

        {/* --- VIEW MODE: PAGINATED --- */}
        {viewMode === 'PAGINATED' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
              {/* Question Image */}
              <div className="bg-slate-50 border-b border-slate-100 p-8 flex justify-center flex-1 items-center">
                 {questions[currentQIndex].cropUrl ? (
                   <img src={questions[currentQIndex].cropUrl} alt="Question" className="max-w-full max-h-[400px] object-contain" />
                 ) : (
                   <div className="text-slate-400 italic">No image available</div>
                 )}
              </div>
              
              {/* Options */}
              <div className="p-8 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Select Answer</p>
                  <span className="text-xs font-bold text-slate-300">Q{currentQIndex + 1}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswers(prev => ({ ...prev, [questions[currentQIndex].id]: opt }))}
                      className={`py-4 rounded-xl font-bold text-lg border-2 transition-all ${
                        answers[questions[currentQIndex].id] === opt 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md' 
                          : 'border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
               <button
                 onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                 disabled={currentQIndex === 0}
                 className="px-6 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg disabled:opacity-50 transition-colors"
               >
                 Previous
               </button>

               {currentQIndex === questions.length - 1 ? (
                 <button
                  onClick={submitExam}
                  className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200 transition-transform hover:scale-105"
                 >
                   Submit Exam
                 </button>
               ) : (
                 <button
                  onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="px-8 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
                 >
                   Next Question
                 </button>
               )}
            </div>
          </div>
        )}

        {/* --- VIEW MODE: SCROLLING --- */}
        {viewMode === 'SCROLLING' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-300">
             {questions.map((q, idx) => (
               <div key={q.id} id={`question-${idx}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden scroll-mt-32">
                 <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Question {idx + 1}</span>
                    {answers[q.id] && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Answered</span>}
                 </div>
                 
                 <div className="p-6 flex flex-col items-center border-b border-slate-50">
                    {q.cropUrl ? (
                      <img src={q.cropUrl} alt={`Q${idx+1}`} className="max-w-full max-h-[300px] object-contain" />
                    ) : (
                      <div className="text-slate-300 text-sm">Image not available</div>
                    )}
                 </div>

                 <div className="p-6 bg-white">
                    <div className="grid grid-cols-4 gap-4">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`py-2 rounded-lg font-bold text-sm border-2 transition-all ${
                            answers[q.id] === opt 
                              ? 'border-indigo-600 bg-indigo-600 text-white' 
                              : 'border-slate-200 hover:border-indigo-300 text-slate-600'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                 </div>
               </div>
             ))}

             <div className="pt-8 pb-12 flex justify-center">
               <button
                  onClick={submitExam}
                  className="w-full max-w-md px-8 py-4 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 shadow-xl shadow-green-200 transition-transform hover:scale-105 flex items-center justify-center gap-2"
                 >
                   <CheckCircle size={24} /> Submit All Answers
                 </button>
             </div>
          </div>
        )}

      </div>
    );
  }

  // Result View
  if (step === 'RESULT' && session) {
    const percentage = Math.round((session.score / session.totalQuestions) * 100);
    
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-in zoom-in-95">
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Exam Completed!</h2>
        <p className="text-slate-500 mb-8">You have successfully submitted your answers.</p>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
          <div className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-2">Your Score</div>
          <div className="text-5xl font-extrabold text-indigo-600 mb-2">{percentage}%</div>
          <p className="text-slate-400">{session.score} out of {session.totalQuestions} Correct</p>
        </div>

        <div className="text-left space-y-4">
          <h3 className="font-bold text-slate-800 ml-1">Answer Key Review</h3>
          {session.answers.map((ans, idx) => {
            const q = questions.find(qu => qu.id === ans.questionId);
            return (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-slate-700">Question {idx + 1}</span>
                    {ans.isCorrect ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10} /> Correct</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1"><XCircle size={10} /> Incorrect</span>
                    )}
                  </div>
                  {q?.cropUrl && <img src={q.cropUrl} className="h-20 object-contain mb-2 border rounded" />}
                  <div className="text-xs text-slate-500">
                    You chose: <span className="font-bold">{ans.selectedOption}</span> 
                    {!ans.isCorrect && q?.correctAnswer && <span> | Correct: <span className="font-bold text-green-600">{q.correctAnswer}</span></span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <button
          onClick={onFinish}
          className="mt-8 px-8 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 w-full"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return null;
};