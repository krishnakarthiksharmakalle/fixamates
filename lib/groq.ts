
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY is missing from .env.local");
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const TEXT_MODEL =
  process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile";

export const VISION_MODEL =
  process.env.GROQ_VISION_MODEL ||
  "meta-llama/llama-4-scout-17b-16e-instruct";