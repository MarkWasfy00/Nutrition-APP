/** Accepted [min, max] for each InBody field. Shared by the form (input limits) and the save action (validation). */
export const SCAN_RANGES = {
  weightKg: [30, 250],
  bodyFatPct: [2, 70],
  skeletalMuscleMassKg: [5, 120],
  bodyFatMassKg: [1, 150],
  fatFreeMassKg: [20, 150],
  bmrKcal: [800, 4000],
  totalBodyWaterL: [10, 100],
  visceralFatLevel: [1, 30],
} as const satisfies Record<string, readonly [number, number]>;

export type ScanField = keyof typeof SCAN_RANGES;
