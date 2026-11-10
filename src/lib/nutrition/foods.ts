/**
 * Seeded foods, macros per 100 g (cooked/ready-to-eat unless noted).
 * Values are reference averages (USDA FoodData Central, Egyptian food composition data);
 * household unit weights are typical averages for products sold in Egypt.
 */
export type Tag = "DAIRY" | "EGGS" | "NUTS" | "GLUTEN" | "SEAFOOD" | "MEAT" | "POULTRY";
export type Food = {
  id: string; nameEn: string; nameAr: string; category: string;
  kcal: number; proteinG: number; carbsG: number; fatG: number; tags: Tag[];
  /** Set for supplement products: only used in plans when the athlete allows this supplement. */
  supplement?: string;
  /** Household unit with a known weight; plans use whole (or `step`-fraction) units. */
  unit?: Unit;
};

export type Unit = { en: string; ar: string; grams: number; step: number };

type Row = [string, string, string, string, number, number, number, number, Tag[]?];

const ROWS: Row[] = [
  // protein
  ["chicken-breast", "Grilled chicken breast", "صدور فراخ مشوية", "protein", 165, 31, 0, 3.6, ["POULTRY"]],
  ["lean-beef", "Lean beef (cooked)", "لحمة بقري قليلة الدهن", "protein", 217, 26, 0, 12, ["MEAT"]],
  ["minced-beef", "Minced beef 10% (cooked)", "لحمة مفرومة", "protein", 250, 26, 0, 15, ["MEAT"]],
  ["beef-liver", "Beef liver (kebda)", "كبدة", "protein", 175, 27, 5, 5, ["MEAT"]],
  ["tuna", "Tuna in water", "تونة مصفاة", "protein", 116, 26, 0, 1, ["SEAFOOD"]],
  ["tilapia", "Grilled tilapia (bolti)", "سمك بلطي مشوي", "protein", 128, 26, 0, 2.7, ["SEAFOOD"]],
  ["shrimp", "Shrimp", "جمبري", "protein", 99, 24, 0.2, 0.3, ["SEAFOOD"]],
  ["sardines", "Sardines (canned)", "سردين", "protein", 208, 25, 0, 11, ["SEAFOOD"]],
  ["eggs", "Whole eggs", "بيض", "protein", 143, 12.6, 0.7, 9.5, ["EGGS"]],
  ["egg-whites", "Egg whites", "بياض بيض", "protein", 52, 11, 0.7, 0.2, ["EGGS"]],
  ["greek-yogurt", "Greek yogurt 0%", "زبادي يوناني لايت", "protein", 59, 10, 3.6, 0.4, ["DAIRY"]],
  ["areesh", "Areesh cheese", "جبنة قريش", "protein", 85, 13, 3, 2, ["DAIRY"]],
  ["whey", "Whey protein", "واي بروتين", "supplement", 400, 80, 8, 6, ["DAIRY"]],
  ["casein", "Casein protein", "كازين بروتين", "supplement", 360, 78, 6, 2, ["DAIRY"]],
  ["mass-gainer", "Mass gainer", "ماس جينر", "supplement", 380, 20, 68, 3.5, ["DAIRY"]],
  ["chicken-shawarma", "Chicken shawarma (no bread)", "شاورما فراخ", "protein", 200, 20, 6, 11, ["POULTRY"]],
  // legumes / Egyptian staples
  ["ful", "Ful medames", "فول مدمس", "legumes", 125, 7.5, 18, 2.5],
  ["lentils", "Lentils (cooked)", "عدس", "legumes", 116, 9, 20, 0.4],
  ["hummus", "Hummus with tahini", "حمص بالطحينة", "legumes", 166, 8, 14, 9.6],
  ["taameya", "Ta'meya", "طعمية", "legumes", 333, 13, 32, 18],
  ["koshari", "Koshari", "كشري", "carbs", 160, 5, 28, 3.5, ["GLUTEN"]],
  // carbs
  ["eish-baladi", "Eish baladi", "عيش بلدي", "carbs", 250, 9, 50, 1.5, ["GLUTEN"]],
  ["white-rice", "White rice (cooked)", "رز أبيض مطبوخ", "carbs", 130, 2.7, 28, 0.3],
  ["pasta", "Pasta (cooked)", "مكرونة مسلوقة", "carbs", 158, 5.8, 31, 0.9, ["GLUTEN"]],
  ["oats", "Oats (dry)", "شوفان", "carbs", 389, 17, 66, 7],
  ["sweet-potato", "Sweet potato (baked)", "بطاطا مشوية", "carbs", 90, 2, 21, 0.2],
  ["potato", "Potatoes (boiled)", "بطاطس مسلوقة", "carbs", 87, 1.9, 20, 0.1],
  ["freekeh", "Freekeh (cooked)", "فريك", "carbs", 130, 5.5, 25, 1, ["GLUTEN"]],
  ["ww-toast", "Brown toast", "توست أسمر", "carbs", 247, 13, 41, 3.4, ["GLUTEN"]],
  ["banana", "Banana", "موز", "fruit", 89, 1.1, 23, 0.3],
  ["dates", "Dates", "بلح", "fruit", 282, 2.5, 75, 0.4],
  ["apple", "Apple", "تفاح", "fruit", 52, 0.3, 14, 0.2],
  ["orange", "Orange", "برتقان", "fruit", 47, 0.9, 12, 0.1],
  ["guava", "Guava", "جوافة", "fruit", 68, 2.6, 14, 1],
  ["mango", "Mango", "مانجا", "fruit", 60, 0.8, 15, 0.4],
  ["honey", "Honey", "عسل نحل", "carbs", 304, 0.3, 82, 0],
  ["molasses", "Black molasses", "عسل أسود", "carbs", 290, 0, 75, 0.1],
  // vegetables
  ["salad", "Green salad", "سلطة خضرا", "veg", 20, 1, 4, 0.2],
  ["sauteed-veg", "Sautéed vegetables", "خضار سوتيه", "veg", 65, 2.5, 9, 2.5],
  ["molokhia", "Molokhia", "ملوخية", "veg", 50, 3, 6, 2],
  ["okra", "Okra stew (bamia)", "بامية", "veg", 90, 2.5, 9, 5],
  // fats
  ["olive-oil", "Olive oil", "زيت زيتون", "fat", 884, 0, 0, 100],
  ["peanut-butter", "Peanut butter", "زبدة فول سوداني", "fat", 588, 25, 20, 50, ["NUTS"]],
  ["tahini", "Tahini", "طحينة", "fat", 595, 17, 21, 54],
  ["almonds", "Almonds", "لوز", "fat", 579, 21, 22, 50, ["NUTS"]],
  ["mixed-nuts", "Mixed nuts", "مكسرات مشكلة", "fat", 607, 20, 21, 54, ["NUTS"]],
  ["avocado", "Avocado", "أفوكادو", "fat", 160, 2, 9, 15],
  // dairy
  ["milk-low-fat", "Low-fat milk", "لبن قليل الدسم", "dairy", 42, 3.4, 5, 1, ["DAIRY"]],
  ["milk-full", "Full-fat milk", "لبن كامل الدسم", "dairy", 61, 3.2, 4.8, 3.3, ["DAIRY"]],
  ["zabadi", "Plain yogurt", "زبادي", "dairy", 61, 3.5, 4.7, 3.3, ["DAIRY"]],
  ["domiati", "Domiati cheese", "جبنة دمياطي", "dairy", 240, 15, 3, 19, ["DAIRY"]],
  ["mozzarella-light", "Light mozzarella", "موتزاريلا لايت", "dairy", 254, 24, 3, 16, ["DAIRY"]],
];

