
import { SYSTEM } from "./prompts";
import type { AssistantReply, Mode } from "./validation";

const GROQ_API_URL = "https://api.groq.com/openai/v1";

const DEFAULT_MODEL = "qwen/qwen3.8-27b";

export class AIError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AIError";
    this.status = status;
  }
}

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();

  if (!key || key === "your_new_groq_api_key") {
    throw new AIError(
      "GROQ_API_KEY is missing. Add a valid key to .env.local and restart the server.",
      500
    );
  }

  return key;
}

function getModel(envName: string): string {
  return process.env[envName]?.trim() || DEFAULT_MODEL;
}

async function getErrorDetails(response: Response): Promise<string> {
  try {
    const body = await response.text();

    console.error("[Fixmate] Groq API error:", {
      status: response.status,
      body,
    });

    try {
      const parsed = JSON.parse(body);
      return parsed?.error?.message || body;
    } catch {
      return body;
    }
  } catch {
    return "Could not read the Groq error response.";
  }
}

async function groqError(
  response: Response,
  operation: string
): Promise<AIError> {
  const detail = await getErrorDetails(response);

  if (response.status === 401 || response.status === 403) {
    return new AIError(
      "Groq rejected the API key or access to this model. Check your key and model permissions.",
      response.status
    );
  }

  if (response.status === 429) {
    return new AIError(
      "Groq rate limit or quota reached. Wait and try again, or check your Groq usage.",
      429
    );
  }

  if (response.status === 413) {
    return new AIError(
      "Your upload is too large. Try fewer or smaller images.",
      413
    );
  }

  if (response.status === 400 || response.status === 404) {
    return new AIError(
      `Groq rejected the ${operation}. Check the model name and request settings. Details: ${detail}`,
      502
    );
  }

  return new AIError(
    `Groq ${operation} failed (${response.status}). ${detail}`,
    502
  );
}

/** Extract JSON when the model returns plain text or Markdown fences. */
function parseJson(raw: string): unknown {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item !== null && item !== undefined)
    .map(String);
}

/** Normalize the model output into the response shape used by Fixmate. */
function normalize(
  raw: string,
  parsed: unknown,
  mode: Mode
): AssistantReply {
  const data =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};

  const plainReply = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  const result: AssistantReply = {
    reply:
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : plainReply || "Sorry, I couldn't generate a response. Please try again.",
  };

  if (mode === "repair") {
    const repair = data.repair;

    if (repair && typeof repair === "object") {
      const item = repair as Record<string, unknown>;
      const difficulty = item.difficulty;

      result.repair = {
        title: String(item.title || "Suggested repair"),
        difficulty:
          difficulty === "easy" ||
          difficulty === "moderate" ||
          difficulty === "pro"
            ? difficulty
            : "moderate",
        safety:
          typeof item.safety === "string"
            ? item.safety
            : undefined,
        tools: toStringArray(item.tools),
        steps: toStringArray(item.steps),
      };
    }
  }

  if (mode === "cooking") {
    const recipe = data.recipe;

    if (recipe && typeof recipe === "object") {
      const item = recipe as Record<string, unknown>;

      result.recipe = {
        title: String(item.title || "Suggested recipe"),
        time: String(item.time || "Not specified"),
        serves: Number(item.serves) || 2,
        ingredients: toStringArray(item.ingredients),
        steps: toStringArray(item.steps),
      };
    }
  }

  return result;
}

async function imageToBase64(file: File): Promise<string> {
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}

export async function askAssistant(
  mode: Mode,
  text: string,
  images: File[]
): Promise<AssistantReply> {
  const apiKey = getApiKey();

  if (mode !== "repair" && mode !== "cooking") {
    throw new AIError("Invalid assistant mode.", 400);
  }

  if (!text.trim() && images.length === 0) {
    throw new AIError("Please provide text or at least one image.", 400);
  }

  const userText =
    text.trim() || "Please inspect the attached image and help me.";

  type TextPart = { type: "text"; text: string };
  type ImagePart = {
    type: "image_url";
    image_url: { url: string };
  };

  const content: Array<TextPart | ImagePart> = [];
  let totalImageBytes = 0;

  for (const image of images) {
    if (!image.type.startsWith("image/")) {
      throw new AIError("One of the uploaded files is not an image.", 400);
    }

    if (image.size === 0) {
      throw new AIError("An uploaded image is empty.", 400);
    }

    if (image.size > 3 * 1024 * 1024) {
      throw new AIError(
        "Each image must be smaller than 3 MB.",
        413
      );
    }

    totalImageBytes += image.size;

    const base64 = await imageToBase64(image);

    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.type};base64,${base64}`,
      },
    });
  }

  if (totalImageBytes > 3 * 1024 * 1024) {
    throw new AIError(
      "The combined images are too large. Upload fewer or smaller images.",
      413
    );
  }

  content.push({
    type: "text",
    text: userText,
  });

  const modelName = getModel(
    images.length > 0
      ? "GROQ_VISION_MODEL"
      : "GROQ_TEXT_MODEL"
  );

  const messages = [
    {
      role: "system" as const,
      content:
        SYSTEM[mode] +
        "\n\nProvide a useful answer. When possible, return a JSON object with a reply field. For repair requests, include a repair object. For cooking requests, include a recipe object.",
    },
    {
      role: "user" as const,
      content: images.length > 0 ? content : userText,
    },
  ];

  async function requestGroq(jsonMode: boolean): Promise<Response> {
    const payload: Record<string, unknown> = {
      model: modelName,
      messages,
      temperature: 0.3,
      max_tokens: 2000,
    };

    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }

    return fetch(`${GROQ_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(50000),
    });
  }

  let response: Response;

  try {
    response = await requestGroq(true);

    if (response.status === 400) {
      const firstError = await response.text();

      console.warn(
        "[Fixmate] JSON-mode request rejected; retrying:",
        firstError
      );

      response = await requestGroq(false);
    }
  } catch (error) {
    console.error("[Fixmate] Groq connection failed:", error);

    if (error instanceof AIError) throw error;

    throw new AIError(
      "Could not connect to Groq. Check your internet connection and try again.",
      502
    );
  }

  if (!response.ok) {
    throw await groqError(response, "chat request");
  }

  const result = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const raw = result.choices?.[0]?.message?.content;

  if (!raw?.trim()) {
    console.error("[Fixmate] Groq returned an empty response:", result);

    throw new AIError(
      "Groq returned an empty response. Please try again.",
      502
    );
  }

  return normalize(raw, parseJson(raw), mode);
}

/** Transcribe voice recordings using Groq speech-to-text. */
export async function transcribe(audio: File): Promise<string> {
  const apiKey = getApiKey();

  if (audio.size === 0) {
    throw new AIError("The recorded audio is empty.", 400);
  }

  const formData = new FormData();

  formData.set("file", audio, audio.name || "voice.webm");
  formData.set(
    "model",
    process.env.GROQ_STT_MODEL?.trim() || "whisper-large-v3-turbo"
  );
  formData.set("response_format", "json");

  let response: Response;

  try {
    response = await fetch(
      `${GROQ_API_URL}/audio/transcriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(50000),
      }
    );
  } catch (error) {
    console.error("[Fixmate] Groq transcription connection failed:", error);

    throw new AIError(
      "Could not connect to Groq transcription. Please try again.",
      502
    );
  }

  if (!response.ok) {
    throw await groqError(response, "audio transcription");
  }

  const result = (await response.json()) as {
    text?: string;
  };

  const transcript = result.text?.trim();

  if (!transcript) {
    throw new AIError(
      "No speech was detected. Try recording again or type your message.",
      422
    );
  }

  return transcript;
}