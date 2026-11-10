import { FOOD_BY_ID, FOODS, foodFilter, foodName, snapGrams, type Food, type FoodFilter } from "./foods";
import { kcalFrom, sumMacros, type DayType, type GroceryItem, type Macros, type MealItem, type PlanDay, type PlanMeal, type Slot } from "./types";

/** Share of the day's macros for each meal, by meals per day. */
export const MEAL_SPLIT: Record<number, [Slot, number][]> = {
  3: [["BREAKFAST", 0.3], ["LUNCH", 0.4], ["DINNER", 0.3]],
  4: [["BREAKFAST", 0.25], ["LUNCH", 0.35], ["SNACK", 0.15], ["DINNER", 0.25]],
  5: [["BREAKFAST", 0.25], ["SNACK", 0.1], ["LUNCH", 0.3], ["SNACK", 0.1], ["DINNER", 0.25]],
  6: [["BREAKFAST", 0.2], ["SNACK", 0.1], ["LUNCH", 0.25], ["SNACK", 0.15], ["DINNER", 0.2], ["SNACK", 0.1]],
};

export function mealSplit(mealsPerDay: number) {
  return MEAL_SPLIT[Math.min(6, Math.max(3, mealsPerDay))];
}

export function itemMacros(foodId: string, grams: number): Macros {
  const f = FOOD_BY_ID.get(foodId);
  if (!f) return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const k = grams / 100;
  return { kcal: f.kcal * k, proteinG: f.proteinG * k, carbsG: f.carbsG * k, fatG: f.fatG * k };
}

export function roundMacros(m: Macros): Macros {
  return { kcal: Math.round(m.kcal), proteinG: Math.round(m.proteinG), carbsG: Math.round(m.carbsG), fatG: Math.round(m.fatG) };
}

export function mealFromItems(base: Omit<PlanMeal, keyof Macros | "items">, items: MealItem[]): PlanMeal {
  const m = roundMacros(sumMacros(items.map((i) => itemMacros(i.foodId, i.grams))));
  return { ...base, items, ...m };
}

const POOLS: Record<Slot, { protein: string[]; carb: string[]; fat: string[]; side?: string[] }> = {
  BREAKFAST: {
    protein: ["egg-whites", "greek-yogurt", "areesh", "eggs", "whey"],
    carb: ["oats", "eish-baladi", "ww-toast", "banana"],
    fat: ["peanut-butter", "almonds", "olive-oil", "tahini"],
  },
  LUNCH: {
    protein: ["chicken-breast", "lean-beef", "tilapia", "minced-beef", "beef-liver", "shrimp"],
    carb: ["white-rice", "pasta", "sweet-potato", "freekeh", "potato"],
    fat: ["olive-oil", "avocado", "tahini"],
    side: ["salad", "sauteed-veg", "molokhia", "okra"],
  },
  DINNER: {
    protein: ["tuna", "chicken-breast", "areesh", "greek-yogurt", "tilapia"],
    carb: ["eish-baladi", "potato", "ww-toast", "sweet-potato"],
    fat: ["olive-oil", "almonds", "avocado"],
    side: ["salad"],
  },
  SNACK: {
    protein: ["greek-yogurt", "areesh", "whey", "casein"],
    carb: ["banana", "dates", "apple", "guava", "orange", "mango", "mass-gainer"],
    fat: ["almonds", "peanut-butter", "mixed-nuts", "tahini"],
  },
};

// Plant/dairy-free fallbacks when restrictions empty a pool.
const FALLBACK = { protein: ["lentils", "ful", "hummus"], carb: ["white-rice", "potato", "banana"], fat: ["olive-oil", "avocado"] };

function allowedFoods(ids: string[], ok: FoodFilter) {
  return ids.map((id) => FOOD_BY_ID.get(id)!).filter((f) => f && ok(f));
}

function pick(list: Food[], i: number) {
  return list[i % list.length];
}

/** Snack shakes: whey after training, casein as the evening/rest-day snack. */
function shakeProtein(proteins: Food[], ctx: { slot: Slot; dayType: DayType; lastSnack: boolean }) {
  if (ctx.slot !== "SNACK") return undefined;
  const has = (id: string) => proteins.find((f) => f.id === id);
  if (ctx.lastSnack || ctx.dayType === "REST") return has("casein");
  return has("whey");
}

