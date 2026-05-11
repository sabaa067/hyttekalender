import { PERSONS } from "@/lib/persons";

export function PersonLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
      {PERSONS.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-sm"
        >
          <span className={`h-3.5 w-3.5 rounded-full ${p.color}`} />
          <span className="text-base font-medium text-foreground">{p.label}</span>
        </div>
      ))}
    </div>
  );
}