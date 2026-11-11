"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveResults } from "@/actions/biomotor";
import { assignmentTests, resultField, type BiomotorTest } from "@/lib/biomotor";
import { SubmitButton } from "../SubmitButton";

/** A stored score, keyed by `resultField(athleteId, testId)`. */
export type ScoreCell = { value: number; byAthlete: boolean; locked?: boolean };

/**
 * Score entry, one section per test (how testing runs: station by station).
 * Coach: a row per athlete. Athlete: `athletes` is just themselves and rows are labelled by test.
 */
export function ResultsForm({ assignmentId, testIds, athletes, cells, self }: {
  assignmentId: string; testIds: string[]; athletes: { id: string; name: string }[];
  cells: Record<string, ScoreCell>; self?: boolean;
}) {
  const t = useTranslations("biomotor");
  const [state, action] = useActionState(saveResults.bind(null, assignmentId), undefined);
  const tests = assignmentTests(testIds);

  const input = (test: BiomotorTest, a: { id: string; name: string }) => {
    const key = resultField(a.id, test.id);
    const cell = cells[key];
    const label = self ? t(`tests.${test.id}.name`) : t("scoreFor", { test: t(`tests.${test.id}.name`), name: a.name });
    if (cell?.locked) {
      return (
        <span className="text-end">
          <span className="block font-semibold tnum" dir="ltr">{cell.value.toFixed(test.decimals)} {t(`units.${test.unit}`)}</span>
          <span className="caption">{t("byCoach")}</span>
        </span>
      );
    }
    return (
      <span className="flex shrink-0 items-center gap-2">
        <input name={key} aria-label={label} defaultValue={cell ? cell.value.toFixed(test.decimals) : ""} type="text" dir="ltr"
          inputMode={test.min < 0 ? "text" : "decimal"} autoComplete="off" className="input min-h-11 w-24 text-center tnum" />
        <span className="w-9 text-sm text-muted">{t(`units.${test.unit}`)}{!self && cell?.byAthlete ? " •" : ""}</span>
      </span>
    );
  };

  return (
    <form action={action} className="space-y-5">
      {self ? (
        <ul className="list-group divide-y divide-line">
          {tests.map((test) => (
            <li key={test.id} className="flex min-h-16 items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t(`tests.${test.id}.name`)}</span>
                <span className="footnote block">{t(`tests.${test.id}.protocol`)}</span>
              </span>
              {input(test, athletes[0])}
            </li>
          ))}
        </ul>
      ) : (
        tests.map((test) => (
          <section key={test.id}>
            <h2 className="section-label">{t(`tests.${test.id}.name`)}</h2>
            <details className="mb-2 px-4">
              <summary className="footnote cursor-pointer font-medium text-accent">{t("howTo")}</summary>
              <p className="footnote mt-1">{t(`tests.${test.id}.protocol`)}</p>
            </details>
            <ul className="list-group divide-y divide-line">
              {athletes.map((a) => (
                <li key={a.id} className="flex min-h-14 items-center gap-3 px-4 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                  {input(test, a)}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {!self && Object.values(cells).some((c) => c.byAthlete) && <p className="footnote px-1">{t("selfNote")}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-ok">{t("resultsSaved")}</p>}
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={t("saving")}>{t("saveResults")}</SubmitButton>
    </form>
  );
}
