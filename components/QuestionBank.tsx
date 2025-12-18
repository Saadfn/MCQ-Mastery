
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { QuestionSegment } from '../types';
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
  XCircle,
  AlertTriangle,
  X,
  Maximize2
} from 'lucide-react';

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // Custom Modal State for Deletion
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    id?: string;
    count?: number;
  }>({ isOpen: false, type: 'single' });

  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await FirebaseService.getQuestions();
      setQuestions(data);
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
    return [...subjects].sort();
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

  const openDeleteModal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, type: 'single', id });
  };

  const openBulkDeleteModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, type: 'bulk', count: selectedIds.size });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: 'single' });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (confirmModal.type === 'single' && confirmModal.id) {
        await FirebaseService.deleteQuestion(confirmModal.id);
        setQuestions(prev => prev.filter(q => String(q.id) !== confirmModal.id));
        const nextSelected = new Set(selectedIds);
        nextSelected.delete(confirmModal.id);
        setSelectedIds(nextSelected);
      } else if (confirmModal.type === 'bulk') {
        const idsToDelete = [...selectedIds];
        await FirebaseService.deleteQuestionsBatch(idsToDelete);
        const idStringsToDelete = new Set(idsToDelete);
        setQuestions(prev => prev.filter(q => !idStringsToDelete.has(String(q.id))));
        setSelectedIds(new Set());
      }
      closeConfirmModal();
    } catch (err: any) {
      console.error("[Bank] Delete failed:", err);
      alert(`Delete failed: ${err.message || 'Unknown error'}`);
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
    <div className="space-y-6 animate-in fade-in duration-500 relative">
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
              onClick={openBulkDeleteModal}
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
                const imageUrl = q.imageUrl || q.cropUrl;
                return (
                  <tr key={sid} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={(e) => toggleSelect(sid, e)} className="text-slate-400 hover:text-indigo-600">
                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        onClick={() => imageUrl && setPreviewImage(imageUrl)}
                        className={`w-24 h-16 bg-slate-100 rounded border border-slate-200 overflow-hidden flex items-center justify-center group relative cursor-zoom-in transition-all active:scale-95 shadow-sm hover:shadow-md ${!imageUrl ? 'cursor-default' : ''}`}
                      >
                        {imageUrl ? (
                          <>
                            <img src={imageUrl} className="max-w-full max-h-full object-contain" alt="" />
                            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center">
                              <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={16} />
                            </div>
                          </>
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
                        <p className="text-sm text-slate-600 line-clamp-2 italic leading-relaxed">
                          {q.text || "No text available."}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => openDeleteModal(sid, e)}
                        disabled={deleting}
                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-all"
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center animate-in zoom-in-95 duration-300">
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }}
              className="absolute -top-12 right-0 md:-right-12 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all group active:scale-90"
              title="Close Preview"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
            <img 
              src={previewImage} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
              alt="Question Preview"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute -bottom-10 left-0 right-0 text-center">
              <p className="text-white/60 text-xs font-medium tracking-widest uppercase">Question Image Preview • Click backdrop to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
              <p className="text-slate-500 text-sm">
                {confirmModal.type === 'single' 
                  ? "Are you sure you want to delete this question? This action cannot be undone."
                  : `Are you sure you want to delete ${confirmModal.count} selected questions? This will permanently remove them from the database.`
                }
              </p>
            </div>
            <div className="bg-slate-50 p-4 flex gap-3">
              <button 
                onClick={closeConfirmModal}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-lg border-l-4">
          <AlertCircle size={20} />
          <div className="flex-1">
            <p className="font-bold text-sm uppercase tracking-tight">Database Error</p>
            <p className="text-xs font-medium opacity-80">{error}</p>
          </div>
          <button onClick={loadQuestions} className="text-xs font-black uppercase underline hover:no-underline px-3 py-1 bg-white/50 rounded-md transition-colors">Retry</button>
        </div>
      )}
    </div>
  );
};
