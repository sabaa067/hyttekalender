export type Person = "grandfather" | "father" | "uncle";

export const PERSONS: { id: Person; label: string; color: string; soft: string; ring: string }[] = [
  {
    id: "grandfather",
    label: "Farfar",
    color: "bg-person-grandfather text-white",
    soft: "bg-person-grandfather-soft text-person-grandfather",
    ring: "ring-person-grandfather",
  },
  {
    id: "father",
    label: "Pappa",
    color: "bg-person-father text-white",
    soft: "bg-person-father-soft text-person-father",
    ring: "ring-person-father",
  },
  {
    id: "uncle",
    label: "Onkel",
    color: "bg-person-uncle text-white",
    soft: "bg-person-uncle-soft text-person-uncle",
    ring: "ring-person-uncle",
  },
];

export function personMeta(id: Person) {
  return PERSONS.find((p) => p.id === id)!;
}