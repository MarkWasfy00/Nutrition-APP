import type { Split } from "@prisma/client";

export type Muscle = "chest" | "back" | "shoulders" | "quads" | "hamstrings" | "glutes" | "biceps" | "triceps" | "calves";
export type Slot = { muscle: Muscle; compound: boolean };

const s = (muscle: Muscle, compound = false): Slot => ({ muscle, compound });

export const FOCUS_SLOTS: Record<string, Slot[]> = {
  PUSH: [s("chest", true), s("shoulders", true), s("chest"), s("shoulders"), s("triceps"), s("triceps")],
  PULL: [s("back", true), s("back", true), s("back"), s("biceps"), s("biceps"), s("shoulders")],
  LEGS: [s("quads", true), s("hamstrings", true), s("glutes", true), s("quads"), s("hamstrings"), s("calves")],
  UPPER: [s("chest", true), s("back", true), s("shoulders", true), s("back", true), s("chest"), s("biceps"), s("triceps")],
  LOWER: [s("quads", true), s("hamstrings", true), s("glutes", true), s("quads"), s("calves"), s("hamstrings")],
  FULL_A: [s("quads", true), s("chest", true), s("back", true), s("hamstrings", true), s("shoulders"), s("biceps")],
  FULL_B: [s("hamstrings", true), s("shoulders", true), s("back", true), s("chest", true), s("quads"), s("triceps")],
  CHEST: [s("chest", true), s("chest", true), s("chest"), s("chest"), s("triceps")],
  BACK: [s("back", true), s("back", true), s("back", true), s("back"), s("biceps")],
  SHOULDERS: [s("shoulders", true), s("shoulders"), s("shoulders"), s("shoulders", true), s("calves")],
  ARMS: [s("biceps"), s("triceps"), s("biceps"), s("triceps"), s("biceps"), s("triceps")],
  CHEST_BACK: [s("chest", true), s("back", true), s("chest", true), s("back", true), s("chest"), s("back")],
  SHOULDERS_ARMS: [s("shoulders", true), s("shoulders"), s("biceps"), s("triceps"), s("biceps"), s("triceps")],
};

/** Focus rotation; a week takes the first N entries (repeating the cycle). */
export const SPLIT_CYCLE: Record<Split, string[]> = {
  PPL: ["PUSH", "PULL", "LEGS"],
  UPPER_LOWER: ["UPPER", "LOWER"],
  FULL_BODY: ["FULL_A", "FULL_B"],
  BRO_SPLIT: ["CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS"],
  ARNOLD: ["CHEST_BACK", "SHOULDERS_ARMS", "LEGS"],
};

export function weekFocuses(split: Split, days: number) {
  const cycle = SPLIT_CYCLE[split];
  return Array.from({ length: days }, (_, i) => cycle[i % cycle.length]);
}

export const MAJOR_MUSCLES: Muscle[] = ["chest", "back", "shoulders", "quads", "hamstrings"];
