import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { Goal } from "@prisma/client";
import { FOOD_BY_ID, FOODS, foodFilter, foodName, snapGrams } from "../nutrition/foods";
import { FOLLOW_UP_SYSTEM_PROMPT, MEAL_PLAN_SYSTEM_PROMPT } from "./prompts";
import { buildWeekMeals, dayTotals, mealFromItems, mealSplit, scaleDay, scaleMacros, withinTolerance } from "../nutrition/meals";
import type { DayType, Macros, PlanDay, Slot } from "../nutrition/types";
import type { Adjustment } from "../nutrition/adjust";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

// Demo mode: AI is off unless AI_ENABLED=true. Everything then uses the built-in
// meal builder, template follow-ups and manual InBody entry.
export const geminiEnabled = () => process.env.AI_ENABLED === "true" && Boolean(process.env.GEMINI_API_KEY);

let client: GoogleGenAI | null = null;
function ai() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return client;
}

type GenOptions = { temperature?: number; system?: string; thinking?: ThinkingLevel; timeoutMs?: number };

async function generateJson<T>(parts: object[], schema: object, opts: GenOptions = {}): Promise<T> {
  const res = await ai().models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature: opts.temperature ?? 0.4,
      systemInstruction: opts.system,
      thinkingConfig: { thinkingLevel: opts.thinking ?? ThinkingLevel.LOW },
      // Never let a slow model call hang a request; callers fall back to the built-in logic.
      httpOptions: { timeout: opts.timeoutMs ?? 60_000, retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 3 } },
    },
  });
  return JSON.parse(res.text ?? "{}") as T;
}

const lang = (locale: string) => (locale.startsWith("ar") ? "Egyptian Arabic (colloquial, عامية مصرية)" : "English");

/* ---------------- InBody extraction ---------------- */

export type InBodyExtraction = {
  isInBodySheet: boolean;
  confidence: number;
  weightKg: number | null;
  skeletalMuscleMassKg: number | null;
  bodyFatMassKg: number | null;
  bodyFatPct: number | null;
  fatFreeMassKg: number | null;
  bmrKcal: number | null;
  totalBodyWaterL: number | null;
  visceralFatLevel: number | null;
};

const num = { type: ["number", "null"] };

export async function extractInBody(image: Buffer, mimeType: string): Promise<InBodyExtraction> {
  const schema = {
    type: "object",
    properties: {
      isInBodySheet: { type: "boolean" },
      confidence: { type: "number", description: "0-1 confidence that values were read correctly" },
      weightKg: num, skeletalMuscleMassKg: num, bodyFatMassKg: num, bodyFatPct: num,
      fatFreeMassKg: num, bmrKcal: num, totalBodyWaterL: num, visceralFatLevel: num,
    },
    required: ["isInBodySheet", "confidence", "weightKg", "skeletalMuscleMassKg", "bodyFatMassKg", "bodyFatPct",
      "fatFreeMassKg", "bmrKcal", "totalBodyWaterL", "visceralFatLevel"],
  };
  const out = await generateJson<InBodyExtraction>([
    { inlineData: { mimeType, data: image.toString("base64") } },
    {
      text: `You are reading a body composition (InBody 270/570/770 or similar) result sheet.
Extract the CURRENT measured values only (not normal ranges, not history). Convert lb to kg if needed.
Fields: weight, skeletal muscle mass (SMM), body fat mass, percent body fat (PBF), fat free mass (FFM),
basal metabolic rate (BMR, kcal), total body water (TBW, L), visceral fat level.
If FFM is missing but weight and body fat mass exist, leave FFM null (the app computes it).
Use null for anything not visible. Set isInBodySheet=false if this is not a body composition report.`,
    },
  ], schema, { temperature: 0, timeoutMs: 45_000 });
  return out;
}

/* ---------------- Meal plans ---------------- */

type WeekMealOpts = {
  days: { day: string; type: DayType }[];
  targets: Record<DayType, Macros>;
  mealsPerDay: number;
  allergies: string[];
  dietaryPrefs: string[];
  supplements: string[];
  locale: string;
  weekNumber: number;
  sport: string;
  goal: Goal;
};

type GenMeal = { slot: Slot; name: string; items: { foodId: string; grams: number }[] };

// Free-tier friendly: few requests in flight at once.
const CONCURRENCY = Math.max(1, Number(process.env.GEMINI_CONCURRENCY) || 2);

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// Rotating suggestions so days generated in parallel still differ.
const BREAKFAST_BASES = ["ful with eish baladi", "eggs", "oats", "areesh cheese with eish baladi", "greek yogurt with fruit", "egg whites with toast", "ful and eggs"];
const LUNCH_PROTEINS = ["chicken-breast", "lean-beef", "tilapia", "beef-liver", "minced-beef", "shrimp", "lentils", "tuna"];

/**
 * One week of meals. Each day is a separate small request (fast, and a failed day falls back on its own).
 * Days the model can't produce in time use the deterministic builder.
 */
