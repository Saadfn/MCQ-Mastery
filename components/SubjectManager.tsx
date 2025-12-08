import React, { useState } from 'react';
import { Subject, Chapter } from '../types';
import { Plus, Trash2, ChevronRight, ChevronDown, BookOpen, Layers } from 'lucide-react';

interface SubjectManagerProps {
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  onBack: () => void;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({ subjects, onUpdateSubjects, onBack }) => {
  const [newSubjectName, setNewSubjectName] = useState("");
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState("");

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const newSubject: Subject = {
      id: newSubjectName.toLowerCase().replace(/\s+/g, '_'),
      name: newSubjectName.trim(),
      chapters: []
    };
    onUpdateSubjects([...subjects, newSubject]);
    setNewSubjectName("");
  };

  const handleDeleteSubject = (id: string) => {
    onUpdateSubjects(subjects.filter(s => s.id !== id));
  };

  const handleAddChapter = (subjectId: string) => {
    if (!newChapterName.trim()) return;
    
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: [
            ...s.chapters, 
            { 
              id: newChapterName.toLowerCase().replace(/\s+/g, '_'), 
              name: newChapterName.trim() 
            }
          ]
        };
      }
      return s;
    });

    onUpdateSubjects(updatedSubjects);
    setNewChapterName("");
  };

  const handleDeleteChapter = (subjectId: string, chapterId: string) => {
    const updatedSubjects = subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: s.chapters.filter(c => c.id !== chapterId)
        };
      }
      return s;
    });
    onUpdateSubjects(updatedSubjects);
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
          <p className="text-slate-500">Add subjects and their corresponding chapters.</p>
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
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
        />
        <button 
          onClick={handleAddSubject}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Add Subject
        </button>
      </div>

      {/* Subjects List */}
      <div className="space-y-4">
        {subjects.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No subjects defined yet.</p>
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
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Chapters Section */}
            {expandedSubjectId === subject.id && (
              <div className="bg-slate-50 border-t border-slate-100 p-4 pl-16">
                 {/* Add Chapter */}
                 <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder={`Add chapter to ${subject.name}...`}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChapter(subject.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAddChapter(subject.id); }}
                    className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-100"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2">
                  {subject.chapters.map(chapter => (
                    <div key={chapter.id} className="flex items-center justify-between group bg-white p-2 rounded border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-slate-400" />
                        <span className="text-sm text-slate-700">{chapter.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteChapter(subject.id, chapter.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
