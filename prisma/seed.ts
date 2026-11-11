import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { EXERCISES } from "../src/lib/training/library";
import { FOODS } from "../src/lib/nutrition/foods";
import { addDays, today } from "../src/lib/dates";

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
      name: "FUELX Demo FC U21", sport: "football", inviteCode: "DEMOTEAM", seats: 25, phase: "COMPETITION",
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
  await seedDemoTests(team.id);
  console.log("Seeded demo club (invite code DEMOTEAM)");
}

/** Two biomotor testing days for the demo squad (once): one 4 weeks ago, one today. */
async function seedDemoTests(teamId: string) {
  if (await db.biomotorAssignment.count({ where: { teamId } })) return;
  const coach = await db.user.findUniqueOrThrow({ where: { email: "coach@demo.fuelx.test" } });
  const [omar, youssef] = await Promise.all(
    ["athlete@demo.fuelx.test", "junior@demo.fuelx.test"].map((email) => db.user.findUniqueOrThrow({ where: { email } })),
  );
  const tests = ["cmj", "broad-jump", "sprint-10m", "sprint-30m", "t-test", "yoyo-ir1", "sit-and-reach"];
  const scores = {
    before: { [omar.id]: [41.5, 238, 1.86, 4.38, 9.9, 1520, 6], [youssef.id]: [44, 245, 1.81, 4.31, 10.2, 1360, 2.5] },
    now: { [omar.id]: [44, 246, 1.79, 4.29, 9.6, 1720, 8.5], [youssef.id]: [45.5, 244, 1.8, 4.33, 10.1, 1480, 3] },
  };
  for (const [key, title, offset] of [["before", "Pre-season testing", -28], ["now", "Mid-season testing", 0]] as const) {
    await db.biomotorAssignment.create({
      data: {
        teamId, createdById: coach.id, title, day: addDays(today(), offset), tests, notes: "15 min warm-up. Two attempts per test, best counts.",
        results: {
          create: Object.entries(scores[key]).flatMap(([athleteId, values]) =>
            tests.map((testId, i) => ({ athleteId, testId, value: values[i], recordedById: coach.id }))),
        },
      },
    });
  }
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
