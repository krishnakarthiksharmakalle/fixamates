import PricingCards from "@/components/PricingCards";

export default function PlansPage() {
  return (
    <div className="overflow-y-auto px-4 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
      <p className="mb-6 mt-1 text-[var(--muted)]">Start free. Upgrade when Fixmate becomes your go-to.</p>
      <PricingCards />
    </div>
  );
}
