import React, { useRef } from 'react';
import { Upload, FileImage, ScanLine } from 'lucide-react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="group relative flex flex-col items-center justify-center w-full max-w-2xl h-80 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 transition-all cursor-pointer overflow-hidden"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      
      <div className="relative z-10 flex flex-col items-center gap-4 text-slate-500 group-hover:text-indigo-600 transition-colors">
        <div className="p-4 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
          <ScanLine className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Upload Question Paper</h3>
          <p className="text-sm mt-1 text-slate-400">Drag & drop or click to analyze</p>
        </div>
      </div>

      <div className="absolute inset-0 bg-indigo-50/0 group-hover:bg-indigo-50/30 transition-colors" />
    </div>
  );
};
