
import React, { useRef, useState, useEffect } from 'react';
import { ScanLine, FileText, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { backgroundProcessor, PipelineTask } from '../services/backgroundProcessor';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<PipelineTask[]>([]);

  useEffect(() => {
    // Subscribe to background processor updates
    const unsubscribe = backgroundProcessor.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
    });
    return unsubscribe;
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelection(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelection(e.target.files[0]);
    }
  };

  const processSelection = async (file: File) => {
    // Both PDF and Large batches are sent to the background processor
    // Only single images intended for immediate manual review go to onFileSelect
    if (file.type === 'application/pdf') {
      await backgroundProcessor.enqueue(file);
    } else {
      // For images, we give the user a choice: Background or Immediate
      const useBackground = window.confirm("Process this image in the background? (Recommended for large papers)");
      if (useBackground) {
        await backgroundProcessor.enqueue(file);
      } else {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="group relative flex flex-col items-center justify-center w-full max-w-2xl h-80 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer overflow-hidden mx-auto"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleChange}
        />
        
        <div className="relative z-10 flex flex-col items-center gap-4 text-slate-500 group-hover:text-indigo-600 transition-colors">
          <div className="p-4 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
            <ScanLine className="w-10 h-10" />
          </div>
          <div className="text-center px-6">
            <h3 className="text-lg font-semibold">Digitize New Paper</h3>
            <p className="text-sm mt-1 text-slate-400">
              Drag & drop <span className="font-bold">PDF</span> or <span className="font-bold">Images</span> here.<br/>
              PDFs are automatically processed page-by-page in the background.
            </p>
          </div>
        </div>

        <div className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/30 transition-colors" />
      </div>

      {/* Background Pipeline Status View */}
      {tasks.length > 0 && (
        <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4">
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Clock size={12} /> Active Pipeline Worker
            </h4>
            <div className="flex items-center gap-1.5">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
               <span className="text-[10px] text-white font-black uppercase">Online</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {tasks.map(task => (
              <div key={task.id} className={`p-4 flex items-center justify-between transition-colors ${task.status === 'done' ? 'bg-green-50/30' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${
                    task.status === 'done' ? 'bg-green-100 text-green-600' : 
                    task.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-indigo-50 text-indigo-500'
                  }`}>
                    {task.status === 'done' ? <CheckCircle size={18}/> : 
                     task.status === 'failed' ? <AlertCircle size={18}/> : 
                     <FileText size={18}/>}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-bold text-slate-700 truncate max-w-[240px]">{task.fileName}</p>
                    <p className={`text-xs font-medium ${task.status === 'failed' ? 'text-red-500' : 'text-slate-400'}`}>
                      {task.progress}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {(task.status !== 'done' && task.status !== 'failed') && (
                    <div className="flex flex-col items-end">
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                    </div>
                  )}
                  {task.status === 'done' && (
                    <span className="text-[10px] font-black bg-green-600 text-white px-2 py-0.5 rounded">STORED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
