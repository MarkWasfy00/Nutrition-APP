"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveSession } from "@/actions/schedule";
import { DURATION, SESSION_KINDS } from "@/lib/schedule";
import { SubmitButton } from "../SubmitButton";

export type SessionValues = {
  kind: string; title: string | null; day: string; startTime: string; durationMin: number;
  location: string | null; notes: string | null; athleteId: string | null;
};

/**
 * Add or edit a session. `athletes` is passed for coaches only: they choose the whole team or one athlete.
 * `minDay` / `maxDay` mirror the server's allowed window.
 */
export function SessionForm({ sessionId, values, athletes, minDay, maxDay }: {
  sessionId: string | null; values: SessionValues; athletes?: { id: string; name: string }[]; minDay: string; maxDay: string;
}) {
  const t = useTranslations("schedule");
  const [state, action] = useActionState(saveSession.bind(null, sessionId), undefined);
  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="label">{t("kind")}</legend>
        <div className="flex flex-wrap gap-2">
          {SESSION_KINDS.map((k) => (
            <label key={k} className="option">
              <input type="radio" name="kind" value={k} defaultChecked={values.kind === k} required className="sr-only" />
              {t(`kinds.${k}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {athletes && (
        <div>
          <label className="label" htmlFor="athleteId">{t("for")}</label>
          <select id="athleteId" name="athleteId" defaultValue={values.athleteId ?? ""} className="input">
            <option value="">{t("wholeTeam")}</option>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="title">{t("titleLabel")}</label>
        <input id="title" name="title" maxLength={80} defaultValue={values.title ?? ""} placeholder={t("titlePlaceholder")} className="input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="day">{t("date")}</label>
          <input id="day" name="day" type="date" required min={minDay} max={maxDay} defaultValue={values.day} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="startTime">{t("start")}</label>
          <input id="startTime" name="startTime" type="time" required defaultValue={values.startTime} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="durationMin">{t("duration")}</label>
          <input id="durationMin" name="durationMin" type="number" inputMode="numeric" required min={DURATION.min} max={DURATION.max} step={DURATION.step}
            defaultValue={values.durationMin} className="input tnum" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="location">{t("location")}</label>
        <input id="location" name="location" maxLength={80} defaultValue={values.location ?? ""} placeholder={t("locationPlaceholder")} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="notes">{t("notes")}</label>
        <textarea id="notes" name="notes" rows={3} maxLength={500} defaultValue={values.notes ?? ""} className="input py-3" />
      </div>

      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={t("saving")}>{t("save")}</SubmitButton>
    </form>
  );
}