/** Grams of (protein, carb, fat) foods so P/C/F match the target: exact 3x3 solve, else best non-negative pair (least squares). */
export function solveGrams(foods: [Food, Food, Food], t: Pick<Macros, "proteinG" | "carbsG" | "fatG">): number[] {
  const col = foods.map((f) => [f.proteinG / 100, f.carbsG / 100, f.fatG / 100]);
  const b = [t.proteinG, t.carbsG, t.fatG];
  const M = [0, 1, 2].map((r) => [col[0][r], col[1][r], col[2][r]]);
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (Math.abs(D) > 1e-9) {
    const g = [0, 1, 2].map((c) => det(M.map((row, r) => row.map((v, j) => (j === c ? b[r] : v)))) / D);
    if (g.every((x) => x >= 0 && Number.isFinite(x))) return g;
  }
  // Weighted least squares over each pair (protein weighted x2), keep the best non-negative fit.
  const w = [2, 1, 1];
  let best: { g: number[]; err: number } = { g: [Math.max(0, b[0] / (col[0][0] || 1)), 0, 0], err: Infinity };
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
    let aa = 0, ab = 0, bb = 0, ay = 0, by = 0;
    for (let r = 0; r < 3; r++) {
      aa += w[r] * col[i][r] ** 2; bb += w[r] * col[j][r] ** 2; ab += w[r] * col[i][r] * col[j][r];
      ay += w[r] * col[i][r] * b[r]; by += w[r] * col[j][r] * b[r];
    }
    const d = aa * bb - ab * ab;
    if (Math.abs(d) < 1e-12) continue;
    const gi = (ay * bb - by * ab) / d;
    const gj = (by * aa - ay * ab) / d;
    if (gi < 0 || gj < 0) continue;
    const g = [0, 0, 0]; g[i] = gi; g[j] = gj;
    const err = [0, 1, 2].reduce((e, r) => e + w[r] * (col[0][r] * g[0] + col[1][r] * g[1] + col[2][r] * g[2] - b[r]) ** 2, 0);
    if (err < best.err) best = { g, err };
  }
  return best.g;
}

/** Portion granularity in grams (a whole egg is 50 g, chicken moves in 5 g). */
function stepOf(foodId: string) {
  const unit = FOOD_BY_ID.get(foodId)?.unit;
  return unit ? unit.grams * unit.step : 5;
}

/** After snapping to household units, close the calorie gap with the most finely adjustable item. */
function correctKcal(items: MealItem[], targetKcal: number) {
  if (!items.length) return;
  const total = sumMacros(items.map((i) => itemMacros(i.foodId, i.grams))).kcal;
  const gap = targetKcal - total;
  const flex = [...items].sort((a, b) => stepOf(a.foodId) - stepOf(b.foodId))[0];
  const perGram = (FOOD_BY_ID.get(flex.foodId)?.kcal ?? 0) / 100;
  if (perGram <= 0 || Math.abs(gap) < perGram * stepOf(flex.foodId)) return;
  flex.grams = snapGrams(flex.foodId, Math.max(stepOf(flex.foodId), flex.grams + gap / perGram));
}

