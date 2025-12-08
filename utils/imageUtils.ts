import { BoundingBox, QuestionSegment } from "../types";

/**
 * Crops specific regions from a source image based on normalized (0-1000) bounding boxes.
 */
export const extractCrops = async (
  imageSrc: string,
  segments: QuestionSegment[]
): Promise<QuestionSegment[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      const processedSegments = segments.map(segment => {
        const { ymin, xmin, ymax, xmax } = segment.boundingBox;
        
        // Convert normalized 0-1000 coords to pixel coords
        const x = (xmin / 1000) * img.width;
        const y = (ymin / 1000) * img.height;
        const width = ((xmax - xmin) / 1000) * img.width;
        const height = ((ymax - ymin) / 1000) * img.height;

        // Add padding mentioned in the prompt specs roughly (Top 8px, Bottom 6px)
        const padding = 10; 

        canvas.width = width + (padding * 2);
        canvas.height = height + (padding * 2);

        // Fill white background first (for cleaner look)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the image slice
        ctx.drawImage(
          img, 
          Math.max(0, x - 5), // slightly wider source to account for padding
          Math.max(0, y - 5), 
          Math.min(img.width - x, width + 10), 
          Math.min(img.height - y, height + 10), 
          0, 
          0, 
          canvas.width, 
          canvas.height
        );

        return {
          ...segment,
          cropUrl: canvas.toDataURL('image/png')
        };
      });

      resolve(processedSegments);
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
};

/**
 * Re-crops a single segment. Used when manually adjusting the frame.
 */
export const extractSingleCrop = async (
  imageSrc: string,
  segment: QuestionSegment
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      const { ymin, xmin, ymax, xmax } = segment.boundingBox;
      const x = (xmin / 1000) * img.width;
      const y = (ymin / 1000) * img.height;
      const width = ((xmax - xmin) / 1000) * img.width;
      const height = ((ymax - ymin) / 1000) * img.height;
      
      const padding = 10;
      canvas.width = width + (padding * 2);
      canvas.height = height + (padding * 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        Math.max(0, x - 5),
        Math.max(0, y - 5),
        Math.min(img.width - x, width + 10),
        Math.min(img.height - y, height + 10),
        0, 0, canvas.width, canvas.height
      );

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
};