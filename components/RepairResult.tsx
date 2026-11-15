import Link from "next/link";
import type { RepairData } from "@/lib/validation";

const level = { easy: "Easy fix", moderate: "Takes some care", pro: "Call a pro" } as const;

export default function RepairResult({ data }: { data: RepairData }) {
  return (
    <section className="mt-3 rounded-xl bg-[var(--surface-2)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold">{data.title}</h3>
        <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-ink)]">{level[data.difficulty]}</span>
      </div>

      {data.safety && (
        <p className="mt-3 rounded-lg border border-[var(--danger)] p-3 text-sm text-[var(--danger)]"><strong>Safety first: </strong>{data.safety}</p>
      )}

      {data.tools.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-semibold">You&apos;ll need</h4>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {data.tools.map((t) => <li key={t} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-sm">{t}</li>)}
          </ul>
        </>
      )}

      <h4 className="mt-4 text-sm font-semibold">Steps</h4>
      <ol className="mt-1.5 list-decimal space-y-2 pl-5 text-sm leading-relaxed marker:font-semibold">
        {data.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>

      {data.difficulty === "pro" && (
        <Link href="/services" className="fm-btn mt-4 inline-block px-4 py-2 text-sm">Find a repair pro nearby</Link>
      )}
    </section>
  );
}
