"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ExerciseMeasure } from "@prisma/client";
import { saveSession } from "@/actions/coachTraining";
import { defaultsFor, EDIT_LIMITS, MAX_EXERCISES } from "@/lib/training/edit";
import { Link } from "@/i18n/navigation";
import { SubmitButton } from "../SubmitButton";

export type EditorOption = { id: string; name: string; pattern: string; measure: ExerciseMeasure; warn: boolean };
export type EditorRow = {
  exerciseId: string; sets: number; repMin: number; repMax: number; distanceM: number | null; targetRpe: number; restSec: number;
};

type Row = { key: number; exerciseId: string; sets: string; repMin: string; repMax: string; distanceM: string; targetRpe: string; restSec: string };

const toRow = (r: EditorRow, key: number): Row => ({
  key, exerciseId: r.exerciseId, sets: String(r.sets), repMin: String(r.repMin), repMax: String(r.repMax),
  distanceM: r.distanceM != null ? String(r.distanceM) : "", targetRpe: String(r.targetRpe), restSec: String(r.restSec),
});

function Field({ label, value, onChange, min, max, step = 1, id }: {
  label: string; value: string; onChange: (v: string) => void; min: number; max: number; step?: number; id: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="caption mb-1 block truncate">{label}</label>
      <input id={id} type="number" inputMode="decimal" required min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(e.target.value)} className="input min-h-11 px-2.5 text-center tnum" />
    </div>
  );
}

/** Coach's editor for one S&C session: exercises, prescription, order; optionally copied to later weeks. */
export function SessionEditor({ athleteId, dayId, weekNumber, initial, options, laterCount }: {
  athleteId: string; dayId: string; weekNumber: number; initial: EditorRow[]; options: EditorOption[]; laterCount: number;
}) {
  const t = useTranslations("coachTraining");
  const tt = useTranslations("train");
  const nextKey = useRef(initial.length);
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [state, action] = useActionState(saveSession.bind(null, athleteId, dayId), undefined);
  const byId = new Map(options.map((o) => [o.id, o]));
  const patterns = [...new Set(options.map((o) => o.pattern))];

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => setRows((rs) => {
    const next = [...rs];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    return next;
  });
  const swap = (row: Row, exerciseId: string) => {
    const from = byId.get(row.exerciseId)?.measure;
    const to = byId.get(exerciseId)?.measure ?? "LOAD_REPS";
    const d = defaultsFor(to);
    update(row.key, from === to
      ? { exerciseId }
      : { exerciseId, repMin: String(d.repMin), repMax: String(d.repMax), distanceM: d.distanceM != null ? String(d.distanceM) : "" });
  };
  const add = () => {
    const first = options[0];
    setRows((rs) => [...rs, toRow({ exerciseId: first.id, sets: 3, ...defaultsFor(first.measure), targetRpe: 7, restSec: 90 }, nextKey.current++)]);
  };

  const payload = JSON.stringify(rows.map((r) => ({ ...r, key: undefined })));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="exercises" value={payload} />
      <ol className="space-y-3">
        {rows.map((r, i) => {
          const opt = byId.get(r.exerciseId);
          const measure = opt?.measure ?? "LOAD_REPS";
          const [lo, hi] = measure === "TIME" ? EDIT_LIMITS.seconds : EDIT_LIMITS.reps;
          const bad = state?.row === i;
          const id = (f: string) => `ex-${r.key}-${f}`;
          return (
            <li key={r.key} className={`card space-y-3 ${bad ? "ring-1 ring-accent" : ""}`}>
              <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-semibold tnum" aria-hidden>{i + 1}</span>
                <select aria-label={t("exerciseN", { n: i + 1 })} value={r.exerciseId} onChange={(e) => swap(r, e.target.value)}
                  className="input min-h-11 min-w-0 flex-1 px-2.5 text-[0.9375rem]">
                  {patterns.map((p) => (
                    <optgroup key={p} label={tt.has(`patterns.${p}`) ? tt(`patterns.${p}`) : p}>
                      {options.filter((o) => o.pattern === p).map((o) => (
                        <option key={o.id} value={o.id}>{o.warn ? `⚠ ${o.name}` : o.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {opt?.warn && <p className="footnote text-warn">{t("injuryWarn")}</p>}
              <div className="grid grid-cols-3 gap-2">
                <Field id={id("sets")} label={t("sets")} value={r.sets} onChange={(v) => update(r.key, { sets: v })} min={EDIT_LIMITS.sets[0]} max={EDIT_LIMITS.sets[1]} />
                <Field id={id("min")} label={measure === "TIME" ? t("secondsFrom") : t("repsFrom")} value={r.repMin} onChange={(v) => update(r.key, { repMin: v })} min={lo} max={hi} />
                <Field id={id("max")} label={measure === "TIME" ? t("secondsTo") : t("repsTo")} value={r.repMax} onChange={(v) => update(r.key, { repMax: v })} min={Math.max(lo, Number(r.repMin) || lo)} max={hi} />
                {measure === "DISTANCE" && (
                  <Field id={id("dist")} label={t("distance")} value={r.distanceM} onChange={(v) => update(r.key, { distanceM: v })} min={EDIT_LIMITS.distanceM[0]} max={EDIT_LIMITS.distanceM[1]} />
                )}
                <Field id={id("rpe")} label={t("rpe")} value={r.targetRpe} onChange={(v) => update(r.key, { targetRpe: v })} min={EDIT_LIMITS.targetRpe[0]} max={EDIT_LIMITS.targetRpe[1]} step={0.5} />
                <Field id={id("rest")} label={t("rest")} value={r.restSec} onChange={(v) => update(r.key, { restSec: v })} min={EDIT_LIMITS.restSec[0]} max={EDIT_LIMITS.restSec[1]} step={5} />
              </div>
              <div className="-mb-2 -me-2 flex justify-end">
                <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("moveUp", { name: opt?.name ?? "" })}>
                  <ArrowUp className="size-5" aria-hidden />
                </button>
                <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={t("moveDown", { name: opt?.name ?? "" })}>
                  <ArrowDown className="size-5" aria-hidden />
                </button>
                <button type="button" className="icon-btn hover:text-accent" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                  disabled={rows.length === 1} aria-label={t("removeExercise", { name: opt?.name ?? "" })}>
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <button type="button" onClick={add} disabled={rows.length >= MAX_EXERCISES} className="btn-tonal w-full">
        <Plus className="size-5" aria-hidden />{t("addExercise")}
      </button>

      {laterCount > 0 && (
        <label className="option-card">
          <input type="checkbox" name="applyForward" className="peer mt-1 size-5 shrink-0 accent-[var(--color-primary)]" />
          <span className="flex-1">
            <span className="block font-semibold">{t("applyForward", { n: laterCount })}</span>
            <span className="footnote">{t("applyForwardHint")}</span>
          </span>
        </label>
      )}

      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={t("saving")}>{t("save")}</SubmitButton>
      <Link href={`/coach/athletes/${athleteId}/training?week=${weekNumber}`} className="btn-plain w-full">{t("cancel")}</Link>
    </form>
  );
}
