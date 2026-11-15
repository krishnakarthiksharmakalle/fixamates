"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import RepairResult from "@/components/RepairResult";
import RecipeResult from "@/components/RecipeResult";
import type { AssistantReply } from "@/lib/validation";

export default function ResultsPage() {
  const [items, setItems] = useState<AssistantReply[]>([]);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem("fm-results") ?? "[]")); } catch {}
  }, []);

  return (
    <div className="overflow-y-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Saved results</h1>
        {items.length > 0 && (
          <button className="fm-ghost px-3 py-2 text-sm" onClick={() => { localStorage.removeItem("fm-results"); setItems([]); }}>Clear all</button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-[var(--muted)]">Fixes and recipes you get from Fixmate show up here. <Link href="/" className="font-semibold underline">Ask something</Link></p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((r, i) => (
            <li key={i} className="fm-card p-4">
              <p>{r.reply}</p>
              {r.repair && <RepairResult data={r.repair} />}
              {r.recipe && <RecipeResult data={r.recipe} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