const SUPPLEMENT_OF_FOOD: Record<string, string> = { whey: "WHEY", casein: "CASEIN", "mass-gainer": "MASS_GAINER" };

const u = (en: string, ar: string, grams: number, step = 1): Unit => ({ en, ar, grams, step });
const TBSP = (g: number) => u("tbsp", "معلقة كبيرة", g, 0.5);

/** Known household portions (edible weight). */
const UNITS: Record<string, Unit> = {
  eggs: u("egg", "بيضة", 50),
  "egg-whites": u("egg white", "بياض بيضة", 33),
  "eish-baladi": u("loaf", "رغيف", 90, 0.5),
  "ww-toast": u("slice", "شريحة", 28),
  banana: u("medium banana", "موزة متوسطة", 120),
  apple: u("medium apple", "تفاحة متوسطة", 180),
  orange: u("medium orange", "برتقانة متوسطة", 130),
  guava: u("guava", "جوافة", 100),
  dates: u("date", "بلحاية", 8),
  mango: u("cup diced", "كوب مكعبات", 165, 0.5),
  "white-rice": u("cup", "كوب", 160, 0.25),
  pasta: u("cup", "كوب", 140, 0.25),
  freekeh: u("cup", "كوب", 160, 0.25),
  lentils: u("cup", "كوب", 200, 0.25),
  ful: u("cup", "كوب", 170, 0.25),
  oats: u("cup", "كوب", 80, 0.25),
  "milk-low-fat": u("cup", "كوباية", 245, 0.5),
  "milk-full": u("cup", "كوباية", 245, 0.5),
  potato: u("medium potato", "بطاطساية متوسطة", 170, 0.5),
  "olive-oil": TBSP(13.5),
  tahini: TBSP(15),
  "peanut-butter": TBSP(16),
  honey: TBSP(21),
  molasses: TBSP(20),
  almonds: u("handful", "حفنة", 28, 0.5),
  "mixed-nuts": u("handful", "حفنة", 28, 0.5),
  whey: u("scoop", "سكوب", 30, 0.5),
  casein: u("scoop", "سكوب", 30, 0.5),
  "mass-gainer": u("scoop", "سكوب", 75, 0.5),
};

