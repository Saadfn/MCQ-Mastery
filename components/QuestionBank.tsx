
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { QuestionSegment, Subject } from '../types';
import { FirebaseService } from '../services/firebase';
import { 
  Trash2, 
  Search, 
  Filter, 
  Loader2, 
  CheckSquare, 
  Square, 
  AlertCircle,
  Image as ImageIcon,
  RefreshCw,
  XCircle
} from 'lucide-react';

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("[Bank] Loading questions...");
      const data = await FirebaseService.getQuestions();
      setQuestions(data);
      console.log(`[Bank] Loaded ${data.length} questions.`);
    } catch (err: any) {
      console.error("[Bank] Load failed:", err);
      setError("Failed to fetch questions. Check Firestore rules or console.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = (q.text || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = subjectFilter === "all" || q.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [questions, searchQuery, subjectFilter]);

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    questions.forEach(q => { if (q.subject) subjects.add(q.subject); });
    // Fix: Using spread operator for more reliable type inference than Array.from
    return [...subjects];
  }, [questions]);

  const toggleSelect = (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const sid = String(id);
    const next = new Set(selectedIds);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    setSelectedIds(next);
  };

  const toggleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => String(q.id))));
    }
  };

  const handleDelete = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const sid = String(id);
    
    if (!window.confirm("Delete this question forever?")) return;
    
    setDeleting(true);
    console.log(`[Bank] Initiating delete for: ${sid}`);
    
    try {
      await FirebaseService.deleteQuestion(sid);
      
      // Update UI state
      setQuestions(prev => prev.filter(q => String(q.id) !== sid));
      
      // Remove from selection if present
      const nextSelected = new Set(selectedIds);
      nextSelected.delete(sid);
      setSelectedIds(nextSelected);
      
      console.log(`[Bank] UI updated after deletion of: ${sid}`);
    } catch (err: any) {
      console.error("[Bank] Individual delete failed:", err);
      alert(`Delete failed: ${err.message || 'Unknown error'}. Check Firestore rules.`);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const count = selectedIds.size;
    if (count === 0) return;
    
    if (!window.confirm(`Delete ${count} selected questions? This cannot be undone.`)) return;

    setDeleting(true);
    // Fix: Use spread operator to ensure types are correctly inferred from Set<string> to string[]
    const idsToDelete = [...selectedIds];
    console.log(`[Bank] Initiating bulk delete for ${count} items.`);

    try {
      await FirebaseService.deleteQuestionsBatch(idsToDelete);
      
      // Update UI state
      const idStringsToDelete = new Set(idsToDelete);
      setQuestions(prev => prev.filter(q => !idStringsToDelete.has(String(q.id))));
      setSelectedIds(new Set());
      
      console.log("[Bank] UI updated after bulk deletion.");
    } catch (err: any) {
      console.error("[Bank] Bulk delete failed:", err);
      alert(`Bulk delete failed: ${err.message}. Check console.`);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium">Accessing Question Bank...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Question Bank</h2>
          <p className="text-slate-500 text-sm">Review and manage extracted questions across all subjects.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={loadQuestions}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          {selectedIds.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-100 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              Delete {selectedIds.size}
            </button>
          )}

          {selectedIds.size > 0 && (
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="p-2 text-slate-400 hover:text-slate-600"
              title="Clear Selection"
            >
              <XCircle size={20} />
            </button>
          )}
          
          <div className="h-10 w-px bg-slate-200 mx-1 hidden md:block"></div>

          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-lg uppercase tracking-wider">
            Total: {questions.length}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="flex-1 md:w-48 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Subjects</option>
            {uniqueSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-12">
                  <button 
                    onClick={toggleSelectAll} 
                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Preview</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Details</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuestions.map((q) => {
                const sid = String(q.id);
                const isSelected = selectedIds.has(sid);
                return (
                  <tr key={sid} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={(e) => toggleSelect(sid, e)} className="text-slate-400 hover:text-indigo-600">
                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-16 bg-slate-100 rounded border border-slate-200 overflow-hidden flex items-center justify-center group relative">
                        {q.imageUrl || q.cropUrl ? (
                          <img src={q.imageUrl || q.cropUrl} className="max-w-full max-h-full object-contain" alt="" />
                        ) : (
                          <ImageIcon className="text-slate-300" size={20} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                            {q.subject || "Uncategorized"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {sid.slice(-8)}</span>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 italic">
                          {q.text || "No text available."}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => handleDelete(sid, e)}
                        disabled={deleting}
                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg disabled:opacity-30"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="text-slate-400 flex flex-col items-center gap-2">
                      <ImageIcon size={40} className="opacity-20" />
                      <p className="italic">No questions found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          <AlertCircle size={20} />
          <div className="flex-1">
            <p className="font-bold text-sm">Database Error</p>
            <p className="text-xs">{error}</p>
          </div>
          <button onClick={loadQuestions} className="text-xs font-black uppercase underline">Retry</button>
        </div>
      )}
    </div>
  );
};
