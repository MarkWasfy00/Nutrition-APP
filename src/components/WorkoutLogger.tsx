"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Info, Timer, TrendingUp, Trophy } from "lucide-react";
import { finishWorkout, logSet, startWorkout } from "@/actions/training";
import { prescription } from "@/lib/training/format";
import { Spinner } from "./SubmitButton";

export type Measure = "LOAD_REPS" | "REPS" | "TIME" | "DISTANCE";

export type LoggerExercise = {
  exerciseId: string;
  name: string;
  instructions: string;
  measure: Measure;
  sets: number;
  /** reps, or seconds for TIME */
  repMin: number;
  repMax: number;
  distanceM: number | null;
  targetRpe: number;
  restSec: number;
  last: { weightKg: number; reps: number; durationSec: number | null }[];
  suggestion: { weightKg: number; reps: number; increased: boolean } | null;
  logged: { setNumber: number; weightKg: number; reps: number; durationSec: number | null; isPR: boolean }[];
};

/** `reps` holds seconds for TIME exercises. */
type Row = { weight: string; reps: string; saved: boolean; pr: boolean };

function lastText(ex: LoggerExercise, i: number) {
  const prev = ex.last[i];
  if (!prev) return "—";
  if (ex.measure === "LOAD_REPS") return `${prev.weightKg}×${prev.reps}`;
  if (ex.measure === "TIME") return `${prev.durationSec ?? prev.reps}s`;
  if (ex.measure === "DISTANCE") return "✓";
  return `${prev.reps}`;
}

