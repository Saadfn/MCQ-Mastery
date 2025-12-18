
import * as pdfjs from 'pdfjs-dist';

// Configure the worker for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

/**
 * Converts a PDF file into an array of Base64 images (one per page).
 */
export const pdfToImages = async (file: File, onProgress?: (p: number, total: number) => void): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const imageUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR/Vision results
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Fix: Added the 'canvas' property to satisfy the RenderParameters type requirement
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    
    // Store as PNG base64
    imageUrls.push(canvas.toDataURL('image/png'));
    
    if (onProgress) {
      onProgress(i, pdf.numPages);
    }
  }

  return imageUrls;
};
