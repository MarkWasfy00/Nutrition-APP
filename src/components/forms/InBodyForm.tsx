"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Camera, Keyboard } from "lucide-react";
import { saveScan } from "@/actions/inbody";
import type { InBodyExtraction } from "@/lib/ai/gemini";
import { SubmitButton, Spinner } from "../SubmitButton";

const FIELDS = [
  ["weightKg", "kg", true],
  ["bodyFatPct", "%", false],
  ["skeletalMuscleMassKg", "kg", false],
  ["bodyFatMassKg", "kg", false],
  ["fatFreeMassKg", "kg", false],
  ["bmrKcal", "kcal", false],
  ["totalBodyWaterL", "L", false],
  ["visceralFatLevel", "", false],
] as const;

type Values = Partial<Record<(typeof FIELDS)[number][0], string>>;

/** `athleteId` is set when a coach enters the scan for one of their athletes. */
export function InBodyForm({ purpose, aiEnabled, athleteId }: { purpose: "plan" | "checkin"; aiEnabled: boolean; athleteId?: string }) {
  const t = useTranslations("inbody");
  const [mode, setMode] = useState<"IMAGE" | "MANUAL">(aiEnabled ? "IMAGE" : "MANUAL");
  const [values, setValues] = useState<Values>({});
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [state, action] = useActionState(saveScan, undefined);

  async function upload(file: File) {
    setExtracting(true); setNotice(null);
    const fd = new FormData();
    fd.append("image", file);
    if (athleteId) fd.append("athleteId", athleteId);
    try {
      const res = await fetch("/api/inbody/extract", { method: "POST", body: fd });
      const data = (await res.json()) as { imageUrl?: string; extraction?: InBodyExtraction | null; error?: string };
      if (!res.ok) { setNotice(t(`errors.${data.error ?? "EXTRACTION_FAILED"}`)); return; }
      setImageUrl(data.imageUrl ?? null);
      const x = data.extraction;
      if (!x) { setNotice(t(`errors.${data.error ?? "EXTRACTION_FAILED"}`)); setReviewed(true); return; }
      if (!x.isInBodySheet) setNotice(t("notInbody"));
      else if (x.confidence < 0.7) setNotice(t("lowConfidence"));
      setValues(Object.fromEntries(FIELDS.map(([k]) => [k, x[k] != null ? String(x[k]) : ""])));
      setReviewed(true);
    } catch {
      setNotice(t("errors.EXTRACTION_FAILED"));
    } finally {
      setExtracting(false);
    }
  }

  const showFields = mode === "MANUAL" || reviewed;

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label={t("method")} className="flex rounded-xl bg-surface p-1">
        {([["IMAGE", Camera], ["MANUAL", Keyboard]] as const).map(([m, Icon]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={m === "IMAGE" && !aiEnabled} onClick={() => setMode(m)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${mode === m ? "bg-surface-3 text-fg" : "text-muted"}`}>
            <Icon className="size-4" aria-hidden />{t(`modes.${m}`)}
          </button>
        ))}
      </div>
      {!aiEnabled && <p className="footnote px-1">{t("aiDisabled")}</p>}

      {mode === "IMAGE" && (
        <label className="card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-line py-10 text-center transition-colors hover:border-accent/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
          {extracting ? (
            <><Spinner className="size-6" /><span className="footnote" aria-live="polite">{t("reading")}</span></>
          ) : (
            <>
              <span className="grid size-12 place-items-center rounded-full bg-tonal text-accent"><Camera className="size-6" aria-hidden /></span>
              <span className="headline mt-1">{imageUrl ? t("replacePhoto") : t("uploadPhoto")}</span>
              <span className="footnote">{t("uploadHint")}</span>
            </>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={extracting} />
        </label>
      )}
      {imageUrl && mode === "IMAGE" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={t("photoAlt")} className="max-h-64 w-full rounded-2xl bg-surface object-contain" />
      )}
      {notice && (
        <p role="status" className="flex gap-2 rounded-2xl bg-warn/10 p-4 text-sm text-warn">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />{notice}
        </p>
      )}

      {showFields && (
        <form action={action} className="space-y-5">
          <input type="hidden" name="source" value={mode === "IMAGE" && imageUrl ? "IMAGE" : "MANUAL"} />
          <input type="hidden" name="purpose" value={purpose} />
          {athleteId && <input type="hidden" name="athleteId" value={athleteId} />}
          {imageUrl && mode === "IMAGE" && <input type="hidden" name="imageUrl" value={imageUrl} />}
          {mode === "IMAGE" && <p className="headline px-1">{t("reviewHint")}</p>}
          <div className="card grid grid-cols-2 gap-x-3 gap-y-4">
            {FIELDS.map(([key, unit, required]) => (
              <div key={key} className={key === "weightKg" ? "col-span-2" : ""}>
                <label className="label" htmlFor={key}>
                  {t(`fields.${key}`)}{required && <span className="text-accent" aria-hidden> *</span>}
                </label>
                <div className="relative">
                  <input id={key} name={key} type="number" step="0.1" inputMode="decimal" required={required}
                    value={values[key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    className={`input tnum ${unit ? "pe-12" : ""} ${key === "weightKg" ? "text-xl font-semibold" : ""}`} />
                  {unit && <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="footnote px-1">{t("optionalHint")}</p>
          {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
          <SubmitButton className="btn-primary btn-lg w-full" pendingText={<><Spinner /> {purpose === "plan" ? t("building") : ""}</>}>
            {purpose === "plan" ? t("confirmBuild") : t("confirm")}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