export function WorkoutLogger(props: {
  dayId: string;
  workoutId: string | null;
  finished: boolean;
  isToday: boolean;
  exercises: LoggerExercise[];
}) {
  const t = useTranslations("workout");
  const [workoutId, setWorkoutId] = useState(props.workoutId);
  const [finished, setFinished] = useState(props.finished);
  const [pending, start] = useTransition();
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [announce, setAnnounce] = useState("");
  const [rows, setRows] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(props.exercises.map((e) => [
      e.exerciseId,
      Array.from({ length: e.sets }, (_, i) => {
        const l = e.logged.find((s) => s.setNumber === i + 1);
        const w = l?.weightKg ?? e.suggestion?.weightKg ?? e.last[i]?.weightKg;
        const r = e.measure === "TIME" ? (l?.durationSec ?? e.repMax) : (l?.reps ?? e.suggestion?.reps ?? (e.measure === "REPS" ? e.repMax : undefined));
        return { weight: w != null ? String(w) : "", reps: r != null ? String(r) : "", saved: !!l, pr: !!l?.isPR };
      }),
    ])),
  );

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= rest.until) {
        setRest(null);
        setAnnounce(t("restOver"));
        navigator.vibrate?.(300);
      }
    }, 250);
    return () => clearInterval(id);
  }, [rest, t]);

  const update = (exId: string, i: number, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [exId]: r[exId].map((row, j) => (j === i ? { ...row, ...patch } : row)) }));

  const save = (ex: LoggerExercise, i: number) => {
    const row = rows[ex.exerciseId][i];
    if (!workoutId) return;
    const loaded = ex.measure === "LOAD_REPS";
    const weightKg = loaded ? Number(row.weight) : 0;
    const value = ex.measure === "DISTANCE" ? 1 : Number(row.reps);
    if ((loaded && (row.weight === "" || !Number.isFinite(weightKg))) || !Number.isFinite(value) || value <= 0) return;
    const input = ex.measure === "TIME"
      ? { reps: 1, weightKg: 0, durationSec: Math.round(value) }
      : { reps: Math.round(value), weightKg };
    start(async () => {
      const { isPR } = await logSet({ workoutId, exerciseId: ex.exerciseId, setNumber: i + 1, ...input });
      update(ex.exerciseId, i, { saved: true, pr: isPR });
      setAnnounce(isPR ? t("prAnnounce") : "");
      setRest({ until: Date.now() + ex.restSec * 1000, total: ex.restSec });
    });
  };

  const all = Object.values(rows).flat();
  const done = all.filter((r) => r.saved).length;
  const left = rest ? Math.max(0, Math.ceil((rest.until - now) / 1000)) : 0;

  return (
    <div className={`space-y-4 ${rest ? "pb-20" : ""}`}>
      <p className="sr-only" aria-live="polite">{announce}</p>

      {!workoutId ? (
        <button type="button" disabled={pending || !props.isToday} className="btn-primary btn-lg w-full"
          onClick={() => start(async () => setWorkoutId(await startWorkout(props.dayId)))}>
          {pending ? <Spinner /> : props.isToday ? t("start") : t("notToday")}
        </button>
      ) : (
        <div className="card flex items-center gap-4">
          <div className="flex-1">
            <p className="caption">{finished ? t("finished") : t("inProgress")}</p>
            <p className="text-lg font-semibold tnum">{t("progress", { done, total: all.length })}</p>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${(done / all.length) * 100}%` }} />
          </div>
        </div>
      )}

      {props.exercises.map((ex, idx) => (
        <section key={ex.exerciseId} className="card" aria-labelledby={`ex-${idx}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={`ex-${idx}`} className="headline text-base">{ex.name}</h2>
              <p className="footnote mt-0.5 tnum">
                <span dir="ltr">{prescription(ex)}</span> · RPE {ex.targetRpe} · {t("rest", { s: ex.restSec })}
              </p>
            </div>
            {ex.suggestion?.increased && (
              <span className="pill shrink-0 bg-ok/15 text-ok" dir="ltr"><TrendingUp className="size-3.5" aria-hidden />+{ex.suggestion.weightKg - Math.max(...ex.last.map((s) => s.weightKg))} kg</span>
            )}
          </div>
          <details className="mt-2">
            <summary className="footnote inline-flex min-h-8 cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden">
              <Info className="size-3.5" aria-hidden />{t("howTo")}
            </summary>
            <p className="footnote mt-1">{ex.instructions}</p>
          </details>

          <table className="mt-3 w-full border-separate border-spacing-x-1 border-spacing-y-1.5 text-center">
            <thead>
              <tr className="caption">
                <th scope="col" className="w-8 font-medium">{t("set")}</th>
                <th scope="col" className="font-medium">{t("last")}</th>
                {ex.measure === "LOAD_REPS" && <th scope="col" className="w-[22%] font-medium">{t("kg")}</th>}
                {ex.measure !== "DISTANCE" && <th scope="col" className="w-[22%] font-medium">{ex.measure === "TIME" ? t("seconds") : t("reps")}</th>}
                <th scope="col" className="w-12 font-medium"><span className="sr-only">{t("done")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows[ex.exerciseId].map((row, i) => (
                  <tr key={i} className={row.saved ? "text-ok" : ""}>
                    <td className="text-sm font-semibold tnum">{i + 1}</td>
                    <td className="footnote tnum" dir="ltr">{lastText(ex, i)}</td>
                    {ex.measure === "LOAD_REPS" && (
                      <td>
                        <input inputMode="decimal" aria-label={t("kgFor", { set: i + 1, name: ex.name })} value={row.weight} disabled={!workoutId}
                          onChange={(e) => update(ex.exerciseId, i, { weight: e.target.value, saved: false })}
                          className={`input min-h-11 px-1 text-center font-semibold tnum ${row.saved ? "bg-ok/10" : ""}`} />
                      </td>
                    )}
                    {ex.measure !== "DISTANCE" && (
                      <td>
                        <input inputMode="numeric" aria-label={t(ex.measure === "TIME" ? "secondsFor" : "repsFor", { set: i + 1, name: ex.name })} value={row.reps} disabled={!workoutId}
                          onChange={(e) => update(ex.exerciseId, i, { reps: e.target.value, saved: false })}
                          className={`input min-h-11 px-1 text-center font-semibold tnum ${row.saved ? "bg-ok/10" : ""}`} />
                      </td>
                    )}
                    <td>
                      <button type="button" disabled={!workoutId || pending} onClick={() => save(ex, i)}
                        aria-label={t("logSet", { set: i + 1, name: ex.name })} aria-pressed={row.saved}
                        className={`grid size-11 place-items-center rounded-xl transition-colors ${row.saved ? "bg-ok text-bg" : "bg-surface-2 text-muted hover:bg-surface-3"}`}>
                        {row.pr ? <Trophy className="size-5" aria-label={t("pr")} /> : <Check className="size-5" strokeWidth={2.5} aria-hidden />}
                      </button>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {workoutId && !finished && (
        <button type="button" disabled={pending} className="btn-primary btn-lg w-full"
          onClick={() => start(async () => { await finishWorkout(workoutId); setFinished(true); setRest(null); })}>
          {t("finish")}
        </button>
      )}

      {rest && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 px-4">
          <div className="mx-auto flex max-w-lg items-center gap-3 overflow-hidden rounded-2xl bg-surface-3 p-2 ps-4 shadow-2xl shadow-black/60">
            <Timer className="size-5 text-accent" aria-hidden />
            <div className="flex-1">
              <p className="caption">{t("resting")}</p>
              <p className="text-xl font-bold tnum" dir="ltr" role="timer">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</p>
            </div>
            <button type="button" onClick={() => setRest({ ...rest, until: rest.until + 15000 })} className="btn-secondary bg-surface-2 px-3 tnum">+15s</button>
            <button type="button" onClick={() => setRest(null)} className="btn-secondary bg-surface-2 px-3">{t("skip")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
