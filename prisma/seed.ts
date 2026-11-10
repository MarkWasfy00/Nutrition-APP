import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { EXERCISES } from "../src/lib/training/library";
import { FOODS } from "../src/lib/nutrition/foods";

const db = new PrismaClient();

/**
 * Local demo club (never seeded in production). Test accounts:
 *   coach    coach@demo.fuelx.test     / demo-coach-123
 *   athlete  athlete@demo.fuelx.test   / demo-athlete-123  (adult, onboarded)
 *   athlete  junior@demo.fuelx.test    / demo-athlete-123  (17, waiting for guardian consent)
 * Invite link: /en/join/DEMOTEAM
 */
async function seedDemoClub() {
  const team = await db.team.upsert({
    where: { inviteCode: "DEMOTEAM" },
    create: {
      name: "FUELX Demo FC U21", sport: "football", inviteCode: "DEMOTEAM", seats: 25, phase: "IN_SEASON",
      practiceWeekdays: [0, 1, 2, 4], matchWeekdays: [5],
    },
    update: {},
  });
  const coachHash = await bcrypt.hash("demo-coach-123", 12);
  const athleteHash = await bcrypt.hash("demo-athlete-123", 12);
  await db.user.upsert({
    where: { email: "coach@demo.fuelx.test" },
    create: { email: "coach@demo.fuelx.test", name: "Demo Coach", passwordHash: coachHash, role: "COACH", teamId: team.id, locale: "en" },
    update: {},
  });
  const now = new Date();
  const yearsAgo = (y: number) => new Date(Date.UTC(now.getUTCFullYear() - y, 0, 15));
  for (const a of [
    { email: "athlete@demo.fuelx.test", name: "Omar Demo", birthDate: yearsAgo(22) },
    { email: "junior@demo.fuelx.test", name: "Youssef Junior", birthDate: new Date(Date.UTC(now.getUTCFullYear() - 17, now.getUTCMonth(), 1)) },
  ]) {
    const user = await db.user.upsert({
      where: { email: a.email },
      create: { email: a.email, name: a.name, passwordHash: athleteHash, role: "ATHLETE", teamId: team.id, locale: "en" },
      update: {},
    });
    await db.athleteProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, sport: "football", trainingDaysPerWeek: 6, intensity: "HIGH", sex: "MALE", birthDate: a.birthDate,
        heightCm: 178, goal: "PERFORMANCE", dietaryPrefs: [], allergies: [], mealsPerDay: 4,
      },
      update: {},
    });
    await db.trainingPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, weekdays: [0, 2, 3], sessionMinutes: 60, experience: "INTERMEDIATE", injuries: [] },
      update: {},
    });
  }
  // Simulated active subscription so the demo works with payments on (no Paymob needed).
  const end = new Date(now.getTime() + 30 * 86_400_000);
  await db.subscription.upsert({
    where: { teamId: team.id },
    create: { teamId: team.id, status: "ACTIVE", amountCents: 25 * 49_900, currentPeriodStart: now, currentPeriodEnd: end },
    update: {},
  });
  console.log("Seeded demo club (invite code DEMOTEAM)");
}

async function main() {
  for (const e of EXERCISES) {
    await db.exercise.upsert({ where: { id: e.id }, create: e, update: e });
  }
  for (const food of FOODS) {
    const f = { id: food.id, nameEn: food.nameEn, nameAr: food.nameAr, category: food.category, kcal: food.kcal, proteinG: food.proteinG, carbsG: food.carbsG, fatG: food.fatG };
    await db.foodItem.upsert({ where: { id: f.id }, create: f, update: f });
  }
  console.log(`Seeded ${EXERCISES.length} exercises and ${FOODS.length} foods`);
  if (process.env.NODE_ENV !== "production") await seedDemoClub();
}

main().finally(() => db.$disconnect());
