/**
 * Gemini Service - Now calls FastAPI backend instead of Gemini directly.
 *
 * This ensures the API key is kept secure on the server side.
 */

import { AnalysisResult, QuestionSegment } from "../types";
import { API_ENDPOINTS } from "./apiConfig";

interface AnalyzeResponse {
  success: boolean;
  questions: QuestionSegment[];
  error?: string;
  processingTimeMs?: number;
}

/**
 * Analyzes an image using the FastAPI backend (which calls Gemini securely).
 *
 * @param base64Image - Base64-encoded image data (with or without data URL prefix)
 * @param mimeType - MIME type of the image (default: image/png)
 * @returns AnalysisResult with extracted questions
 */
export const analyzeImage = async (
  base64Image: string,
  mimeType: string = "image/png"
): Promise<AnalysisResult> => {
  try {
    const response = await fetch(API_ENDPOINTS.analyze, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data: AnalyzeResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Analysis failed");
    }

    console.log(`[Gemini] Analysis complete in ${data.processingTimeMs}ms, found ${data.questions.length} questions`);

    return { questions: data.questions };

  } catch (error) {
    console.error("[Gemini] Analysis failed:", error);
    throw error;
  }
};

/**
 * Analyzes an image AND crops the detected questions in a single API call.
 * More efficient than calling analyze + crop separately.
 *
 * @param base64Image - Base64-encoded image data
 * @param mimeType - MIME type of the image
 * @returns AnalysisResult with questions that include cropUrl
 */
export const analyzeImageWithCrop = async (
  base64Image: string,
  mimeType: string = "image/png"
): Promise<AnalysisResult> => {
  try {
    const response = await fetch(API_ENDPOINTS.analyzeWithCrop, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const data: AnalyzeResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Analysis failed");
    }

    console.log(`[Gemini] Analysis+crop complete in ${data.processingTimeMs}ms, found ${data.questions.length} questions`);

    return { questions: data.questions };

  } catch (error) {
    console.error("[Gemini] Analysis+crop failed:", error);
    throw error;
  }
};
