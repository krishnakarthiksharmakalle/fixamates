import ServiceMap from "@/components/ServiceMap";

export default function ServicesPage() {
  return (
    <div className="overflow-y-auto px-4 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Nearby help</h1>
      <p className="mb-5 mt-1 text-[var(--muted)]">Some jobs are best left to a pro. Find one close to you.</p>
      <ServiceMap />
    </div>
  );
}
