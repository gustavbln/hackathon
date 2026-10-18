/** A shortlisted supplier as the driver page shows it. */
export interface DriverSupplier {
  id: string;
  name: string;
  /** Overall rank with the seat's weighting. */
  rank: number;
  /** Weighted risk with the seat's weighting. */
  risk: number;
  /** This driver's score, 0–100; null when unknown. */
  score: number | null;
}
