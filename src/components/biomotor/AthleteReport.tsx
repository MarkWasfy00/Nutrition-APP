import { getFormatter, getTranslations } from "next-intl/server";
import { Activity, Dumbbell, HeartPulse, Move, Shuffle, Timer, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { ABILITIES, abilityProfile, bestScore, BIOMOTOR_TESTS, latestScores, scoreChange, type Ability, type BiomotorTest } from "@/lib/biomotor";
import { ProgressBar } from "../ui/Progress";
import { AbilityRadar } from "./AbilityRadar";

export const ABILITY_ICON: Record<Ability, typeof Activity> = {
  STRENGTH: Dumbbell, POWER: Zap, SPEED: Timer, AGILITY: Shuffle, ENDURANCE: HeartPulse, FLEXIBILITY: Move,
};

const TONE = { ok: "bg-ok/15 text-ok", bad: "bg-primary/20 text-accent", muted: "bg-surface-2 text-muted" };

/** Formats a score with the test's decimals, in the current locale. */
export async function scoreFormatter() {
  const [t, format] = await Promise.all([getTranslations("biomotor"), getFormatter()]);
  return (test: BiomotorTest, v: number, opts: { unit?: boolean; sign?: boolean } = {}) =>
    `${format.number(v, { minimumFractionDigits: test.decimals, maximumFractionDigits: test.decimals, signDisplay: opts.sign ? "exceptZero" : "auto" })}${
      opts.unit === false ? "" : ` ${t(`units.${test.unit}`)}`}`;
}

/**
 * One athlete's biomotor report: profile against the current squad, then every test they did
 * with the latest score, change since last time, best and history.
 */
export async function AthleteReport({ athleteId, teamId, empty }: { athleteId: string; teamId: string; empty: string }) {
  const [t, format, fmt] = await Promise.all([getTranslations("biomotor"), getFormatter(), scoreFormatter()]);
  // Squad = athletes currently in the team, so people who left don't skew the comparison.
  const scores = (await db.biomotorResult.findMany({
    where: { assignment: { teamId }, athlete: { teamId, role: "ATHLETE" } },
    select: { athleteId: true, testId: true, value: true, assignment: { select: { day: true } } },
  })).map((r) => ({ athleteId: r.athleteId, testId: r.testId, value: r.value, day: r.assignment.day }));
  const own = scores.filter((s) => s.athleteId === athleteId).sort((a, b) => b.day.localeCompare(a.day));
  if (own.length === 0) return <p className="footnote rounded-2xl bg-surface px-4 py-3">{empty}</p>;

  const profile = abilityProfile(athleteId, latestScores(scores));
  const scored = profile.filter((p) => p.score != null);
  const date = (d: string) => format.dateTime(new Date(`${d}T12:00:00Z`), { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <section className="card space-y-4" aria-labelledby="profile-title">
        <h2 id="profile-title" className="headline">{t("profile")}</h2>
        {scored.length === 0 ? (
          <p className="footnote">{t("profileEmpty")}</p>
        ) : (
          <>
            {scored.length >= 3 && <AbilityRadar data={profile.map((p) => ({ label: t(`abilities.${p.ability}`), score: p.score }))} />}
            <ul className="space-y-3">
              {profile.map((p) => {
                const Icon = ABILITY_ICON[p.ability];
                return (
                  <li key={p.ability}>
                    <div className="mb-1.5 flex items-center gap-2 text-[0.9375rem]">
                      <Icon className="size-4 text-muted" aria-hidden />
                      <span className="flex-1 font-medium">{t(`abilities.${p.ability}`)}</span>
                      {p.score != null
                        ? <span className="font-semibold tnum">{format.number(p.score)}<span className="footnote"> / {format.number(100)}</span></span>
                        : <span className="footnote">{t("noScore")}</span>}
                    </div>
                    {p.score != null && (
                      <>
                        <ProgressBar value={p.score} max={100} label={t(`abilities.${p.ability}`)} />
                        <p className="caption mt-1">{t("scoreLine", { n: p.tests })}</p>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <p className="footnote">{t("profileHint")}</p>
      </section>

      {ABILITIES.map((ability) => {
        const tests = BIOMOTOR_TESTS.filter((x) => x.ability === ability && own.some((s) => s.testId === x.id));
        if (tests.length === 0) return null;
        return (
          <section key={ability}>
            <h2 className="section-label">{t(`abilities.${ability}`)}</h2>
            <div className="list-group divide-y divide-line">
              {tests.map((test) => {
                const history = own.filter((s) => s.testId === test.id);
                const [latest, previous] = history;
                const best = bestScore(test, history.map((h) => h.value))!;
                const change = previous ? scoreChange(test, latest.value, previous.value) : null;
                const tone = !change ? null : change.improved == null ? "muted" : change.improved ? "ok" : "bad";
                return (
                  <details key={test.id} className="group">
                    <summary className="flex min-h-[3.5rem] cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9375rem] font-medium">{t(`tests.${test.id}.name`)}</span>
                        <span className="footnote block">
                          {t("testedOn", { date: date(latest.day) })}{history.length > 1 ? ` · ${t("pb", { value: fmt(test, best) })}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="block font-semibold tnum">{fmt(test, latest.value)}</span>
                        {change && tone && (
                          <span className={`pill mt-0.5 ${TONE[tone]}`}>
                            <span className="sr-only">{t(change.improved == null ? "same" : change.improved ? "improved" : "worse")}: </span>
                            <span className="tnum">{fmt(test, change.delta, { sign: true })}</span>
                          </span>
                        )}
                      </span>
                    </summary>
                    <div className="border-t border-line px-4 py-3">
                      <p className="caption mb-1.5">{t("history")}</p>
                      <ul className="space-y-1">
                        {history.map((h, i) => (
                          <li key={i} className="flex justify-between gap-3 text-sm">
                            <span className="text-muted">{date(h.day)}</span>
                            <span className={`tnum ${h.value === best ? "font-semibold" : ""}`}>{fmt(test, h.value)}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="footnote mt-2">{t(`tests.${test.id}.protocol`)}</p>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
