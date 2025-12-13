import React, { useState, useEffect, useRef } from 'react';
import { QuestionSegment, Subject } from '../types';
import { Save, BookOpen, Layers, CheckSquare, CheckCircle2, MousePointerClick, Loader2 } from 'lucide-react';
import { extractSingleCrop } from '../utils/imageUtils';
import { FirebaseService, auth } from '../services/firebase';

interface ResultViewerProps {
  originalImage: string;
  segments: QuestionSegment[];
  subjects: Subject[];
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ originalImage, segments: initialSegments, subjects }) => {
  const [segments, setSegments] = useState<QuestionSegment[]>(initialSegments);
  const [activeTab, setActiveTab] = useState<'visual' | 'list'>('visual');
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string | number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  // Resizing State
  const [resizingHandle, setResizingHandle] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments]);

  // --- Handlers ---

  const handleUpdateSegment = (id: string | number, field: keyof QuestionSegment, value: any) => {
    setSegments(prev => prev.map(s => {
      if (s.id === id) {
        if (field === 'subject') {
           const subjectObj = subjects.find(sub => sub.name === value);
           const chapterValid = subjectObj?.chapters.find(c => c.id === s.chapter);
           return { ...s, [field]: value, chapter: chapterValid ? s.chapter : '' };
        }
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const saveToFirebase = async (segment: QuestionSegment) => {
    if (!auth.currentUser) return;
    const newId = crypto.randomUUID();
    
    // 1. Upload Image if cropUrl exists
    let downloadUrl = "";
    if (segment.cropUrl) {
      downloadUrl = await FirebaseService.uploadQuestionImage(newId, segment.cropUrl);
    }

    // 2. Prepare payload
    const payload: QuestionSegment = {
      ...segment,
      id: newId,
      imageUrl: downloadUrl, // Save the remote URL
      // remove cropUrl to save space in DB if desired, but nice to keep local for now? 
      // Actually Firestore rules might not like huge strings, better to set cropUrl to null or same as imageUrl
      cropUrl: downloadUrl, 
    };

    // 3. Save to Firestore
    await FirebaseService.saveQuestion(payload, auth.currentUser.uid);
  };

  const handleSave = async (segment: QuestionSegment) => {
    if (savedIds.has(segment.id)) return;
    setIsSaving(true);
    try {
      await saveToFirebase(segment);
      setSavedIds(prev => new Set(prev).add(segment.id));
    } catch (err) {
      console.error("Save failed", err);
      alert("Failed to save question. See console.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const unsaved = segments.filter(s => !savedIds.has(s.id));
    if (unsaved.length === 0) return;
    
    setIsSaving(true);
    try {
      // Process in parallel or sequence? Parallel is faster but might hit rate limits. 
      // Let's do batch of 5
      for (let i = 0; i < unsaved.length; i += 5) {
        const batch = unsaved.slice(i, i + 5);
        await Promise.all(batch.map(s => saveToFirebase(s)));
      }
      
      const newSavedIds = new Set(savedIds);
      unsaved.forEach(s => newSavedIds.add(s.id));
      setSavedIds(newSavedIds);
      alert(`Successfully added ${unsaved.length} questions to the database.`);
    } catch (err) {
      console.error("Batch save failed", err);
      alert("Some questions failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Resizing Logic (Unchanged) ---
  const handleMouseDown = (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    setSelectedId(id);
    setActiveTab('visual');
    const card = document.getElementById(`seg-${id}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingHandle(handle);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!resizingHandle || !selectedId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const normX = (x / rect.width) * 1000;
    const normY = (y / rect.height) * 1000;
    setSegments(prev => prev.map(seg => {
      if (seg.id !== selectedId) return seg;
      const box = { ...seg.boundingBox };
      switch (resizingHandle) {
        case 'nw': box.ymin = Math.min(normY, box.ymax - 10); box.xmin = Math.min(normX, box.xmax - 10); break;
        case 'ne': box.ymin = Math.min(normY, box.ymax - 10); box.xmax = Math.max(normX, box.xmin + 10); break;
        case 'sw': box.ymax = Math.max(normY, box.ymin + 10); box.xmin = Math.min(normX, box.xmax - 10); break;
        case 'se': box.ymax = Math.max(normY, box.ymin + 10); box.xmax = Math.max(normX, box.xmin + 10); break;
      }
      return { ...seg, boundingBox: box };
    }));
  };

  const handleMouseUp = async () => {
    if (resizingHandle && selectedId) {
      const seg = segments.find(s => s.id === selectedId);
      if (seg) {
        try {
          const newCropUrl = await extractSingleCrop(originalImage, seg);
          setSegments(prev => prev.map(s => s.id === selectedId ? { ...s, cropUrl: newCropUrl } : s));
        } catch (err) { console.error(err); }
      }
    }
    setResizingHandle(null);
  };

  const handleBackgroundClick = () => { setSelectedId(null); };

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-7xl mx-auto h-[800px]"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
    >
      {/* Left Panel: Source View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <MousePointerClick size={16} className="text-indigo-500" />
            Adjust Frames
          </h3>
          <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
            Click a box to resize • Drag corners
          </span>
        </div>
        
        <div 
          className="relative flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4"
          onClick={handleBackgroundClick}
        >
          <div 
            ref={containerRef}
            className="relative inline-block shadow-lg select-none"
            style={{ cursor: resizingHandle ? 'crosshair' : 'default' }}
          >
            <img 
              ref={imageRef}
              src={originalImage} 
              alt="Source" 
              className="max-w-full h-auto block pointer-events-none"
              draggable={false}
            />
            {segments.map((seg) => {
              const { ymin, xmin, ymax, xmax } = seg.boundingBox;
              const isSelected = selectedId === seg.id;
              const isHovered = hoveredId === seg.id;
              
              return (
                <div
                  key={seg.id}
                  onMouseDown={(e) => handleMouseDown(e, seg.id)}
                  onMouseEnter={() => setHoveredId(seg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`absolute border-2 transition-colors cursor-pointer group ${
                    isSelected ? 'border-indigo-600 bg-indigo-500/10 z-30' : isHovered ? 'border-indigo-400 bg-indigo-400/10 z-20' : 'border-red-500/40 hover:border-red-500 z-10'
                  }`}
                  style={{
                    top: `${(ymin / 1000) * 100}%`,
                    left: `${(xmin / 1000) * 100}%`,
                    height: `${((ymax - ymin) / 1000) * 100}%`,
                    width: `${((xmax - xmin) / 1000) * 100}%`,
                  }}
                >
                  <span className={`absolute -top-6 left-0 text-xs font-bold px-1.5 py-0.5 rounded shadow-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-red-500/80 text-white'}`}>
                    Q{seg.id}
                  </span>
                  {isSelected && (
                    <>
                      <div onMouseDown={(e) => handleResizeStart(e, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nw-resize hover:scale-125 transition-transform"/>
                      <div onMouseDown={(e) => handleResizeStart(e, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-ne-resize hover:scale-125 transition-transform"/>
                      <div onMouseDown={(e) => handleResizeStart(e, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-sw-resize hover:scale-125 transition-transform"/>
                      <div onMouseDown={(e) => handleResizeStart(e, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-se-resize hover:scale-125 transition-transform"/>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel: Extracted Segments & Metadata */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h3 className="font-semibold text-slate-800">Metadata Editor</h3>
          <div className="flex gap-2">
            <button 
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
              {isSaving ? 'Saving...' : 'Add All'}
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button 
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'visual' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Visual
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'list' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Details
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
          {segments.map((seg) => {
            const activeSubject = subjects.find(s => s.name === seg.subject) || subjects.find(s => s.name === "Uncategorized");
            const activeChapters = activeSubject?.chapters || [];
            const isSaved = savedIds.has(seg.id);
            const isSelected = selectedId === seg.id;

            return (
              <div 
                key={seg.id} 
                id={`seg-${seg.id}`}
                onClick={() => setSelectedId(seg.id)}
                className={`bg-white rounded-lg border transition-all shadow-sm cursor-pointer ${
                  isSelected 
                    ? 'border-indigo-500 ring-2 ring-indigo-200' 
                    : hoveredId === seg.id 
                      ? 'border-indigo-300' 
                      : 'border-slate-200'
                } ${isSaved ? 'opacity-75 bg-slate-50' : ''}`}
              >
                {/* Card Header */}
                <div className={`p-3 border-b flex items-center justify-between ${isSelected ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>Question {seg.id}</span>
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                       seg.subject ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                     }`}>
                       {seg.subject || "No Subject"}
                     </span>
                     {isSaved && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><CheckCircle2 size={12}/> Saved</span>}
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Image/Text Preview */}
                  <div className="space-y-2">
                     {activeTab === 'visual' ? (
                       <div className="bg-slate-100 rounded border border-slate-200 p-2 flex items-center justify-center h-32 overflow-hidden relative group">
                         {seg.cropUrl ? (
                           <img src={seg.cropUrl} alt={`Q${seg.id}`} className="max-h-full max-w-full object-contain" />
                         ) : (
                           <span className="text-xs text-slate-400">Loading crop...</span>
                         )}
                       </div>
                     ) : (
                       <textarea 
                          value={seg.text}
                          onChange={(e) => handleUpdateSegment(seg.id, 'text', e.target.value)}
                          className="w-full h-32 text-xs p-2 border border-slate-200 rounded resize-none focus:ring-1 focus:ring-indigo-500 outline-none"
                       />
                     )}
                  </div>

                  {/* Metadata Editor */}
                  <div className="space-y-3" onClick={e => e.stopPropagation()}>
                    {/* Subject */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                        <BookOpen size={12} /> Subject
                      </label>
                      <select 
                        value={seg.subject || ""}
                        onChange={(e) => handleUpdateSegment(seg.id, 'subject', e.target.value)}
                        disabled={isSaved}
                        className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none disabled:bg-slate-100"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Chapter */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                        <Layers size={12} /> Chapter
                      </label>
                      <select 
                         value={seg.chapter || ""}
                         onChange={(e) => handleUpdateSegment(seg.id, 'chapter', e.target.value)}
                         disabled={!seg.subject || isSaved}
                         className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">{seg.subject ? "Select Chapter (Optional)" : "Select Subject First"}</option>
                         {activeChapters.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Correct Answer */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                        <CheckSquare size={12} /> Correct Answer
                      </label>
                      <input 
                        type="text"
                        value={seg.correctAnswer || ""}
                        onChange={(e) => handleUpdateSegment(seg.id, 'correctAnswer', e.target.value)}
                        placeholder="e.g. A, B or 42"
                        disabled={isSaved}
                        className="w-full text-sm p-1.5 border border-slate-300 rounded focus:border-indigo-500 outline-none disabled:bg-slate-100"
                      />
                    </div>
                    
                    <div className="pt-2 flex justify-end">
                      <button 
                        onClick={() => handleSave(seg)}
                        disabled={isSaved || isSaving}
                        className={`text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-1 border ${
                          isSaved 
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                         <Save size={12} /> {isSaved ? 'Saved' : 'Add to Bank'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
