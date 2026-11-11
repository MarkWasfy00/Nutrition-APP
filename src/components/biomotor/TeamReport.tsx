import { getTranslations } from "next-intl/server";
import { Trophy } from "lucide-react";
import { db } from "@/lib/db";
import { assignmentTests, latestScores, scoreChange, testSummary } from "@/lib/biomotor";
import { Link } from "@/i18n/navigation";
import { scoreFormatter } from "./AthleteReport";

const TONE = { ok: "text-ok", bad: "text-accent", muted: "text-muted" };

/**
 * Squad report for one assignment: per test the average, best, who was tested, and athletes ranked,
 * each with the change since their previous score on that test.
 */
export async function TeamReport({ assignment, athletes, results }: {
  assignment: { id: string; teamId: string; day: string; tests: string[] };
  athletes: { id: string; name: string }[];
  results: { athleteId: string; testId: string; value: number }[];
}) {
  const [t, fmt] = await Promise.all([getTranslations("biomotor"), scoreFormatter()]);
  const tests = assignmentTests(assignment.tests);
  const names = new Map(athletes.map((a) => [a.id, a.name]));
  const inSquad = results.filter((r) => names.has(r.athleteId));
  if (inSquad.length === 0) return <p className="footnote rounded-2xl bg-surface px-4 py-3">{t("noResults")}</p>;

  // Each athlete's latest earlier score per test, for the change column.
  const previous = latestScores((await db.biomotorResult.findMany({
    where: {
      athleteId: { in: athletes.map((a) => a.id) }, testId: { in: assignment.tests },
      assignment: { teamId: assignment.teamId, day: { lt: assignment.day } },
    },
    select: { athleteId: true, testId: true, value: true, assignment: { select: { day: true } } },
  })).map((r) => ({ athleteId: r.athleteId, testId: r.testId, value: r.value, day: r.assignment.day })));

  return (
    <div className="space-y-5">
      {tests.map((test) => {
        const s = testSummary(test, inSquad.filter((r) => r.testId === test.id));
        return (
          <section key={test.id} className="list-group" aria-labelledby={`t-${test.id}`}>
            <div className="px-4 pb-3 pt-3.5">
              <h2 id={`t-${test.id}`} className="headline">{t(`tests.${test.id}.name`)}</h2>
              <p className="footnote">{t(`abilities.${test.ability}`)} · {t("tested", { n: s.n, total: athletes.length })}</p>
              {s.n > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface-2 px-3 py-2">
                    <dt className="caption">{t("teamMean")}</dt>
                    <dd className="font-bold tnum">{fmt(test, s.mean!)}</dd>
                  </div>
                  <div className="rounded-xl bg-surface-2 px-3 py-2">
                    <dt className="caption">{t("best")}</dt>
                    <dd className="font-bold tnum">{fmt(test, s.best!)}</dd>
                  </div>
                </dl>
              )}
            </div>
            {s.n > 0 && (
              <ol className="divide-y divide-line border-t border-line">
                {s.rows.map((r) => {
                  const prev = previous.get(test.id)?.get(r.athleteId);
                  const change = prev ? scoreChange(test, r.value, prev.value) : null;
                  const tone = !change ? null : change.improved == null ? "muted" : change.improved ? "ok" : "bad";
                  return (
                    <li key={r.athleteId}>
                      <Link href={`/coach/athletes/${r.athleteId}/tests`} className="flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-2">
                        <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted tnum">
                          {r.rank === 1 ? <Trophy className="mx-auto size-4 text-warn" aria-label="1" /> : r.rank}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{names.get(r.athleteId)}</span>
                        {change && tone && (
                          <span className={`text-xs font-semibold tnum ${TONE[tone]}`}>
                            <span className="sr-only">{t(change.improved == null ? "same" : change.improved ? "improved" : "worse")}: </span>
                            {fmt(test, change.delta, { sign: true, unit: false })}
                          </span>
                        )}
                        <span className="w-24 shrink-0 text-end font-semibold tnum">{fmt(test, r.value)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
