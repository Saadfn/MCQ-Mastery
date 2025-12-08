import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";

const SYSTEM_PROMPT = `
You are a Computer Vision Simulation Engine for MCQ Extraction. 
Your goal is to analyze an image of a question paper and simulate the following segmentation pipeline to identify individual questions.

Additionally, you must analyze the CONTENT of the question to predict its SUBJECT and identify the CORRECT ANSWER if it is marked (e.g., ticked, circled, or bolded).

Core Philosophy: 
Do not use OCR (Optical Character Recognition) to find split points, as it is unreliable for mixed languages and mathematical symbols. Instead, use Blob Detection (Contour Analysis) on specific Regions of Interest (ROI) to visually identify "islands of ink" (question numbers) and use those coordinates to slice the document.

Pipeline Logic to Simulate:

Phase 1: Layout Analysis & Column Splitting
Goal: Detect if the page has 1, 2, or 3 columns and split them into separate vertical images.
Strategy A (Line Detection):
- Convert image to binary.
- Apply a Morphological Open operation using a tall, thin kernel.
- Find contours of these lines.
- Split the image at the X-coordinates of these lines.

Phase 2: Content Normalization (Trimming)
Goal: Remove variable whitespace margins.
Logic:
- Convert column to binary.
- Find all non-zero pixels (content).
- Calculate the Bounding Box of the content.

Phase 3: Region of Interest (ROI) Extraction
Goal: Isolate the "Question Number Zone".
Logic:
- Extract the Left 12% of the trimmed column.

Phase 4: Blob Detection & Segmentation (The Core Logic)
Goal: Identify cut points based on the position of question numbers in the ROI strip.
- Use dilation to merge digits (e.g. "1" and "0" -> "10").
- Filter noise.
- Map Y-coordinates back to the full column.
- Sort and deduplicate cut points.

Task:
Return a JSON object containing a list of detected questions. 
For each question, provide:
1. The question number/ID.
2. The bounding box (ymin, xmin, ymax, xmax) normalized to a 0-1000 scale.
3. The full text content.
4. The PREDICTED SUBJECT of the question (e.g., Physics, Chemistry, Biology, Math, History, General Knowledge). Infer this from the text context.
5. The CORRECT ANSWER if visible (e.g., "A", "B", "C", "D"). If the user has ticked or circled an option in the image, extract that option. If not marked, return null or empty string.

Do not strictly adhere to pixel-perfect algorithmic kernel sizes as you are a VLM, but adhere to the *intent* of separating questions based on vertical spacing and numbering.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "The detected question number" },
          text: { type: Type.STRING, description: "The full text content" },
          subject: { type: Type.STRING, description: "Inferred subject (Physics, Math, etc.)" },
          correctAnswer: { type: Type.STRING, description: "The marked correct answer (e.g. 'A') if visible, else null" },
          boundingBox: {
            type: Type.OBJECT,
            description: "The 2D bounding box of the question area in 0-1000 scale.",
            properties: {
              ymin: { type: Type.NUMBER },
              xmin: { type: Type.NUMBER },
              ymax: { type: Type.NUMBER },
              xmax: { type: Type.NUMBER },
            },
            required: ["ymin", "xmin", "ymax", "xmax"]
          }
        },
        required: ["id", "text", "boundingBox"]
      }
    }
  },
  required: ["questions"]
};

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: "Perform the MCQ segmentation and content analysis."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};
