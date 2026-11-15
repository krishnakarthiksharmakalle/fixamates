
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InputPanel, { type Outgoing } from "./InputPanel";
import { ImageGrid } from "./ImageUploader";
import RepairResult from "./RepairResult";
import RecipeResult from "./RecipeResult";
import type { AssistantReply, Mode } from "@/lib/validation";

type Msg =
  | {
      id: string;
      role: "user";
      text: string;
      images: string[];
      audioUrl?: string;
    }
  | {
      id: string;
      role: "assistant";
      data: AssistantReply;
    };

type Props = {
  initialMode: Mode;
  showModeSwitch?: boolean;
};

const copy = {
  repair: {
    title: "What needs fixing?",
    hint: "Snap a photo, describe the problem, or use your phone to speak.",
    chips: [
      "Leaking kitchen tap",
      "Wobbly ceiling fan",
      "Door won't latch",
    ],
  },
  cooking: {
    title: "What are we cooking?",
    hint: "Photograph your fridge or list your ingredients.",
    chips: [
      "Dinner from eggs, rice and spinach",
      "Quick 15-minute breakfast",
      "Use up leftover chicken",
    ],
  },
} as const;

function getErrorMessage(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string"
  ) {
    return data.message;
  }

  return "The server returned an unexpected response.";
}

export default function AssistantCard({
  initialMode,
  showModeSwitch = false,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);

  const end = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [msgs, busy]);

  const send = useCallback(
    async ({ text, images, audio }: Outgoing) => {
      if (busyRef.current) return;

      if (!text.trim() && images.length === 0 && !audio) {
        return;
      }

      busyRef.current = true;
      setBusy(true);

      const userMessage: Msg = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        images: images.map((image) => image.url),
        audioUrl: audio
          ? URL.createObjectURL(audio)
          : undefined,
      };

      setMsgs((previous) => [...previous, userMessage]);

      try {
        const formData = new FormData();

        formData.set("mode", mode);
        formData.set("text", text);

        for (const image of images) {
          formData.append("images", image.file);
        }

        if (audio) {
          formData.set("audio", audio, "voice.webm");
        }

        const response = await fetch("/api/assistant", {
          method: "POST",
          body: formData,
        });

        const contentType =
          response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          const body = await response.text();

          console.error(
            "[Fixmate] Non-JSON API response:",
            response.status,
            body
          );

          throw new Error(
            `Server returned HTTP ${response.status}. Check the terminal for details.`
          );
        }

        const data: unknown = await response.json();

        if (!response.ok) {
          console.error(
            "[Fixmate] API request failed:",
            response.status,
            data
          );

          throw new Error(
            getErrorMessage(data) ||
              `Request failed with status ${response.status}.`
          );
        }

        if (
          !data ||
          typeof data !== "object" ||
          !("reply" in data) ||
          typeof data.reply !== "string"
        ) {
          console.error("[Fixmate] Invalid assistant response:", data);

          throw new Error(
            "The server response is missing the assistant reply. Check lib/ai.ts."
          );
        }

        const result = data as AssistantReply;

        // Save structured repair and recipe results.
        if (result.repair || result.recipe) {
          try {
            const stored = localStorage.getItem("fm-results");
            const previous: AssistantReply[] = stored
              ? JSON.parse(stored)
              : [];

            localStorage.setItem(
              "fm-results",
              JSON.stringify([result, ...previous].slice(0, 20))
            );
          } catch (storageError) {
            console.warn(
              "[Fixmate] Could not save result:",
              storageError
            );
          }
        }

        setMsgs((previous) => [
          ...previous,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            data: result,
          },
        ]);
      } catch (error) {
        console.error("[Fixmate] Assistant request error:", error);

        const message =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.";

        setMsgs((previous) => [
          ...previous,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            data: {
              reply: `Fixmate couldn't complete your request: ${message}`,
            },
          },
        ]);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [mode]
  );

  const c = copy[mode];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showModeSwitch && (
        <div
          role="tablist"
          aria-label="Assistant mode"
          className="mx-3 mt-3 grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-2)] p-1 sm:mx-4 sm:w-72"
        >
          {(["repair", "cooking"] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              disabled={busy}
              onClick={() => setMode(item)}
              className={`rounded-lg py-2 text-sm font-semibold ${
                mode === item
                  ? "bg-[var(--surface)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
            >
              {item === "repair" ? "Repair" : "Cooking"}
            </button>
          ))}
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"
        aria-live="polite"
        aria-busy={busy}
      >
        {msgs.length === 0 ? (
          <div className="mx-auto mt-6 max-w-md text-center sm:mt-14">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {c.title}
            </h1>

            <p className="mt-2 text-[var(--muted)]">{c.hint}</p>

            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {c.chips.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        text: suggestion,
                        images: [],
                      })
                    }
                    className="fm-card px-3.5 py-2 text-sm hover:border-[var(--accent)] disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-4">
            {msgs.map((message) =>
              message.role === "user" ? (
                <li
                  key={message.id}
                  className="ml-auto max-w-[85%] sm:max-w-[70%]"
                >
                  <div className="rounded-2xl rounded-br-md bg-[var(--accent)] p-3 text-[var(--accent-ink)]">
                    {message.images.length > 0 && (
                      <ImageGrid urls={message.images} />
                    )}

                    {message.audioUrl && (
                      <audio
                        src={message.audioUrl}
                        controls
                        className="mb-2 h-10 w-full"
                      />
                    )}

                    {message.text && (
                      <p className="whitespace-pre-wrap">
                        {message.text}
                      </p>
                    )}
                  </div>
                </li>
              ) : (
                <li
                  key={message.id}
                  className="fm-card max-w-[95%] rounded-bl-md p-4 sm:max-w-[85%]"
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {message.data.reply}
                  </p>

                  {message.data.repair && (
                    <RepairResult data={message.data.repair} />
                  )}

                  {message.data.recipe && (
                    <RecipeResult data={message.data.recipe} />
                  )}
                </li>
              )
            )}

            {busy && (
              <li
                role="status"
                className="fm-card w-fit px-4 py-3 text-sm text-[var(--muted)]"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="animate-pulse">●</span>
                  Fixmate is thinking…
                </span>
              </li>
            )}
          </ul>
        )}

        <div ref={end} />
      </div>

      <InputPanel
        mode={mode}
        busy={busy}
        onSend={(outgoing) => void send(outgoing)}
      />
    </div>
  );
}