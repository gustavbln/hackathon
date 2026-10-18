import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CRITERIA } from "./criteria";
import { COMPLEXITY_LEVELS, SOURCING_RISK_LEVELS, type Scores, type Supplier } from "./types";

const DATASET_PATH = path.join(process.cwd(), "data", "supplier_risk_dataset.csv");

let cache: Promise<Supplier[]> | undefined;

/** All dataset suppliers, parsed once per server process. */
export function loadDatasetSuppliers(): Promise<Supplier[]> {
  cache ??= readFile(DATASET_PATH, "utf8")
    .then(parseDataset)
    .catch((error: unknown) => {
      cache = undefined;
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        throw new Error("The supplier dataset is missing. Copy supplier_risk_dataset.csv into data/.");
      }
      throw error;
    });
  return cache;
}

function parseDataset(csv: string): Supplier[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  const header = headerLine.split(",");
  const column = (name: string) => {
    const index = header.indexOf(name);
    if (index === -1) throw new Error(`The supplier dataset has no "${name}" column.`);
    return index;
  };

  const id = column("supplierID");
  const name = column("Supplier Name");
  const scoreColumns = CRITERIA.map((criterion) => [criterion.key, column(criterion.column)] as const);
  const volume = column("Purchase Order Volume (EUR)");
  const changeRate = column("Order Change Rate");
  const delivery = column("Supplier Delivery Rating");
  const confirmation = column("Order Confirmation Rate");
  const sourcing = column("Sourcing Risk Level");
  const complexity = column("Supply Chain Complexity");

  return lines.map((line, index) => {
    // No field contains a comma or quotes, so a plain split is exact.
    const cells = line.split(",");
    if (cells.length !== header.length) {
      throw new Error(`Dataset row ${index + 2} has ${cells.length} fields, expected ${header.length}.`);
    }
    return {
      id: cells[id],
      name: cells[name],
      origin: "dataset",
      scores: Object.fromEntries(scoreColumns.map(([key, i]) => [key, Number(cells[i])])) as Scores,
      operations: {
        purchaseOrderVolumeEur: Number(cells[volume]),
        orderChangeRate: Number(cells[changeRate]),
        deliveryRating: Number(cells[delivery]),
        confirmationRate: Number(cells[confirmation]),
        sourcingRisk: oneOf(cells[sourcing], SOURCING_RISK_LEVELS),
        complexity: oneOf(cells[complexity], COMPLEXITY_LEVELS),
      },
    };
  });
}

function oneOf<const T extends readonly string[]>(value: string, allowed: T): T[number] {
  const match = allowed.find((option) => option === value);
  if (match === undefined) throw new Error(`Unexpected dataset value "${value}".`);
  return match;
}
