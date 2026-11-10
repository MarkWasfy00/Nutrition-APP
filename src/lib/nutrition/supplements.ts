import type { DayType } from "./types";

export const SUPPLEMENT_IDS = [
  "WHEY", "CASEIN", "MASS_GAINER", "CREATINE", "OMEGA3", "VITAMIN_D", "MULTIVITAMIN", "CAFFEINE", "ELECTROLYTES",
] as const;
export type SupplementId = (typeof SUPPLEMENT_IDS)[number];

type Text = { en: string; ar: string };

export type Supplement = {
  id: SupplementId;
  name: Text;
  /** Caloric supplements are foods built into meals; the rest are a daily schedule. */
  foodId?: string;
  trainingDaysOnly?: boolean;
  dose: (weightKg: number) => Text;
};

export const SUPPLEMENTS: Supplement[] = [
  {
    id: "WHEY", name: { en: "Whey protein", ar: "واي بروتين" }, foodId: "whey",
    dose: () => ({ en: "Shake in your meals: after training on training days", ar: "شيك ضمن وجباتك: بعد التمرين في أيام التمرين" }),
  },
  {
    id: "CASEIN", name: { en: "Casein protein", ar: "كازين بروتين" }, foodId: "casein",
    dose: () => ({ en: "Shake in your meals: evening snack", ar: "شيك ضمن وجباتك: سناك بالليل" }),
  },
  {
    id: "MASS_GAINER", name: { en: "Mass gainer", ar: "ماس جينر" }, foodId: "mass-gainer",
    dose: () => ({ en: "Shake in your meals: post-workout on training days", ar: "شيك ضمن وجباتك: بعد التمرين في أيام التمرين" }),
  },
  {
    id: "CREATINE", name: { en: "Creatine monohydrate", ar: "كرياتين مونوهيدرات" },
    dose: (kg) => (kg < 60
      ? { en: "3 g daily with any meal, including rest days", ar: "٣ جم كل يوم مع أي وجبة، حتى أيام الراحة" }
      : { en: "5 g daily with any meal, including rest days", ar: "٥ جم كل يوم مع أي وجبة، حتى أيام الراحة" }),
  },
  {
    id: "OMEGA3", name: { en: "Omega-3 (fish oil)", ar: "أوميجا ٣" },
    dose: () => ({ en: "1–2 g EPA+DHA with a meal", ar: "١–٢ جم EPA+DHA مع الأكل" }),
  },
  {
    id: "VITAMIN_D", name: { en: "Vitamin D3", ar: "فيتامين د٣" },
    dose: () => ({ en: "1,000–2,000 IU with a meal that has fat", ar: "١٠٠٠–٢٠٠٠ وحدة مع وجبة فيها دهون" }),
  },
  {
    id: "MULTIVITAMIN", name: { en: "Multivitamin", ar: "مالتي فيتامين" },
    dose: () => ({ en: "1 serving with breakfast", ar: "جرعة واحدة مع الفطار" }),
  },
  {
    id: "CAFFEINE", name: { en: "Caffeine / pre-workout", ar: "كافيين / بري وركاوت" }, trainingDaysOnly: true,
    dose: (kg) => {
      const mg = Math.min(400, Math.round((3 * kg) / 25) * 25);
      return {
        en: `${mg} mg, 30–60 min before training. Skip it within 6 h of bedtime`,
        ar: `${new Intl.NumberFormat("ar-EG").format(mg)} مجم قبل التمرين بـ ٣٠–٦٠ دقيقة. ماتاخدوش قبل النوم بأقل من ٦ ساعات`,
      };
    },
  },
  {
    id: "ELECTROLYTES", name: { en: "Electrolytes", ar: "أملاح (إلكتروليتس)" }, trainingDaysOnly: true,
    dose: () => ({
      en: "During sessions over 60 min or in heat: 500–700 mg sodium per litre of water",
      ar: "في التمرين الأطول من ساعة أو في الحر: ٥٠٠–٧٠٠ مجم صوديوم لكل لتر مية",
    }),
  },
];

export const SUPPLEMENT_BY_ID = new Map(SUPPLEMENTS.map((s) => [s.id, s]));

export function sanitizeSupplements(ids: string[]): SupplementId[] {
  return [...new Set(ids)].filter((id): id is SupplementId => SUPPLEMENT_BY_ID.has(id as SupplementId));
}

/** The athlete's allowed supplements (empty = food-only plan). */
export function allowedSupplements(profile: { useSupplements: boolean; supplements: string[] }) {
  return profile.useSupplements ? sanitizeSupplements(profile.supplements) : [];
}

export type ScheduleItem = { id: SupplementId; name: string; dose: string; inMeals: boolean };

/** What to take on a given day type, in the athlete's language. */
export function supplementSchedule(ids: string[], weightKg: number, dayType: DayType | null, locale: string): ScheduleItem[] {
  const lang = locale.startsWith("ar") ? "ar" : "en";
  return sanitizeSupplements(ids)
    .map((id) => SUPPLEMENT_BY_ID.get(id)!)
    .filter((s) => !(s.trainingDaysOnly && dayType === "REST"))
    .map((s) => ({ id: s.id, name: s.name[lang], dose: s.dose(weightKg)[lang], inMeals: !!s.foodId }));
}
