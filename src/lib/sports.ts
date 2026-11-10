/** Fixed list of competitive sports. Athletes and teams store the `id`. */

export type SportCategory = "TEAM" | "ENDURANCE" | "SPEED_POWER" | "COMBAT" | "RACKET" | "OTHER";

export type Sport = { id: string; nameEn: string; nameAr: string; category: SportCategory };

export const SPORTS: Sport[] = [
  { id: "football", nameEn: "Football", nameAr: "كرة القدم", category: "TEAM" },
  { id: "futsal", nameEn: "Futsal", nameAr: "كرة الصالات", category: "TEAM" },
  { id: "basketball", nameEn: "Basketball", nameAr: "كرة السلة", category: "TEAM" },
  { id: "handball", nameEn: "Handball", nameAr: "كرة اليد", category: "TEAM" },
  { id: "volleyball", nameEn: "Volleyball", nameAr: "الكرة الطائرة", category: "TEAM" },
  { id: "water-polo", nameEn: "Water polo", nameAr: "كرة الماء", category: "TEAM" },
  { id: "swimming", nameEn: "Swimming", nameAr: "السباحة", category: "ENDURANCE" },
  { id: "distance-running", nameEn: "Middle/long-distance running", nameAr: "جري المسافات المتوسطة والطويلة", category: "ENDURANCE" },
  { id: "cycling", nameEn: "Cycling", nameAr: "الدراجات", category: "ENDURANCE" },
  { id: "rowing", nameEn: "Rowing", nameAr: "التجديف", category: "ENDURANCE" },
  { id: "triathlon", nameEn: "Triathlon", nameAr: "الترايثلون", category: "ENDURANCE" },
  { id: "sprints-jumps-throws", nameEn: "Sprints, jumps & throws", nameAr: "العدو والوثب والرمي", category: "SPEED_POWER" },
  { id: "boxing", nameEn: "Boxing", nameAr: "الملاكمة", category: "COMBAT" },
  { id: "wrestling", nameEn: "Wrestling", nameAr: "المصارعة", category: "COMBAT" },
  { id: "judo", nameEn: "Judo", nameAr: "الجودو", category: "COMBAT" },
  { id: "karate", nameEn: "Karate", nameAr: "الكاراتيه", category: "COMBAT" },
  { id: "taekwondo", nameEn: "Taekwondo", nameAr: "التايكوندو", category: "COMBAT" },
  { id: "kickboxing", nameEn: "Kickboxing", nameAr: "الكيك بوكسينج", category: "COMBAT" },
  { id: "tennis", nameEn: "Tennis", nameAr: "التنس", category: "RACKET" },
  { id: "squash", nameEn: "Squash", nameAr: "الإسكواش", category: "RACKET" },
  { id: "table-tennis", nameEn: "Table tennis", nameAr: "تنس الطاولة", category: "RACKET" },
  { id: "fencing", nameEn: "Fencing", nameAr: "المبارزة", category: "OTHER" },
  { id: "gymnastics", nameEn: "Gymnastics", nameAr: "الجمباز", category: "OTHER" },
];

export const SPORT_IDS = SPORTS.map((s) => s.id) as [string, ...string[]];
const BY_ID = new Map(SPORTS.map((s) => [s.id, s]));

export const sportById = (id: string | null | undefined) => (id ? BY_ID.get(id) : undefined);
export const isSportId = (id: string) => BY_ID.has(id);

/** Unknown ids (e.g. old free-text values) fall back to the team-sport profile. */
export const sportCategory = (id: string | null | undefined): SportCategory => sportById(id)?.category ?? "TEAM";

export const sportName = (id: string | null | undefined, locale: string) => {
  const s = sportById(id);
  if (!s) return id ?? "";
  return locale.startsWith("ar") ? s.nameAr : s.nameEn;
};
