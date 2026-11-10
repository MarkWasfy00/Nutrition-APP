"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { saveOnboarding } from "@/actions/profile";
import { Spinner } from "../SubmitButton";
import { SupplementPicker } from "./SupplementPicker";

export type OnboardingDefaults = {
  sport?: string; sex?: string; birthDate?: string; heightCm?: number; goal?: string; targetWeightKg?: number | null;
  intensity?: string; mealsPerDay?: number; allergies?: string[]; dietaryPrefs?: string[];
  useSupplements?: boolean; supplements?: string[];
  split?: string; experience?: string; equipment?: string; sessionMinutes?: number; weekdays?: number[]; injuries?: string[];
};

const STEPS = ["about", "goal", "food", "training"] as const;

function Choice({ name, value, label, type = "radio", checked }: { name: string; value: string | number; label: string; type?: "radio" | "checkbox"; checked?: boolean }) {
  return (
    <label className="option">
      <input type={type} name={name} value={value} defaultChecked={checked} className="sr-only" required={type === "radio"} />
      {label}
    </label>
  );
}

export function OnboardingForm({ d }: { d: OnboardingDefaults }) {
  const t = useTranslations("onboarding");
  const [state, action, pending] = useActionState(saveOnboarding, undefined);
  const [step, setStep] = useState(0);
  const [weekdaysError, setWeekdaysError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Validate only the visible step before moving on.
  const next = () => {
    const section = formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    const invalid = section ? [...section.querySelectorAll<HTMLInputElement>("input,select")].find((el) => !el.checkValidity()) : null;
    if (invalid) return invalid.reportValidity();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  // Submit manually: a form `action` makes React reset every field after the action
  // returns, which wipes earlier (hidden) steps on an error and blocks the next submit.
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const days = form.getAll("weekdays").length;
    setWeekdaysError(days < 2 || days > 6);
    if (days < 2 || days > 6) return;
    startTransition(() => action(form));
  };

  const show = (i: number) => (step === i ? "space-y-6" : "hidden");

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-6">
      <div>
        <p className="caption" aria-live="polite">{t("stepOf", { n: step + 1, total: STEPS.length })}</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => <span key={s} className={`h-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-surface-3"}`} />)}
        </div>
        <h2 className="title mt-4">{t(`steps.${STEPS[step]}`)}</h2>
      </div>

      <section data-step={0} className={show(0)}>
        <div>
          <label className="label" htmlFor="sport">{t("sport")}</label>
          <input id="sport" name="sport" required minLength={2} defaultValue={d.sport} placeholder={t("sportPlaceholder")} className="input" />
        </div>
        <div>
          <span className="label" id="ob-l1">{t("sex")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l1">
            {["MALE", "FEMALE"].map((v) => <Choice key={v} name="sex" value={v} label={t(`sexes.${v}`)} checked={d.sex === v} />)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="birthDate">{t("birthDate")}</label>
            <input id="birthDate" name="birthDate" type="date" required defaultValue={d.birthDate} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="heightCm">{t("height")}</label>
            <input id="heightCm" name="heightCm" type="number" min={120} max={230} step="0.5" required defaultValue={d.heightCm} className="input" />
          </div>
        </div>
      </section>

      <section data-step={1} className={show(1)}>
        <div>
          <span className="label" id="ob-l2">{t("goal")}</span>
          <div className="grid gap-2" role="group" aria-labelledby="ob-l2">
            {["CUT", "BULK", "RECOMP", "PERFORMANCE", "MAINTAIN"].map((g) => (
              <label key={g} className="option-card">
                <input type="radio" name="goal" value={g} defaultChecked={d.goal === g} required className="peer sr-only" />
                <span className="flex-1">
                  <span className="block font-semibold">{t(`goals.${g}.title`)}</span>
                  <span className="footnote">{t(`goals.${g}.body`)}</span>
                </span>
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-subtle peer-checked:border-accent peer-checked:bg-accent" aria-hidden>
                  <span className="size-2 rounded-full bg-bg" />
                </span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="targetWeightKg">{t("targetWeight")}</label>
          <input id="targetWeightKg" name="targetWeightKg" type="number" min={30} max={250} step="0.1" defaultValue={d.targetWeightKg ?? ""} className="input" />
        </div>
        <div>
          <span className="label" id="ob-l3">{t("intensity")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l3">
            {["LOW", "MODERATE", "HIGH", "VERY_HIGH"].map((v) => <Choice key={v} name="intensity" value={v} label={t(`intensities.${v}`)} checked={d.intensity === v} />)}
          </div>
        </div>
      </section>

      <section data-step={2} className={show(2)}>
        <div>
          <span className="label" id="ob-l4">{t("mealsPerDay")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l4">
            {[3, 4, 5, 6].map((n) => <Choice key={n} name="mealsPerDay" value={n} label={String(n)} checked={(d.mealsPerDay ?? 4) === n} />)}
          </div>
        </div>
        <div>
          <span className="label" id="ob-l5">{t("allergies")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l5">
            {["DAIRY", "EGGS", "NUTS", "GLUTEN", "SEAFOOD"].map((v) => <Choice key={v} type="checkbox" name="allergies" value={v} label={t(`allergyOptions.${v}`)} checked={d.allergies?.includes(v)} />)}
          </div>
        </div>
        <div>
          <span className="label" id="ob-l6">{t("dietaryPrefs")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l6">
            {["VEGETARIAN", "NO_RED_MEAT"].map((v) => <Choice key={v} type="checkbox" name="dietaryPrefs" value={v} label={t(`prefOptions.${v}`)} checked={d.dietaryPrefs?.includes(v)} />)}
          </div>
        </div>
        <SupplementPicker use={d.useSupplements} selected={d.supplements} />
      </section>

      <section data-step={3} className={show(3)}>
        <div>
          <span className="label" id="ob-l7">{t("split")}</span>
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby="ob-l7">
            {["PPL", "UPPER_LOWER", "FULL_BODY", "BRO_SPLIT", "ARNOLD"].map((v) => (
              <label key={v} className="option-card flex-col gap-0.5">
                <input type="radio" name="split" value={v} defaultChecked={d.split === v} required className="sr-only" />
                <span className="block font-semibold">{t(`splits.${v}.title`)}</span>
                <span className="footnote">{t(`splits.${v}.body`)}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <span className="label" id="ob-l8">{t("weekdays")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l8">
            {[6, 0, 1, 2, 3, 4, 5].map((v) => <Choice key={v} type="checkbox" name="weekdays" value={v} label={t(`days.${v}`)} checked={d.weekdays?.includes(v)} />)}
          </div>
          <p className="footnote mt-2">{t("weekdaysHint")}</p>
        </div>
        <div>
          <span className="label" id="ob-l9">{t("experience")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l9">
            {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((v) => <Choice key={v} name="experience" value={v} label={t(`experiences.${v}`)} checked={d.experience === v} />)}
          </div>
        </div>
        <div>
          <span className="label" id="ob-l10">{t("equipment")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l10">
            {["GYM", "DUMBBELLS", "HOME"].map((v) => <Choice key={v} name="equipment" value={v} label={t(`equipments.${v}`)} checked={d.equipment === v} />)}
          </div>
        </div>
        <div>
          <span className="label" id="ob-l11">{t("sessionMinutes")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l11">
            {[45, 60, 75, 90].map((v) => <Choice key={v} name="sessionMinutes" value={v} label={t("minutes", { n: v })} checked={(d.sessionMinutes ?? 60) === v} />)}
          </div>
        </div>
        <div>
          <span className="label" id="ob-l12">{t("injuries")}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ob-l12">
            {["SHOULDER", "KNEE", "LOWER_BACK", "ELBOW", "WRIST"].map((v) => <Choice key={v} type="checkbox" name="injuries" value={v} label={t(`injuryOptions.${v}`)} checked={d.injuries?.includes(v)} />)}
          </div>
        </div>
      </section>

      {(weekdaysError || state?.error) && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${weekdaysError ? "weekdays" : state!.error}`)}</p>}

      <div className="flex gap-3 pt-2">
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary btn-lg flex-1">{t("back")}</button>}
        {step < STEPS.length - 1
          ? <button type="button" onClick={next} className="btn-primary btn-lg flex-[2]">{t("next")}</button>
          : <button type="submit" disabled={pending} aria-busy={pending} className="btn-primary btn-lg flex-[2]">{pending ? <Spinner /> : t("finish")}</button>}
      </div>
    </form>
  );
}
