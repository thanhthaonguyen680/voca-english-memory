import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// "gemini-2.0-flash" no longer gets free-tier quota for new API keys (limit: 0).
// The "-latest" alias auto-tracks Google's current lite Flash model, which does.
export const STORY_MODEL = "gemini-flash-lite-latest";
