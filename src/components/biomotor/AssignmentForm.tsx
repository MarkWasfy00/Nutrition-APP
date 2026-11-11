"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveAssignment } from "@/actions/biomotor";
import { ABILITIES, BIOMOTOR_TESTS } from "@/lib/biomotor";
import { SubmitButton } from "../SubmitButton";

export type AssignmentValues = { title: string | null; day: string; tests: string[]; notes: string | null; athleteId: string | null };

/** Coach creates or edits a testing assignment: day, who, and which tests (grouped by ability). */
export function AssignmentForm({ assignmentId, values, athletes, minDay, maxDay }: {
  assignmentId: string | null; values: AssignmentValues; athletes: { id: string; name: string }[]; minDay: string; maxDay: string;
}) {
  const t = useTranslations("biomotor");
  const [state, action] = useActionState(saveAssignment.bind(null, assignmentId), undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="label" htmlFor="athleteId">{t("for")}</label>
        <select id="athleteId" name="athleteId" defaultValue={values.athleteId ?? ""} className="input">
          <option value="">{t("wholeTeam")}</option>
          {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="day">{t("date")}</label>
          <input id="day" name="day" type="date" required min={minDay} max={maxDay} defaultValue={values.day} className="input" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="label" htmlFor="title">{t("titleLabel")}</label>
          <input id="title" name="title" maxLength={80} defaultValue={values.title ?? ""} placeholder={t("titlePlaceholder")} className="input" />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="label">{t("testsLabel")}</legend>
        <p className="footnote -mt-1">{t("testsHint")}</p>
        {ABILITIES.map((ability) => (
          <div key={ability}>
            <p className="caption mb-2">{t(`abilities.${ability}`)}</p>
            <div className="flex flex-wrap gap-2">
              {BIOMOTOR_TESTS.filter((x) => x.ability === ability).map((x) => (
                <label key={x.id} className="option">
                  <input type="checkbox" name="tests" value={x.id} defaultChecked={values.tests.includes(x.id)} className="sr-only" />
                  {t(`tests.${x.id}.name`)}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">{t("notes")}</label>
        <textarea id="notes" name="notes" rows={3} maxLength={500} defaultValue={values.notes ?? ""} placeholder={t("notesPlaceholder")} className="input py-3" />
      </div>

      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
