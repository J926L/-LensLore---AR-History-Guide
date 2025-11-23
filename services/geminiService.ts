import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LandmarkAnalysisResult, LandmarkFullDetails } from "../types";

const getClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY is missing in environment variables");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// Step 1: Analyze Image with gemini-3-pro-preview
export const identifyLandmark = async (imageBase64: string): Promise<LandmarkAnalysisResult> => {
  const ai = getClient();
  
  // We ask for JSON output to reliably get the name
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        },
        {
          text: "Identify the primary landmark, building, or tourist attraction in this image. If there is no clear landmark, describe the scene generally. Return the name and a very brief 1 sentence visual description."
        }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the landmark or place" },
          visualDescription: { type: Type.STRING, description: "A short visual description of what is seen" }
        },
        required: ["name", "visualDescription"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from vision model");
  
  return JSON.parse(text) as LandmarkAnalysisResult;
};

// Step 2: Get Details with Search Grounding using gemini-2.5-flash
export const getLandmarkDetails = async (landmarkName: string, visualCtx: string): Promise<LandmarkFullDetails> => {
  const ai = getClient();
  
  const prompt = `Tell me the history and 3 interesting hidden facts about "${landmarkName}". 
  Context from image: ${visualCtx}.
  Focus on engaging storytelling for a tourist. Keep it under 200 words.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      // Note: responseMimeType is NOT allowed with googleSearch
    }
  });

  const text = response.text || "Could not retrieve details.";
  
  // Extract sources
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks
    .map((c: any) => ({
      title: c.web?.title || "Source",
      uri: c.web?.uri || ""
    }))
    .filter((s: { uri: string }) => s.uri !== "");

  // Filter duplicates by URI
  const uniqueSources: { title: string; uri: string }[] = Array.from(
    new Map(sources.map((item: { title: string; uri: string }) => [item.uri, item])).values()
  );

  return {
    description: text,
    sources: uniqueSources
  };
};

// Step 3: Generate Speech with gemini-2.5-flash-preview-tts
export const generateNarration = async (text: string): Promise<string> => {
  const ai = getClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: {
      parts: [{ text: text }]
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Aoede' } // Friendly tour guide voice
        }
      }
    }
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!audioData) {
    throw new Error("No audio generated");
  }

  return audioData;
};