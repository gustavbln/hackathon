export const CABIN_SEATS = Array.from({ length: 4 }, (_, row) =>
  [-1.38, -0.78, 0.78, 1.38].map((x, column) => ({
    id: `${row + 1}${"ABCD"[column]}`,
    position: [x, 0, 1.5 - row * 1.8] as [number, number, number],
  })),
).flat();

export type CabinSelection = {
  selectedSeatId: string | null;
  onSeatSelect: (id: string | null) => void;
};
