const plans = [
  { name: "Free", price: "₹0", note: "For the odd fix", features: ["5 questions a day", "Text and photo input", "Basic recipes"], featured: false },
  { name: "Plus", price: "₹199", note: "per month", features: ["Unlimited questions", "Voice notes on your phone", "Saved results", "Nearby repair pros"], featured: true },
  { name: "Family", price: "₹349", note: "per month", features: ["Everything in Plus", "Up to 5 people", "Shared saved fixes and recipes"], featured: false },
];

export default function PricingCards() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => (
        <li key={p.name} className={`fm-card flex flex-col p-5 ${p.featured ? "border-2 border-[var(--accent)]" : ""}`}>
          <h2 className="text-lg font-bold">{p.name}</h2>
          <p className="mt-2"><span className="text-3xl font-bold">{p.price}</span> <span className="text-sm text-[var(--muted)]">{p.note}</span></p>
          <ul className="mt-4 flex-1 space-y-2 text-sm">
            {p.features.map((f) => <li key={f} className="flex gap-2"><span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />{f}</li>)}
          </ul>
          <button className={`mt-5 w-full py-2.5 ${p.featured ? "fm-btn" : "fm-ghost font-semibold"}`}>
            {p.price === "₹0" ? "Start free" : `Choose ${p.name}`}
          </button>
        </li>
      ))}
    </ul>
  );
}
