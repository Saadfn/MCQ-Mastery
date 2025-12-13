import React, { useState } from 'react';
import { Subject } from '../types';
import { Plus, Trash2, ChevronRight, ChevronDown, BookOpen, Layers, Loader2 } from 'lucide-react';
import { FirebaseService } from '../services/firebase';

interface SubjectManagerProps {
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  onBack: () => void;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({ subjects, onUpdateSubjects, onBack }) => {
  const [newSubjectName, setNewSubjectName] = useState("");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Subject Handlers ---

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    setIsProcessing(true);
    try {
      const newSubject = await FirebaseService.createSubject(newSubjectName.trim());
      onUpdateSubjects([...subjects, newSubject]);
      setNewSubjectName("");
    } catch (err) {
      console.error("Failed to create subject", err);
      alert("Error saving subject. Check console for details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm("Are you sure? This will hide the subject from the menu.")) return;
    setIsProcessing(true);
    try {
      await FirebaseService.deleteSubject(id);
      onUpdateSubjects(subjects.filter(s => s.id !== id));
    } catch (err) {
      console.error("Failed to delete subject", err);
      alert("Error deleting subject.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Chapter Handlers ---

  const handleAddChapter = async (subjectId: string) => {
    if (!newChapterName.trim()) return;
    setIsProcessing(true);
    try {
      const newChapter = await FirebaseService.createChapter(subjectId, newChapterName.trim());
      
      // Update local state by finding the subject and appending the chapter
      const updatedSubjects = subjects.map(s => {
        if (s.id === subjectId) {
          return { ...s, chapters: [...s.chapters, newChapter] };
        }
        return s;
      });
      
      onUpdateSubjects(updatedSubjects);
      setNewChapterName("");
    } catch (err) {
      console.error("Failed to create chapter", err);
      alert("Error saving chapter.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteChapter = async (subjectId: string, chapterId: string) => {
    if (!window.confirm("Remove this chapter?")) return;
    setIsProcessing(true);
    try {
      await FirebaseService.deleteChapter(subjectId, chapterId);
      
      const updatedSubjects = subjects.map(s => {
        if (s.id === subjectId) {
          return { ...s, chapters: s.chapters.filter(c => c.id !== chapterId) };
        }
        return s;
      });
      
      onUpdateSubjects(updatedSubjects);
    } catch (err) {
      console.error("Failed to delete chapter", err);
      alert("Error deleting chapter.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSubjectId(expandedSubjectId === id ? null : id);
    setNewChapterName(""); // Reset chapter input when switching
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Taxonomy</h2>
          <p className="text-slate-500">Define subjects and chapters for your Question Bank.</p>
        </div>
        <button 
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Back to Scanner
        </button>
      </div>

      {/* Add Subject Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-3">
        <input
          type="text"
          value={newSubjectName}
          onChange={(e) => setNewSubjectName(e.target.value)}
          placeholder="New Subject Name (e.g. Thermodynamics)"
          disabled={isProcessing}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-slate-100"
          onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
        />
        <button 
          onClick={handleAddSubject}
          disabled={isProcessing}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          Add Subject
        </button>
      </div>

      {/* Subjects List */}
      <div className="space-y-4">
        {subjects.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No subjects defined yet. Add one above.</p>
          </div>
        )}

        {subjects.map(subject => (
          <div key={subject.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              onClick={() => toggleExpand(subject.id)}
            >
              <div className="flex items-center gap-3">
                {expandedSubjectId === subject.id ? <ChevronDown size={20} className="text-slate-400"/> : <ChevronRight size={20} className="text-slate-400"/>}
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{subject.name}</h3>
                  <p className="text-xs text-slate-500">{subject.chapters.length} chapters</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded transition-colors"
                title="Delete Subject"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Chapters Section */}
            {expandedSubjectId === subject.id && (
              <div className="bg-slate-50 border-t border-slate-100 p-4 pl-16 animate-in slide-in-from-top-2">
                 {/* Add Chapter */}
                 <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder={`Add chapter to ${subject.name}...`}
                    disabled={isProcessing}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChapter(subject.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAddChapter(subject.id); }}
                    disabled={isProcessing}
                    className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {subject.chapters.map(chapter => (
                    <div key={chapter.id} className="flex items-center justify-between group bg-white p-2 rounded border border-slate-200 hover:border-indigo-200">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-slate-400 group-hover:text-indigo-400" />
                        <span className="text-sm text-slate-700">{chapter.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteChapter(subject.id, chapter.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Chapter"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {subject.chapters.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No chapters added yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};