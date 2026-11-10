import { generateWeekMealsAI, writeFollowUpAI } from "../src/lib/ai/gemini";
import { dayTotals } from "../src/lib/nutrition/meals";
import { portionLabel } from "../src/lib/nutrition/foods";
const targets = { TRAINING: { kcal: 2800, proteinG: 176, carbsG: 340, fatG: 78 }, REST: { kcal: 2100, proteinG: 176, carbsG: 186, fatG: 70 } };
const days = Array.from({ length: 7 }, (_, i) => ({ day: `2026-11-0${i + 1}`, type: (i % 3 === 2 ? "REST" : "TRAINING") as "REST" | "TRAINING" }));
let t0 = Date.now();
const week = await generateWeekMealsAI({ days, targets, mealsPerDay: 4, allergies: [], dietaryPrefs: [], supplements: ["WHEY"], locale: "ar-EG", weekNumber: 1, sport: "Football", goal: "CUT" });
console.log(`meal week: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const d of week) { const a = dayTotals(d), t = targets[d.type]; console.log(`${d.day} ${d.type.padEnd(8)} kcal ${a.kcal}/${t.kcal} (${(((a.kcal - t.kcal) / t.kcal) * 100).toFixed(1)}%)  P ${a.proteinG}/${t.proteinG}`); }
for (const d of week.slice(0, 2)) for (const m of d.meals) console.log(`  ${m.slot}: ${m.name} — ${m.items.map((i) => `${i.food} ${portionLabel(i.foodId, i.grams, "ar-EG")}`).join("، ")}`);
t0 = Date.now();
const msg = await writeFollowUpAI({ locale: "ar-EG", name: "أحمد", goal: "CUT", weekNumber: 1,
  adjustment: { reason: "TOO_SLOW_OR_GAINING", ratePct: 0, kcalDelta: -150, target: { min: -1, max: -0.5 } },
  adherence: 8, trainingAdherence: 0.83, energy: 7, hunger: 6, sleep: 7, performance: 7, notes: null,
  newTraining: { kcal: 2650, proteinG: 176, carbsG: 310, fatG: 73 }, newRest: { kcal: 1950, proteinG: 176, carbsG: 156, fatG: 65 } });
console.log(`\nfollow-up (${((Date.now() - t0) / 1000).toFixed(1)}s):`, msg);
