"use client";
import { useEffect, useRef, useState } from "react";
import { ImageButtons, ImageStrip, toImageItems, type ImageItem } from "./ImageUploader";
import VoiceInput from "./VoiceInput";
import type { Mode } from "@/lib/validation";

export type Outgoing = { text: string; images: ImageItem[]; audio?: Blob };
type Props = { mode: Mode; busy: boolean; onSend: (m: Outgoing) => void };

export default function InputPanel({ mode, busy, onSend }: Props) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [audio, setAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  async function add(files: FileList | File[]) {
    const { items, error } = await toImageItems(files, images.length);
    setImages((p) => [...p, ...items]);
    setError(error ?? "");
  }

  function remove(id: string) {
    images.filter((i) => i.id === id).forEach((i) => URL.revokeObjectURL(i.url));
    setImages((p) => p.filter((i) => i.id !== id));
  }

  function recorded(blob: Blob) {
    setAudio((old) => { if (old) URL.revokeObjectURL(old.url); return { blob, url: URL.createObjectURL(blob) }; });
    setError("");
  }

  const canSend = !busy && (text.trim() || images.length || audio);

  function submit() {
    if (!canSend) return;
    onSend({ text: text.trim(), images, audio: audio?.blob });
    // image URLs now belong to the chat bubble, so don't revoke them
    setText(""); setImages([]); setAudio(null); setError("");
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) add(e.dataTransfer.files); }}
      className={`safe-b border-t border-[var(--line)] bg-[var(--bg)] px-3 pt-3 sm:px-4 ${drag ? "outline-dashed outline-2 -outline-offset-4 outline-[var(--accent)]" : ""}`}>
      {drag && <p className="pb-2 text-center text-sm text-[var(--muted)]">Drop photos to attach</p>}

      <ImageStrip items={images} onRemove={remove} />

      {audio && (
        <div className="mb-2 flex items-center gap-2">
          <audio src={audio.url} controls className="h-10 min-w-0 flex-1" />
          <button type="button" onClick={() => { URL.revokeObjectURL(audio.url); setAudio(null); }} className="fm-ghost px-3 py-2 text-sm">Remove</button>
        </div>
      )}

      {error && <p role="alert" className="pb-2 text-sm text-[var(--danger)]">{error}</p>}

      <div className="flex items-end gap-2">
        <ImageButtons items={images} onAdd={add} />
        <VoiceInput onRecorded={recorded} onError={setError} disabled={busy} />

        <textarea ref={area} rows={1} value={text} onChange={(e) => setText(e.target.value)}
          onPaste={(e) => { const f = Array.from(e.clipboardData.files); if (f.length) { e.preventDefault(); add(f); } }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(min-width:768px)").matches) { e.preventDefault(); submit(); } }}
          placeholder={mode === "repair" ? "Describe what's broken…" : "What's in your kitchen?"}
          aria-label="Message"
          className="max-h-40 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-base placeholder:text-[var(--muted)]" />

        <button type="button" onClick={submit} disabled={!canSend} aria-label="Send" className="fm-btn grid size-11 shrink-0 place-items-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
      </div>
    </div>
  );
}
