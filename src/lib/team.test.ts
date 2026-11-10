import { describe, expect, it } from "vitest";
import { hasFreeSeat, needsConsent, newInviteCode, subscriptionAmount, topUpAmount } from "./team";
import { hasAccess } from "./subscription";
import { athleteStatus, weeklyWeightChange } from "./coach";
import { allowedSupplements } from "./nutrition/supplements";
import { calculateTargets, goalAdjustPct } from "./nutrition/calc";
import { SPORTS, sportCategory } from "./sports";

const NOW = new Date("2026-11-10T12:00:00Z");
const DAY = 86_400_000;

describe("seat pricing", () => {
  it("charges seats x price per athlete", () => {
    expect(subscriptionAmount(20, 49_900)).toBe(998_000);
  });

  it("charges added seats pro rata for the days left", () => {
    const end = new Date(NOW.getTime() + 15 * DAY);
    expect(topUpAmount(4, 30_000, end, NOW)).toBe(60_000); // 4 seats x 300 EGP x 15/30
    expect(topUpAmount(1, 30_000, new Date(NOW.getTime() - DAY), NOW)).toBe(1_000); // at least one day
    expect(topUpAmount(0, 30_000, end, NOW)).toBe(0);
  });

  it("blocks joining a full team unless payments are off", () => {
    expect(hasFreeSeat(10, 9, false)).toBe(true);
    expect(hasFreeSeat(10, 10, false)).toBe(false);
    expect(hasFreeSeat(0, 50, true)).toBe(true);
  });

  it("invite codes are 8 unambiguous characters", () => {
    const code = newInviteCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("team access follows the subscription period and grace", () => {
    expect(hasAccess({ status: "ACTIVE", currentPeriodEnd: new Date(NOW.getTime() + DAY), graceUntil: null }, NOW)).toBe(true);
    expect(hasAccess({ status: "PAST_DUE", currentPeriodEnd: NOW, graceUntil: new Date(NOW.getTime() - 1) }, NOW)).toBe(false);
  });
});

describe("age rules", () => {
  const born = (years: number) => new Date(Date.UTC(NOW.getUTCFullYear() - years, 0, 1));

  it("16-17 year olds need guardian consent, adults don't", () => {
    expect(needsConsent(born(17), NOW)).toBe(true);
    expect(needsConsent(born(19), NOW)).toBe(false);
  });

  it("under-18 cut is capped at a 10% deficit", () => {
    expect(goalAdjustPct("CUT", "MALE", 25, 17)).toBe(-10);
    expect(goalAdjustPct("CUT", "MALE", 25, 25)).toBe(-20);
    const r = calculateTargets({ weightKg: 70, heightCm: 175, ageYears: 17, sex: "MALE", goal: "CUT", trainingDaysPerWeek: 5, intensity: "HIGH", sport: "football" });
    expect(r.goalAdjustPct).toBe(-10);
  });

  it("never plans caffeine or mass gainers for under-18s", () => {
    const owned = { useSupplements: true, supplements: ["WHEY", "CAFFEINE", "MASS_GAINER", "CREATINE"] };
    expect(allowedSupplements({ ...owned, birthDate: born(17) })).toEqual(["WHEY", "CREATINE"]);
    expect(allowedSupplements({ ...owned, birthDate: born(25) })).toHaveLength(4);
  });
});

describe("coach dashboard status", () => {
  const adult = { birthDate: new Date("2000-01-01"), consentConfirmedAt: null };

  it("walks through onboarding, consent, scan and plan", () => {
    expect(athleteStatus({ profile: null, plan: null }).kind).toBe("ONBOARDING");
    expect(athleteStatus({ profile: { birthDate: new Date(Date.UTC(2026 - 17, 0, 1)), consentConfirmedAt: null }, plan: null }).kind).toBe("CONSENT");
    expect(athleteStatus({ profile: adult, plan: null }).kind).toBe("SCAN");
    expect(athleteStatus({ profile: adult, plan: { startDay: "2026-11-01", checkInWeeks: [] }, day: "2026-11-03" })).toEqual({ kind: "ON_PLAN", week: 1 });
    expect(athleteStatus({ profile: adult, plan: { startDay: "2026-11-01", checkInWeeks: [] }, day: "2026-11-08" })).toEqual({ kind: "CHECKIN_DUE", week: 1 });
  });

  it("averages weight change per week", () => {
    expect(weeklyWeightChange(80, [{ weekNumber: 1, bodyWeightKg: 79.6 }, { weekNumber: 2, bodyWeightKg: 79 }])).toBe(-0.5);
    expect(weeklyWeightChange(80, [])).toBeNull();
  });
});

describe("sports list", () => {
  it("has unique ids and maps unknown ids to the team profile", () => {
    expect(new Set(SPORTS.map((s) => s.id)).size).toBe(SPORTS.length);
    expect(sportCategory("swimming")).toBe("ENDURANCE");
    expect(sportCategory("Bodybuilding")).toBe("TEAM");
  });
});
