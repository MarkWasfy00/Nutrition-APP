"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ScanLine } from "lucide-react";
import { checkIn } from "@/actions/checkin";
import { Link } from "@/i18n/navigation";
import { SubmitButton, Spinner } from "../SubmitButton";

const SCORES = ["adherence", "energy", "hunger", "sleep", "performance"] as const;

export function CheckInForm({ scan }: { scan?: { id: string; weightKg: number } | null }) {
  const t = useTranslations("checkin");
  const [state, action] = useActionState(checkIn, undefined);
  const [scores, setScores] = useState<Record<string, number>>({ adherence: 8, energy: 7, hunger: 5, sleep: 7, performance: 7 });

  return (
    <form action={action} className="space-y-6">
      {scan && <input type="hidden" name="scanId" value={scan.id} />}
      <div className="card">
        <label className="label" htmlFor="bodyWeightKg">{t("weight")}</label>
        <div className="relative">
          <input id="bodyWeightKg" name="bodyWeightKg" type="number" inputMode="decimal" step="0.1" min={30} max={250} required
            defaultValue={scan?.weightKg} readOnly={!!scan} aria-describedby="weight-hint"
            className="input pe-12 text-2xl font-semibold tnum" />
          <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted">kg</span>
        </div>
        {scan ? <p id="weight-hint" className="footnote mt-2 text-ok">{t("fromScan")}</p> : (
          <p id="weight-hint" className="footnote mt-2">{t("weightHint")}</p>
        )}
        {!scan && (
          <Link href="/inbody/new?purpose=checkin" className="btn-plain -ms-2 mt-1">
            <ScanLine className="size-4" aria-hidden />{t("addScan")}
          </Link>
        )}
      </div>

      <fieldset className="card space-y-5">
        <legend className="sr-only">{t("howWasWeek")}</legend>
        {SCORES.map((k) => (
          <div key={k}>
            <div className="flex items-baseline justify-between">
              <label className="text-[0.9375rem] font-medium" htmlFor={k}>{t(`scores.${k}`)}</label>
              <output htmlFor={k} className="text-lg font-semibold tnum">{scores[k]}<span className="text-sm font-normal text-muted">/10</span></output>
            </div>
            <input id={k} name={k} type="range" min={1} max={10} value={scores[k]} className="range"
              aria-valuetext={`${scores[k]} / 10`}
              onChange={(e) => setScores((s) => ({ ...s, [k]: Number(e.target.value) }))} />
            <div className="caption -mt-1 flex justify-between"><span>{t(`low.${k}`)}</span><span>{t(`high.${k}`)}</span></div>
          </div>
        ))}
      </fieldset>

      <div>
        <label className="label px-1" htmlFor="notes">{t("notes")}</label>
        <textarea id="notes" name="notes" rows={3} maxLength={1000} className="input py-3" placeholder={t("notesPlaceholder")} />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={<><Spinner /> {t("analyzing")}</>}>{t("submit")}</SubmitButton>
    </form>
  );
}
