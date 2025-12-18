
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { QuestionSegment, BoundingBox, Subject } from '../types';
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
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Crop,
  CheckCircle,
  Undo,
  Edit2,
  Save,
  X as CloseIcon
} from 'lucide-react';
import { extractSingleCrop } from '../utils/imageUtils';

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionSegment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{subject: string, chapter: string}>({ subject: '', chapter: '' });

  // Custom Modal State for Deletion
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    id?: string;
    count?: number;
  }>({ isOpen: false, type: 'single' });

  // Image Preview Modal State
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isReCropMode, setIsReCropMode] = useState(false);
  const [tempBox, setTempBox] = useState<BoundingBox | null>(null);
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const [isUpdatingCrop, setIsUpdatingCrop] = useState(false);
  
  const reCropContainerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qs, subs] = await Promise.all([
        FirebaseService.getQuestions(),
        FirebaseService.getSubjects()
      ]);
      setQuestions(qs);
      setSubjects(subs);
    } catch (err: any) {
      console.error("[Bank] Load failed:", err);
      setError("Failed to fetch data. Check Firestore rules or console.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = (q.text || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = subjectFilter === "all" || q.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    });
  }, [questions, searchQuery, subjectFilter]);

  const uniqueSubjects = useMemo(() => {
    return subjects.map(s => s.name).sort();
  }, [subjects]);

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

  const startEditing = (q: QuestionSegment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(String(q.id));
    setEditValues({
      subject: q.subject || '',
      chapter: q.chapter || ''
    });
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    
    try {
      await FirebaseService.updateQuestion(editingId, {
        subject: editValues.subject,
        chapter: editValues.chapter
      });
      
      setQuestions(prev => prev.map(q => 
        String(q.id) === editingId 
          ? { ...q, subject: editValues.subject, chapter: editValues.chapter } 
          : q
      ));
      
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update question", err);
      alert("Failed to save changes.");
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleNextPreview = useCallback(() => {
    if (previewIndex === null) return;
    setIsReCropMode(false);
    setTempBox(null);
    setPreviewIndex((prev) => (prev! + 1) % filteredQuestions.length);
  }, [previewIndex, filteredQuestions.length]);

  const handlePrevPreview = useCallback(() => {
    if (previewIndex === null) return;
    setIsReCropMode(false);
    setTempBox(null);
    setPreviewIndex((prev) => (prev! - 1 + filteredQuestions.length) % filteredQuestions.length);
  }, [previewIndex, filteredQuestions.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewIndex === null) return;
      if (isReCropMode) return; // Disable gallery arrows when cropping
      if (e.key === 'ArrowRight') handleNextPreview();
      if (e.key === 'ArrowLeft') handlePrevPreview();
      if (e.key === 'Escape') {
        if (isReCropMode) {
          setIsReCropMode(false);
          setTempBox(null);
        } else {
          setPreviewIndex(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, isReCropMode, handleNextPreview, handlePrevPreview]);

  // --- Re-Crop Interaction Handlers ---
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingHandle(handle);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!resizingHandle || !tempBox || !reCropContainerRef.current) return;
    const rect = reCropContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const normX = (x / rect.width) * 1000;
    const normY = (y / rect.height) * 1000;

    const box = { ...tempBox };
    switch (resizingHandle) {
      case 'nw': box.ymin = Math.min(normY, box.ymax - 10); box.xmin = Math.min(normX, box.xmax - 10); break;
      case 'ne': box.ymin = Math.min(normY, box.ymax - 10); box.xmax = Math.max(normX, box.xmin + 10); break;
      case 'sw': box.ymax = Math.max(normY, box.ymin + 10); box.xmin = Math.min(normX, box.xmax - 10); break;
      case 'se': box.ymax = Math.max(normY, box.ymin + 10); box.xmax = Math.max(normX, box.xmin + 10); break;
    }
    setTempBox(box);
  };

  const handleMouseUp = () => {
    setResizingHandle(null);
  };

  const handleSaveReCrop = async () => {
    if (!previewItem || !tempBox) return;
    setIsUpdatingCrop(true);
    try {
      const sourceUrl = previewItem.sourceImageUrl;
      if (!sourceUrl) throw new Error("No source paper available for this question.");

      // 1. Generate new crop from original image URL
      const newCropBase64 = await extractSingleCrop(sourceUrl, { 
        ...previewItem, 
        boundingBox: tempBox 
      });

      // 2. Upload to Firebase
      const newUrl = await FirebaseService.uploadQuestionImage(String(previewItem.id), newCropBase64);

      // 3. Update Firestore
      await FirebaseService.updateQuestion(String(previewItem.id), {
        boundingBox: tempBox,
        imageUrl: newUrl,
        cropUrl: newUrl
      });

      // 4. Update local state
      setQuestions(prev => prev.map(q => q.id === previewItem.id ? { 
        ...q, 
        boundingBox: tempBox, 
        imageUrl: newUrl, 
        cropUrl: newUrl 
      } : q));

      setIsReCropMode(false);
      setTempBox(null);
    } catch (err: any) {
      console.error("Failed to update crop", err);
      alert(err.message || "Failed to save changes.");
    } finally {
      setIsUpdatingCrop(false);
    }
  };

  const startReCrop = () => {
    if (previewItem) {
      setTempBox({ ...previewItem.boundingBox });
      setIsReCropMode(true);
    }
  };

  const previewItem = previewIndex !== null ? filteredQuestions[previewIndex] : null;
  const previewImageUrl = previewItem ? (previewItem.imageUrl || previewItem.cropUrl) : null;

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
            onClick={loadData}
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
              {filteredQuestions.map((q, idx) => {
                const sid = String(q.id);
                const isSelected = selectedIds.has(sid);
                const isEditing = editingId === sid;
                const imageUrl = q.imageUrl || q.cropUrl;
                
                // Get chapters for current selected subject in edit mode
                const currentSubjectObj = subjects.find(s => s.name === editValues.subject);
                const availableChapters = currentSubjectObj?.chapters || [];

                return (
                  <tr key={sid} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <button onClick={(e) => toggleSelect(sid, e)} className="text-slate-400 hover:text-indigo-600">
                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        onClick={() => imageUrl && setPreviewIndex(idx)}
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
                      {isEditing ? (
                        <div className="flex flex-col gap-2 max-w-xs" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                            <select 
                              value={editValues.subject}
                              onChange={(e) => setEditValues({...editValues, subject: e.target.value, chapter: ''})}
                              className="text-xs p-1 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="">Uncategorized</option>
                              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Chapter</label>
                            <select 
                              value={editValues.chapter}
                              disabled={!editValues.subject}
                              onChange={(e) => setEditValues({...editValues, chapter: e.target.value})}
                              className="text-xs p-1 bg-white border border-slate-200 rounded outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50"
                            >
                              <option value="">No Chapter</option>
                              {availableChapters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 max-w-md">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">
                              {q.subject || "Uncategorized"}
                            </span>
                            {q.chapter && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                                {q.chapter}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">ID: {sid.slice(-8)}</span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 italic leading-relaxed">
                            {q.text || "No text available."}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={saveEdit}
                              className="text-green-500 hover:text-green-600 p-2 hover:bg-green-50 rounded-lg transition-all"
                              title="Save Changes"
                            >
                              <Save size={18} />
                            </button>
                            <button 
                              onClick={cancelEdit}
                              className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-lg transition-all"
                              title="Cancel"
                            >
                              <CloseIcon size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => startEditing(q, e)}
                              className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Quick Edit Taxonomy"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={(e) => openDeleteModal(sid, e)}
                              disabled={deleting}
                              className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg disabled:opacity-30 transition-all"
                              title="Delete Question"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
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

      {/* Image Preview Modal with Slider & Re-Crop */}
      {previewIndex !== null && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden"
          onClick={() => { if (!isUpdatingCrop) setPreviewIndex(null); }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Controls Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 pointer-events-none">
             <div className="flex items-center gap-4 pointer-events-auto">
               <button 
                 onClick={(e) => { e.stopPropagation(); setPreviewIndex(null); }}
                 className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all group active:scale-90"
                 title="Close"
               >
                 <X size={24} />
               </button>
               {!isReCropMode && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); startReCrop(); }}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 flex items-center gap-2 shadow-xl shadow-indigo-900/40 transition-all active:scale-95"
                 >
                    <Crop size={18} /> Adjust Frame
                 </button>
               )}
               {isReCropMode && (
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSaveReCrop(); }}
                      disabled={isUpdatingCrop}
                      className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-full hover:bg-green-700 flex items-center gap-2 shadow-xl shadow-green-900/40 disabled:opacity-50"
                    >
                      {isUpdatingCrop ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      Save Crop
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsReCropMode(false); setTempBox(null); }}
                      disabled={isUpdatingCrop}
                      className="px-6 py-2.5 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 flex items-center gap-2"
                    >
                      <Undo size={18} /> Cancel
                    </button>
                 </div>
               )}
             </div>

             {/* Gallery Navigation Arrows (Only if not cropping) */}
             {!isReCropMode && (
               <div className="flex gap-2 pointer-events-auto">
                 <button 
                  className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"
                  onClick={(e) => { e.stopPropagation(); handlePrevPreview(); }}
                 >
                  <ChevronLeft size={32} />
                 </button>
                 <button 
                  className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90"
                  onClick={(e) => { e.stopPropagation(); handleNextPreview(); }}
                 >
                  <ChevronRight size={32} />
                 </button>
               </div>
             )}
          </div>

          <div className="relative max-w-5xl w-full h-full flex flex-col items-center justify-center p-8 pointer-events-none">
            
            {/* --- DISPLAY MODES --- */}
            {isReCropMode ? (
              // FULL IMAGE MODE (CROPPER)
              <div 
                ref={reCropContainerRef}
                className="relative inline-block shadow-2xl rounded-lg bg-slate-800 pointer-events-auto select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={previewItem?.sourceImageUrl} 
                  className="max-w-full max-h-[75vh] object-contain rounded-lg opacity-60"
                  alt="Full Paper"
                  draggable={false}
                />
                
                {/* Manual Crop Handle Box */}
                {tempBox && (
                  <div
                    className="absolute border-4 border-indigo-400 bg-indigo-500/10 z-30 shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]"
                    style={{
                      top: `${(tempBox.ymin / 1000) * 100}%`,
                      left: `${(tempBox.xmin / 1000) * 100}%`,
                      height: `${((tempBox.ymax - tempBox.ymin) / 1000) * 100}%`,
                      width: `${((tempBox.xmax - tempBox.xmin) / 1000) * 100}%`,
                    }}
                  >
                    {/* Handles */}
                    <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nw-resize"/>
                    <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ne-resize"/>
                    <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-sw-resize"/>
                    <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-se-resize"/>
                    
                    <span className="absolute -top-8 left-0 bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      Adjusting Question Frame
                    </span>
                  </div>
                )}
              </div>
            ) : (
              // SINGLE CROP PREVIEW MODE
              <div className="relative animate-in zoom-in-95 duration-300">
                {previewImageUrl ? (
                  <img 
                    src={previewImageUrl} 
                    className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10 pointer-events-auto"
                    alt="Question Preview"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="bg-white/5 p-12 rounded-2xl flex flex-col items-center gap-4 text-white/40">
                    <ImageIcon size={64} />
                    <p className="font-medium">No image content available</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Status Info Footer */}
            <div className="mt-8 text-center bg-slate-900/60 backdrop-blur px-6 py-3 rounded-full border border-white/10 pointer-events-auto">
              <p className="text-white font-bold tracking-tight">
                {isReCropMode ? 'Adjusting Original Paper Scan' : `Question ${previewItem?.id ? String(previewItem.id).slice(-8).toUpperCase() : (previewIndex + 1)}`}
              </p>
              <p className="text-white/60 text-[10px] font-medium tracking-widest uppercase mt-1">
                {isReCropMode ? 'Drag corners to fix overlaps or cutouts' : `Item ${previewIndex + 1} of ${filteredQuestions.length} • Arrow keys to navigate`}
              </p>
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
          <button onClick={loadData} className="text-xs font-black uppercase underline hover:no-underline px-3 py-1 bg-white/50 rounded-md transition-colors">Retry</button>
        </div>
      )}
    </div>
  );
};
