
import { NextResponse } from "next/server";
import { AIError, askAssistant, transcribe } from "@/lib/ai";
import { parseAssistantForm } from "@/lib/validation";

export const maxDuration = 60;

export async function POST(req: Request) {
  let stage = "request";

  try {
    console.log("[Fixmate] Assistant request received");

    // 1. Validate request content type.
    stage = "content type";

    const contentType = req.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          error: "Expected multipart/form-data. Please submit FormData.",
        },
        { status: 415 }
      );
    }

    // 2. Parse and validate submitted fields.
    stage = "form validation";

    const formData = await req.formData();
    const parsed = parseAssistantForm(formData);

    if ("error" in parsed) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    console.log("[Fixmate] Input:", {
      mode: parsed.mode,
      textLength: parsed.text.length,
      imageCount: parsed.images.length,
      hasAudio: Boolean(parsed.audio),
    });

    let text = parsed.text;

    // 3. Transcribe optional audio.
    if (parsed.audio) {
      stage = "audio transcription";

      try {
        const spoken = await transcribe(parsed.audio);

        text = [text, spoken]
          .map((part) => part.trim())
          .filter(Boolean)
          .join("\n");

        console.log("[Fixmate] Audio transcription succeeded");
      } catch (error) {
        console.error("[Fixmate] Audio transcription failed:", error);

        // Continue if the user also supplied text or images.
        if (!text.trim() && parsed.images.length === 0) {
          const message =
            error instanceof Error && error.message === "NO_STT"
              ? "Voice transcription is not configured. Add the required transcription API key."
              : "I couldn't transcribe your recording. Try again or type your message.";

          return NextResponse.json(
            { error: message },
            { status: 503 }
          );
        }
      }
    }

    // 4. Confirm that usable input remains.
    stage = "input validation";

    if (!text.trim() && parsed.images.length === 0) {
      return NextResponse.json(
        { error: "Please provide a message, an image, or a usable voice recording." },
        { status: 400 }
      );
    }

    // 5. Verify server-side Groq configuration.
    stage = "Groq configuration";

    if (!process.env.GROQ_API_KEY?.trim()) {
      console.error("[Fixmate] GROQ_API_KEY is missing");

      return NextResponse.json(
        {
          error: "Groq is not configured. Check GROQ_API_KEY in your root .env.local file.",
        },
        { status: 500 }
      );
    }

    // 6. Call the AI service.
    stage = "Groq request";

    const result = await askAssistant(
      parsed.mode,
      text,
      parsed.images
    );

    if (!result || typeof result.reply !== "string") {
      throw new Error("The AI service returned an invalid response.");
    }

    console.log("[Fixmate] Assistant response generated");

    // 7. Return the result.
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AIError) {
      console.error("[Fixmate] AIError:", {
        stage,
        message: error.message,
        status: error.status,
      });

      return NextResponse.json(
        {
          error: error.message,
          stage,
        },
        { status: error.status }
      );
    }

    console.error(`[Fixmate] Failed at stage: ${stage}`, error);

    const debugMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "The assistant could not process your request.",
        stage,
        ...(process.env.NODE_ENV === "development"
          ? { debug: debugMessage }
          : {}),
      },
      { status: 500 }
    );
  }
}