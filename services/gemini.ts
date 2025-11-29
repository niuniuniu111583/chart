import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";
import { decodeBase64, decodeAudioData } from "../utils/audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Step 1: Summarize the input articles into a script suitable for reading.
 */
export const generateNewsScript = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a professional news anchor. 
        Summarize the following text into a concise, engaging, and cohesive news update script.
        The script should be ready to be read aloud (e.g., "In other news...", "Turning to technology...").
        Do not include speaker names (like "Anchor:"), formatted titles, or markdown bolding. Just the spoken words.
        Keep it under 300 words.
        
        Text to summarize:
        ${text}
      `,
    });
    return response.text || "I'm sorry, I couldn't generate a summary.";
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

/**
 * Generate a fictional example news article based on a user-provided topic.
 */
export const generateExampleNews = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        Write 3 short, engaging, fictional news snippets about "${topic}".
        Each snippet should have a headline and a 2-sentence summary.
        Separate them with newlines.
        Make it look like a raw news feed text.
      `,
    });
    return response.text || "Could not generate example content.";
  } catch (error) {
    console.error("Error generating example:", error);
    throw error;
  }
};

/**
 * Extract text from a file (PDF, Image, etc.) using Gemini's multimodal capabilities.
 */
export const extractTextFromFile = async (mimeType: string, base64Data: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Extract all the text content from this file verbatim. Do not summarize or interpret, just output the raw text found in the document/image."
          }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Error extracting text from file:", error);
    throw error;
  }
};

/**
 * Step 2: Convert the text script to speech using Gemini TTS.
 */
export const generateSpeechFromScript = async (
  script: string, 
  voice: VoiceName,
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio content returned from Gemini TTS.");
    }

    const audioBytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(audioBytes, audioContext);
    
    return audioBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};