import type { RecipeData } from "@/lib/validation";

export default function RecipeResult({ data }: { data: RecipeData }) {
  return (
    <section className="mt-3 rounded-xl bg-[var(--surface-2)] p-4">
      <h3 className="text-base font-bold">{data.title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{data.time} · serves {data.serves}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <h4 className="text-sm font-semibold">Ingredients</h4>
          <ul className="mt-1.5 space-y-1 text-sm">
            {data.ingredients.map((x) => (
              <li key={x} className="flex gap-2"><span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Method</h4>
          <ol className="mt-1.5 list-decimal space-y-2 pl-5 text-sm leading-relaxed marker:font-semibold">
            {data.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}
