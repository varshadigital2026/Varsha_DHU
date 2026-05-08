import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Defect {
  type: "Stitching" | "Fabric" | "Measurement" | "Finishing" | "Trims";
  description: string;
  severity: "Minor" | "Major" | "Critical";
  rootCause: string;
  recommendation: string;
  patternSuggestion: string;
  fabricSuggestion: string;
  trimSuggestion: string;
}

export interface AnalysisResult {
  defects: Defect[];
  summary: string;
  category?: string;
}

export async function analyzeGarmentImages(images: string[], category: string): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(',')[1] || img // Handle both data URL and raw base64
    }
  }));

  const prompt = `Analyze these 5 garment images for defects. 
  The images provided are:
  1. Render Image (Visual Reference of the final garment)
  2. Pressure Map (Simulation)
  3. Fit Map (Simulation)
  4. Stress Map (Simulation)
  5. Strain Map (Simulation)

  The garment being inspected is a ${category}.
  Use the Render Image to understand the design intent, and use the 4 simulation maps (Pressure, Fit, Stress, Strain) to identify defects based on the following tolerance limits and logic:

  1. Pressure (kPa):
     - 4.28 – 5.00 (Red): High Risk, Fit Defect. Suggestion: Increase ease / change fabric.
     - 2.85 – 4.28 (Orange/Yellow): Medium Risk, Tightness Issue. Suggestion: Minor pattern adjustment.
     - 0.00 – 2.14 (Green/Blue): Low Risk, No Defect.

  2. Strain (%):
     - 117.14 – 120.00 (Red): High Risk, Seam Stress. Suggestion: Increase ease / stretch fabric.
     - 108.57 – 117.14 (Yellow): Medium Risk, Strain Issue. Suggestion: Adjust pattern.
     - 100.00 – 105.71 (Blue/Green): Low Risk, No Defect.

  3. Fit (%):
     - 100 (Red): High Risk, Unwearable. Suggestion: Major correction.
     - 80 – 100 (Yellow): Medium Risk, Tight Fit. Suggestion: Increase ease.
     - <80 (Green): Low Risk, No Defect.

  4. Stress (kPa):
     - 85.71 – 100.00 (Red): High Risk, Seam/Fabric Failure. Suggestion: Reinforce seam / change fabric.
     - 57.14 – 85.71 (Yellow): Medium Risk, Seam Risk. Suggestion: Check stitching.
     - 0.00 – 42.85 (Blue/Green): Low Risk, No Defect.

  Combined Logic:
  - Strain > 117 + Stress > 85.71 => Seam Breakage (High Risk). Suggestion: Increase ease + stronger fabric.
  - Pressure > 4.28 + Fit >= 80 => Fit Defect (High Risk). Suggestion: Adjust pattern.
  - Strain 108-117 + Fit Loose => Wrinkling (Medium Risk). Suggestion: Balance pattern.

  For each defect found, provide:
  1. Category (Stitching, Fabric, Measurement, Finishing, Trims)
  2. Description (e.g., "High Seam Stress at Armhole")
  3. Severity (Minor, Major, Critical)
  4. Root Cause (e.g., "Pattern/design issue", "Fabric quality issue")
  5. Actionable Recommendation.
  6. patternSuggestion: Specific technical advice for pattern makers.
  7. fabricSuggestion: Specific advice regarding fabric weight, weave, or composition.
  8. trimSuggestion: Advice regarding buttons, zippers, threads, or interlinings.
  
  Also provide a brief overall summary of the garment quality based on these simulation results.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [...imageParts, { text: prompt }] },
    config: {
      temperature: 0.1,
      seed: 42,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          defects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["Stitching", "Fabric", "Measurement", "Finishing", "Trims"] },
                description: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ["Minor", "Major", "Critical"] },
                rootCause: { type: Type.STRING },
                recommendation: { type: Type.STRING },
                patternSuggestion: { type: Type.STRING, description: "Specific pattern adjustment advice" },
                fabricSuggestion: { type: Type.STRING, description: "Specific fabric or material advice" },
                trimSuggestion: { type: Type.STRING, description: "Specific trim or accessory advice" }
              },
              required: ["type", "description", "severity", "rootCause", "recommendation", "patternSuggestion", "fabricSuggestion", "trimSuggestion"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["defects", "summary"]
      }
    }
  });

  const parsed = JSON.parse(response.text);
  return { ...parsed, category };
}
