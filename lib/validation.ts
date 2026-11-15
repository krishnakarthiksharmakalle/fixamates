// Merge with your existing validation (e.g. zod schemas) as needed.
export type Mode = "repair" | "cooking";

export type RepairData = {
  title: string;
  difficulty: "easy" | "moderate" | "pro";
  safety?: string;
  tools: string[];
  steps: string[];
};

export type RecipeData = {
  title: string;
  time: string;
  serves: number;
  ingredients: string[];
  steps: string[];
};

export type AssistantReply = { reply: string; repair?: RepairData; recipe?: RecipeData };

export const LIMITS = { maxImages: 4, maxImageMB: 10, maxAudioSec: 60 };

/** Server-side check of the multipart body sent by AssistantCard */
export function parseAssistantForm(form: FormData):
  | { mode: Mode; text: string; images: File[]; audio?: File }
  | { error: string } {
  const mode = form.get("mode");
  if (mode !== "repair" && mode !== "cooking") return { error: "Unknown mode." };
  const text = String(form.get("text") ?? "").slice(0, 2000);
  const images = form.getAll("images").filter((f): f is File => f instanceof File && f.type.startsWith("image/"));
  if (images.length > LIMITS.maxImages) return { error: `Up to ${LIMITS.maxImages} photos.` };
  if (images.some((f) => f.size > LIMITS.maxImageMB * 1024 * 1024)) return { error: "A photo is too large." };
  const a = form.get("audio");
  const audio = a instanceof File && a.size > 0 ? a : undefined;
  if (!text && !images.length && !audio) return { error: "Send a message, photo or voice note." };
  return { mode, text, images, audio };
}
