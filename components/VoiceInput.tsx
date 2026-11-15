"use client";
import { useEffect, useRef, useState } from "react";
import { LIMITS } from "@/lib/validation";

type Props = { onRecorded: (blob: Blob) => void; onError: (msg: string) => void; disabled?: boolean };

/** Phone-only (md:hidden). Tap to start, tap again to stop. */
export default function VoiceInput({ onRecorded, onError, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => { clearInterval(timer.current); rec.current?.stream.getTracks().forEach((t) => t.stop()); }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }));
      };
      mr.start();
      rec.current = mr;
      setSecs(0);
      setRecording(true);
      timer.current = setInterval(() => setSecs((s) => { if (s + 1 >= LIMITS.maxAudioSec) stop(); return s + 1; }), 1000);
    } catch {
      onError("Microphone blocked. Allow mic access in your browser settings to talk to Fixmate.");
    }
  }

  function stop() {
    clearInterval(timer.current);
    if (rec.current?.state === "recording") rec.current.stop();
    setRecording(false);
  }

  return (
    <button type="button" disabled={disabled} onClick={recording ? stop : start}
      aria-label={recording ? "Stop recording" : "Record a voice message"}
      className={`grid h-11 place-items-center md:hidden ${recording ? "fm-rec min-w-20 rounded-xl bg-[var(--danger)] px-3 text-sm font-semibold text-white" : "fm-ghost size-11"}`}>
      {recording ? (
        <span>■ 0:{String(secs).padStart(2, "0")}</span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
      )}
    </button>
  );
}