export const FOODS: Food[] = ROWS.map(([id, nameEn, nameAr, category, kcal, proteinG, carbsG, fatG, tags]) => ({
  id, nameEn, nameAr, category, kcal, proteinG, carbsG, fatG, tags: tags ?? [], supplement: SUPPLEMENT_OF_FOOD[id], unit: UNITS[id],
}));

export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export const ALLERGIES = ["DAIRY", "EGGS", "NUTS", "GLUTEN", "SEAFOOD"] as const;
export const DIET_PREFS = ["VEGETARIAN", "NO_RED_MEAT"] as const;

export function excludedTags(allergies: string[], prefs: string[]): Set<Tag> {
  const out = new Set<Tag>(allergies as Tag[]);
  if (prefs.includes("VEGETARIAN")) ["MEAT", "POULTRY", "SEAFOOD"].forEach((t) => out.add(t as Tag));
  if (prefs.includes("NO_RED_MEAT")) out.add("MEAT");
  return out;
}

export type FoodFilter = (f: Food) => boolean;

/** Foods usable in a plan: no excluded tags, and supplement products only when allowed. */
export function foodFilter(allergies: string[], prefs: string[], supplements: string[]): FoodFilter {
  const banned = excludedTags(allergies, prefs);
  const allowed = new Set(supplements);
  return (f) => !f.tags.some((t) => banned.has(t)) && (!f.supplement || allowed.has(f.supplement));
}

export function foodName(f: { nameEn: string; nameAr: string }, locale: string) {
  return locale.startsWith("ar") ? f.nameAr : f.nameEn;
}

/** Rounds grams to the food's practical portion (whole eggs, half loaves, ½ tbsp...) or to 5 g. */
export function snapGrams(foodId: string, grams: number) {
  const unit = FOOD_BY_ID.get(foodId)?.unit;
  if (grams <= 0) return 0;
  if (!unit) return Math.max(5, Math.round(grams / 5) * 5);
  const stepG = unit.grams * unit.step;
  return Math.round(Math.max(1, Math.round(grams / stepG)) * stepG * 10) / 10;
}

/** "2 eggs (100 g)" style label; grams only for foods without a household unit. */
export function portionLabel(foodId: string, grams: number, locale: string) {
  const ar = locale.startsWith("ar");
  const unit = FOOD_BY_ID.get(foodId)?.unit;
  const g = Math.round(grams);
  if (!unit) return ar ? `${g} جم` : `${g} g`;
  const count = Math.round((grams / unit.grams) * 4) / 4;
  const fmt = new Intl.NumberFormat(ar ? "ar-EG" : "en", { maximumFractionDigits: 2 }).format(count);
  return ar ? `${fmt} ${unit.ar} (${g} جم)` : `${fmt} ${unit.en} (${g} g)`;
}
