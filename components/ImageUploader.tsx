"use client";
import { useRef } from "react";
import { LIMITS } from "@/lib/validation";

export type ImageItem = { id: string; file: File; url: string };

/** Shrinks big photos (phone cameras give 5-12 MB) before upload. */
async function compress(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Validates, compresses and wraps files. Also used for drag-drop and paste. */
export async function toImageItems(files: FileList | File[], existing: number) {
  const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
  const room = LIMITS.maxImages - existing;
  let error: string | undefined;
  if (list.length > room) error = `You can attach up to ${LIMITS.maxImages} photos.`;
  const items: ImageItem[] = [];
  for (const f of list.slice(0, Math.max(room, 0))) {
    if (f.size > LIMITS.maxImageMB * 1024 * 1024) { error = `Photos must be under ${LIMITS.maxImageMB} MB.`; continue; }
    const file = await compress(f);
    items.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
  }
  return { items, error };
}

type Props = {
  items: ImageItem[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
};

export function ImageButtons({ items, onAdd }: Pick<Props, "items" | "onAdd">) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const full = items.length >= LIMITS.maxImages;
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onAdd(e.target.files);
    e.target.value = ""; // allow re-picking the same file
  };
  return (
    <>
      <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={pick} />
      {/* capture opens the rear camera on phones, ignored on desktop */}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
      <button type="button" disabled={full} onClick={() => gallery.current?.click()} aria-label="Attach photos"
        className="fm-ghost grid size-11 place-items-center disabled:opacity-40">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.5-4.5L6 21"/></svg>
      </button>
      <button type="button" disabled={full} onClick={() => camera.current?.click()} aria-label="Take a photo"
        className="fm-ghost grid size-11 place-items-center disabled:opacity-40 md:hidden">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
      </button>
    </>
  );
}

export function ImageStrip({ items, onRemove }: Pick<Props, "items" | "onRemove">) {
  if (!items.length) return null;
  return (
    <ul className="flex gap-2 overflow-x-auto pb-2 pt-2" aria-label="Attached photos">
      {items.map((it, i) => (
        <li key={it.id} className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.url} alt={`Attached photo ${i + 1}`} className="size-16 rounded-xl border border-[var(--line)] object-cover sm:size-20" />
          <button type="button" onClick={() => onRemove(it.id)} aria-label={`Remove photo ${i + 1}`}
            className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-[var(--ink)] text-xs text-[var(--bg)]">
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Thumbnails inside a sent chat bubble */
export function ImageGrid({ urls }: { urls: string[] }) {
  if (!urls.length) return null;
  return (
    <div className={`mb-2 grid gap-1.5 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u} src={u} alt={`Your photo ${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
      ))}
    </div>
  );
}