export async function generateWeekMealsAI(opts: WeekMealOpts): Promise<PlanDay[]> {
  const fallback = buildWeekMeals(opts);
  if (!geminiEnabled()) return fallback;

  const filter = foodFilter(opts.allergies, opts.dietaryPrefs, opts.supplements);
  const foods = FOODS.filter(filter);
  const shakes = foods.filter((f) => f.supplement);
  const lunchOptions = LUNCH_PROTEINS.filter((id) => foods.some((f) => f.id === id));
  const split = mealSplit(opts.mealsPerDay);
  const unitText = (f: (typeof foods)[number]) =>
    f.unit ? `1 ${f.unit.en} = ${f.unit.grams} g${f.unit.step < 1 ? ` (steps of ${f.unit.step})` : " (whole only)"}` : "grams, round to 5";
  const foodList = foods.map((f) => `${f.id} | ${f.nameEn} | ${f.kcal} ${f.proteinG} ${f.carbsG} ${f.fatG} | ${unitText(f)}`).join("\n");

  const schema = {
    type: "object",
    properties: {
      meals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slot: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] },
            name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: { foodId: { type: "string", enum: foods.map((f) => f.id) }, grams: { type: "number" } },
                required: ["foodId", "grams"],
              },
            },
          },
          required: ["slot", "name", "items"],
        },
      },
    },
    required: ["meals"],
  };

  const dayPrompt = (d: { day: string; type: DayType }, di: number) => {
    const t = opts.targets[d.type];
    const meals = split.map(([slot, share]) => {
      const m = scaleMacros(t, share);
      return `${slot}: ~${Math.round(m.kcal)} kcal, P${Math.round(m.proteinG)} C${Math.round(m.carbsG)} F${Math.round(m.fatG)}`;
    }).join("\n");
    const rot = di + opts.weekNumber * 7;
    return `Athlete: ${opts.sport}, goal ${opts.goal}. Plan ONE ${d.type === "TRAINING" ? "training" : "rest"} day (day ${di + 1} of week ${opts.weekNumber}).
Day target: ${t.kcal} kcal, protein ${t.proteinG} g, carbs ${t.carbsG} g, fat ${t.fatG} g.
Exactly ${split.length} meals in this order, with these per-meal targets:
${meals}
Variety for this day: breakfast based on ${BREAKFAST_BASES[rot % BREAKFAST_BASES.length]}${lunchOptions.length ? `; lunch main protein ${lunchOptions[rot % lunchOptions.length]}` : ""}.
${shakes.length
  ? `Supplements the athlete owns (use as shakes): ${shakes.map((f) => f.id).join(", ")}${d.type === "TRAINING" ? "; put the shake after training" : ""}.`
  : "No supplement products: whole foods only."}
Allowed foods (id | name | per 100 g: kcal P C F | portion):
${foodList}
Write each meal "name" in ${lang(opts.locale)}.`;
  };

  const days = await mapLimit(opts.days, CONCURRENCY, async (d, di): Promise<PlanDay> => {
    try {
      const res = await generateJson<{ meals: GenMeal[] }>([{ text: dayPrompt(d, di) }], schema, {
        temperature: 0.6, system: MEAL_PLAN_SYSTEM_PROMPT, timeoutMs: 45_000,
      });
      const meals = (res.meals ?? [])
        .map((m, mi) =>
          mealFromItems(
            { key: `${d.day}-${mi}`, slot: m.slot, name: m.name },
            m.items
              .filter((i) => FOOD_BY_ID.has(i.foodId) && filter(FOOD_BY_ID.get(i.foodId)!) && i.grams > 0)
              .map((i) => ({ foodId: i.foodId, food: foodName(FOOD_BY_ID.get(i.foodId)!, opts.locale), grams: snapGrams(i.foodId, i.grams) })),
          ),
        )
        .filter((m) => m.items.length > 0);
      if (meals.length !== split.length) return fallback[di];
      const day: PlanDay = { day: d.day, type: d.type, meals };
      // Server-side check: the model's arithmetic is never trusted.
      return withinTolerance(dayTotals(day), opts.targets[d.type]) ? day : scaleDay(day, opts.targets[d.type]);
    } catch (e) {
      console.error(`[gemini] day ${d.day} failed, using built-in meals:`, (e as Error).message?.slice(0, 200));
      return fallback[di];
    }
  });
  return days;
}

/* ---------------- Weekly follow-up ---------------- */

export async function writeFollowUpAI(input: {
  locale: string;
  name: string;
  goal: Goal;
  weekNumber: number;
  adjustment: Adjustment;
  adherence: number;
  trainingAdherence: number;
  energy: number;
  hunger: number;
  sleep: number;
  performance: number;
  notes?: string | null;
  newTraining: Macros;
  newRest: Macros;
}): Promise<string | null> {
  if (!geminiEnabled()) return null;
  try {
    const res = await generateJson<{ message: string }>([{
      text: `Write a short, motivating weekly check-in follow-up (max 90 words) for athlete ${input.name}, in ${lang(input.locale)}.
Goal: ${input.goal}. Week ${input.weekNumber} done.
Weight change: ${input.adjustment.ratePct}% (target ${input.adjustment.target.min}..${input.adjustment.target.max}%/week).
Decision: ${input.adjustment.reason}, calorie change ${input.adjustment.kcalDelta} kcal/day.
Diet adherence ${input.adherence}/10, training sessions done ${Math.round(input.trainingAdherence * 100)}%.
Energy ${input.energy}/10, hunger ${input.hunger}/10, sleep ${input.sleep}/10, performance ${input.performance}/10.
Athlete notes: ${input.notes || "none"}.
New targets — training day ${input.newTraining.kcal} kcal (P${input.newTraining.proteinG}), rest day ${input.newRest.kcal} kcal.
Explain the change in one sentence, give 2 concrete tips for next week. Do not invent numbers. No medical advice.`,
    }], { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    { temperature: 0.8, system: FOLLOW_UP_SYSTEM_PROMPT, timeoutMs: 30_000 });
    return res.message?.trim() || null;
  } catch (e) {
    console.error("[gemini] follow-up failed", e);
    return null;
  }
}
