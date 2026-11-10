"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveTeam } from "@/actions/coach";
import { SubmitButton } from "../SubmitButton";

const WEEK = [6, 0, 1, 2, 3, 4, 5]; // Saturday first (Egyptian week)
const PHASES = ["OFF_SEASON", "PRE_SEASON", "IN_SEASON"] as const;

function Day({ name, value, checked, label }: { name: string; value: number; checked: boolean; label: string }) {
  return (
    <label className="option">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} className="sr-only" />
      {label}
    </label>
  );
}

/** Team name, season phase, practice and match weekdays. */
export function TeamForm({ team }: { team: { name: string; phase: string; practiceWeekdays: number[]; matchWeekdays: number[] } }) {
  const t = useTranslations("coach");
  const to = useTranslations("onboarding");
  const tt = useTranslations("train");
  const [state, action] = useActionState(saveTeam, undefined);
  return (
    <form action={action} className="space-y-6">
      <div>
        <label className="label" htmlFor="name">{t("teamName")}</label>
        <input id="name" name="name" required minLength={2} defaultValue={team.name} className="input" />
      </div>
      <fieldset>
        <legend className="label">{t("phase")}</legend>
        <div className="grid gap-2">
          {PHASES.map((p) => (
            <label key={p} className="option-card">
              <input type="radio" name="phase" value={p} defaultChecked={team.phase === p} required className="peer sr-only" />
              <span className="flex-1">
                <span className="block font-semibold">{tt(`phases.${p}`)}</span>
                <span className="footnote">{t(`phaseHints.${p}`)}</span>
              </span>
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-subtle peer-checked:border-accent peer-checked:bg-accent" aria-hidden>
                <span className="size-2 rounded-full bg-bg" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{t("practiceDays")}</legend>
        <div className="flex flex-wrap gap-2">
          {WEEK.map((d) => <Day key={d} name="practiceWeekdays" value={d} checked={team.practiceWeekdays.includes(d)} label={to(`days.${d}`)} />)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">{t("matchDays")}</legend>
        <div className="flex flex-wrap gap-2">
          {WEEK.map((d) => <Day key={d} name="matchWeekdays" value={d} checked={team.matchWeekdays.includes(d)} label={to(`days.${d}`)} />)}
        </div>
        <p className="footnote mt-2">{t("matchDaysHint")}</p>
      </fieldset>
      {state?.ok && <p role="status" className="text-sm font-medium text-ok">{t("teamSaved")}</p>}
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={t("rebuilding")}>{t("saveTeam")}</SubmitButton>
    </form>
  );
}
