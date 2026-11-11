import type { SeasonPhase } from "@prisma/client";

/** Season phases in calendar order (classic periodization). Safe to import from client components. */
export const SEASON_PHASES = [
  "OFF_SEASON", "GENERAL_PREP", "SPECIFIC_PREP", "PRE_COMPETITION", "COMPETITION",
] as const satisfies readonly SeasonPhase[];
