import { describe, expect, it } from "vitest";
import { attendanceRate, attendanceSummary, canTakeAttendance, endTime, sessionSchema } from "./schedule";

const today = "2026-11-11";
const base = { kind: "PRACTICE", day: today, startTime: "18:30", durationMin: "90" };

describe("schedule", () => {
  it("parses a session form and empties optional text to null", () => {
    const s = sessionSchema(today).parse({ ...base, title: " ", location: "Main pitch", notes: "", athleteId: "" });
    expect(s).toMatchObject({ durationMin: 90, title: null, location: "Main pitch", notes: null, athleteId: null });
  });

  it("rejects bad times, durations and dates outside the window, but keeps an existing session's date", () => {
    const bad = (v: object, keep?: string) => !sessionSchema(today, keep).safeParse({ ...base, ...v }).success;
    expect(bad({ startTime: "24:00" })).toBe(true);
    expect(bad({ startTime: "7:30" })).toBe(true);
    expect(bad({ durationMin: "10" })).toBe(true);
    expect(bad({ kind: "PARTY" })).toBe(true);
    expect(bad({ day: "2026-01-01" })).toBe(true);
    expect(bad({ day: "2028-01-01" })).toBe(true);
    expect(bad({ day: "2026-01-01" }, "2026-01-01")).toBe(false);
  });

  it("computes end time, wrapping past midnight", () => {
    expect(endTime("18:30", 90)).toBe("20:00");
    expect(endTime("23:30", 60)).toBe("00:30");
  });

  it("opens attendance on the day of the session", () => {
    expect(canTakeAttendance({ day: "2026-11-12" }, today)).toBe(false);
    expect(canTakeAttendance({ day: today }, today)).toBe(true);
  });

  it("summarises attendance", () => {
    const recs = [{ status: "PRESENT" }, { status: "PRESENT" }, { status: "ABSENT" }] as const;
    expect(attendanceRate([...recs])).toBe(67);
    expect(attendanceRate([])).toBeNull();
    expect(attendanceSummary(5, [...recs])).toEqual({ expected: 5, present: 2, absent: 1, unmarked: 2 });
  });
});
