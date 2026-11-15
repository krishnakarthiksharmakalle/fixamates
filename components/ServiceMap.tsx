"use client";
import { useState } from "react";
import type { Kind, Place } from "@/lib/places";

const kinds: { id: Kind; label: string }[] = [
  { id: "plumber", label: "Plumbers" },
  { id: "electrician", label: "Electricians" },
  { id: "appliance", label: "Appliance repair" },
  { id: "handyman", label: "Handymen" },
];

export default function ServiceMap() {
  const [kind, setKind] = useState<Kind>("plumber");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [msg, setMsg] = useState("");

  function search(k: Kind, p = pos) {
    if (!p) return;
    setState("loading");
    fetch(`/api/nearby?lat=${p.lat}&lng=${p.lng}&kind=${k}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setPlaces(d.places); setState("idle"); setMsg(d.places.length ? "" : "Nothing found nearby. Try another type."); })
      .catch(() => { setState("error"); setMsg("Couldn't load nearby help. Try again in a moment."); });
  }

  function locate() {
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (g) => { const p = { lat: g.coords.latitude, lng: g.coords.longitude }; setPos(p); search(kind, p); },
      () => { setState("error"); setMsg("Location is blocked. Allow it in your browser settings to find help near you."); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  const d = 0.03;
  const map = pos && `https://www.openstreetmap.org/export/embed.html?bbox=${pos.lng - d},${pos.lat - d},${pos.lng + d},${pos.lat + d}&layer=mapnik&marker=${pos.lat},${pos.lng}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Service type">
        {kinds.map((k) => (
          <button key={k.id} aria-pressed={kind === k.id} onClick={() => { setKind(k.id); search(k.id); }}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${kind === k.id ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}>
            {k.label}
          </button>
        ))}
      </div>

      {!pos ? (
        <button onClick={locate} disabled={state === "loading"} className="fm-btn px-5 py-3">
          {state === "loading" ? "Finding you…" : "Find help near me"}
        </button>
      ) : (
        <iframe title="Map of your area" src={map!} className="h-56 w-full rounded-2xl border border-[var(--line)] sm:h-72" loading="lazy" />
      )}

      {msg && <p role="status" className={state === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}>{msg}</p>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {places.map((p) => (
          <li key={p.id} className="fm-card p-4">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{p.address}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {p.rating && <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1">★ {p.rating.toFixed(1)}</span>}
              {p.phone && <a href={`tel:${p.phone}`} className="fm-btn px-3 py-1.5">Call</a>}
              {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="fm-ghost px-3 py-1.5">Open in Maps</a>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
