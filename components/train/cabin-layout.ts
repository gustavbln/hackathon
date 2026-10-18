export const CABIN_LENGTH = 16.2;
export const CABIN_CENTER = -3.3;

export const CABIN_SEATS = Array.from({ length: 10 }, (_, row) =>
  [-1.38, -0.78, 0.78, 1.38].map((x, column) => ({
    id: `${row + 1}${"ABCD"[column]}`,
    position: [x, 0, 2.4 - row * 1.35] as [number, number, number],
  })),
).flat();

/** Clickable cabin parts besides seats. Seats are analysed; these open a labelled preview only. */
export const CABIN_COMPONENTS = [
  { id: "windows", label: "Side windows" },
  { id: "door", label: "Interior door" },
  { id: "flooring", label: "Flooring" },
] as const;

export type CabinComponentId = (typeof CABIN_COMPONENTS)[number]["id"];

export type CabinSelection = {
  selectedSeatId: string | null;
  onSeatSelect: (id: string | null) => void;
  selectedComponentId: CabinComponentId | null;
  onComponentSelect: (id: CabinComponentId | null) => void;
};