export function buildMeal(opts: {
  key: string; slot: Slot; target: Macros; rotation: number; filter: FoodFilter; locale: string;
  dayType?: DayType; lastSnack?: boolean;
}): PlanMeal {
  const pool = POOLS[opts.slot];
  const ctx = { slot: opts.slot, dayType: opts.dayType ?? "REST", lastSnack: opts.lastSnack ?? false };
  const proteins = allowedFoods(pool.protein, opts.filter);
  const carbs = allowedFoods(pool.carb, opts.filter);
  const fats = allowedFoods(pool.fat, opts.filter);
  // Shakes are placed deliberately; regular rotation sticks to whole foods.
  const whole = (list: Food[]) => list.filter((f) => !f.supplement);
  const rotate = (list: Food[], fallback: string[], i: number) =>
    pick(whole(list).length ? whole(list) : list.length ? list : allowedFoods(fallback, opts.filter), i);
  const postWorkout = ctx.slot === "SNACK" && ctx.dayType === "TRAINING" && !ctx.lastSnack;
  const shakeCarb = postWorkout ? carbs.find((f) => f.id === "mass-gainer") : undefined;
  const p = shakeProtein(proteins, ctx)
    ?? (opts.slot === "BREAKFAST" && opts.rotation % 3 === 0 && proteins.some((f) => f.id === "whey") ? FOOD_BY_ID.get("whey")! : undefined)
    ?? rotate(proteins, FALLBACK.protein, opts.rotation);
  const c = shakeCarb ?? rotate(carbs, FALLBACK.carb, opts.rotation + 1);
  const f = rotate(fats, FALLBACK.fat, opts.rotation + 2);

  const items: MealItem[] = [];
  let remaining = { ...opts.target };
  const sides = pool.side ? allowedFoods(pool.side, opts.filter) : [];
  if (sides.length) {
    const side = pick(sides, opts.rotation);
    const sm = itemMacros(side.id, 150);
    items.push({ foodId: side.id, food: foodName(side, opts.locale), grams: 150 });
    remaining = { ...remaining, proteinG: remaining.proteinG - sm.proteinG, carbsG: remaining.carbsG - sm.carbsG, fatG: remaining.fatG - sm.fatG };
  }
  const grams = solveGrams([p, c, f], remaining);
  const solvedKcal = [p, c, f].reduce((a, food, i) => a + (food.kcal * grams[i]) / 100, 0);
  const k = solvedKcal > 0 ? Math.max(0.5, Math.min(1.5, (opts.target.kcal - sumMacros(items.map((x) => itemMacros(x.foodId, x.grams))).kcal) / solvedKcal)) : 1;
  const solved: MealItem[] = [];
  [p, c, f].forEach((food, i) => {
    const g = snapGrams(food.id, grams[i] * k);
    if (g > 0) solved.push({ foodId: food.id, food: foodName(food, opts.locale), grams: g });
  });
  correctKcal(solved, opts.target.kcal - sumMacros(items.map((x) => itemMacros(x.foodId, x.grams))).kcal);
  items.unshift(...solved);
  // Name by protein + carb (+ side); cooking oil isn't part of a dish name.
  const name = items.filter((i) => i.foodId !== "olive-oil").map((i) => i.food).slice(0, 3).join(" + ");
  return mealFromItems({ key: opts.key, slot: opts.slot, name }, items);
}

export function scaleMacros(m: Macros, share: number): Macros {
  return { kcal: m.kcal * share, proteinG: m.proteinG * share, carbsG: m.carbsG * share, fatG: m.fatG * share };
}

/** Deterministic 7-day meal plan for one week. */
export function buildWeekMeals(opts: {
  days: { day: string; type: DayType }[];
  targets: Record<DayType, Macros>;
  mealsPerDay: number;
  allergies: string[];
  dietaryPrefs: string[];
  supplements: string[];
  locale: string;
  weekNumber: number;
}): PlanDay[] {
  const filter = foodFilter(opts.allergies, opts.dietaryPrefs, opts.supplements);
  const split = mealSplit(opts.mealsPerDay);
  const lastSnackIdx = split.map(([slot]) => slot).lastIndexOf("SNACK");
  return opts.days.map((d, di) => ({
    day: d.day,
    type: d.type,
    meals: split.map(([slot, share], mi) =>
      buildMeal({
        key: `${d.day}-${mi}`,
        slot,
        target: scaleMacros(opts.targets[d.type], share),
        rotation: di + opts.weekNumber * 3 + mi,
        filter,
        locale: opts.locale,
        dayType: d.type,
        lastSnack: mi === lastSnackIdx && split.filter(([sl]) => sl === "SNACK").length > 1,
      }),
    ),
  }));
}

export function dayTotals(day: PlanDay): Macros {
  return sumMacros(day.meals);
}

/** Scale every portion in a day so total kcal matches the target. */
export function scaleDay(day: PlanDay, target: Macros): PlanDay {
  const total = dayTotals(day).kcal;
  if (total <= 0) return day;
  const k = target.kcal / total;
  return {
    ...day,
    meals: day.meals.map((m) =>
      mealFromItems(
        { key: m.key, slot: m.slot, name: m.name },
        (() => {
          const items = m.items.map((i) => ({ ...i, grams: snapGrams(i.foodId, i.grams * k) }));
          correctKcal(items, m.kcal * k);
          return items;
        })(),
      ),
    ),
  };
}

export function withinTolerance(actual: Macros, target: Macros, pct = 5) {
  return Math.abs(actual.kcal - target.kcal) <= (target.kcal * pct) / 100 &&
    Math.abs(actual.proteinG - target.proteinG) <= (target.proteinG * pct * 2) / 100;
}

export function groceryList(days: PlanDay[]): GroceryItem[] {
  const map = new Map<string, GroceryItem>();
  for (const d of days) for (const m of d.meals) for (const i of m.items) {
    const g = map.get(i.foodId) ?? { foodId: i.foodId, food: i.food, grams: 0 };
    g.grams += i.grams;
    map.set(i.foodId, g);
  }
  return [...map.values()].sort((a, b) => b.grams - a.grams);
}

export { kcalFrom, FOODS };
