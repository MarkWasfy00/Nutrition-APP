"use client";

import { useActionState, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { buySeats, setRenewalSeats, startCheckout } from "@/actions/billing";
import { updateSettings } from "@/actions/profile";
import { Switch } from "../ui/Switch";
import { SubmitButton } from "../SubmitButton";

function SeatsInput({ value, onChange, min, label }: { value: number; onChange: (n: number) => void; min: number; label: string }) {
  return (
    <div>
      <label className="label" htmlFor="seats">{label}</label>
      <input id="seats" name="seats" type="number" inputMode="numeric" min={min} max={200} required value={value}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))} className="input tnum text-lg font-semibold" />
    </div>
  );
}

function PhoneInput({ phone, required = true }: { phone?: string | null; required?: boolean }) {
  const t = useTranslations("billing");
  return (
    <div>
      <label className="label" htmlFor="phone">{t("phone")}</label>
      <input id="phone" name="phone" type="tel" autoComplete="tel" required={required} defaultValue={phone ?? ""} placeholder="01xxxxxxxxx" className="input tnum" dir="ltr" />
    </div>
  );
}

/** First subscription: the coach chooses how many athlete seats to pay for. */
export function CheckoutForm({ phone, pricePerSeatCents, minSeats }: { phone?: string | null; pricePerSeatCents: number; minSeats: number }) {
  const t = useTranslations("billing");
  const format = useFormatter();
  const [state, action] = useActionState(startCheckout, undefined);
  const [seats, setSeats] = useState(Math.max(minSeats, 10));
  const total = format.number((seats * pricePerSeatCents) / 100, { style: "currency", currency: "EGP", maximumFractionDigits: 0 });
  return (
    <form action={action} className="space-y-3">
      <SeatsInput value={seats} onChange={setSeats} min={Math.max(1, minSeats)} label={t("seats")} />
      <p className="footnote tnum" aria-live="polite">{t("totalPerMonth", { total, seats })}</p>
      <PhoneInput phone={phone} />
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("pay")}</SubmitButton>
    </form>
  );
}

/** Add seats now (pro rata for the rest of the period). */
export function BuySeatsForm({ phone, pricePerSeatCents, daysLeft }: { phone?: string | null; pricePerSeatCents: number; daysLeft: number }) {
  const t = useTranslations("billing");
  const format = useFormatter();
  const [state, action] = useActionState(buySeats, undefined);
  const [seats, setSeats] = useState(5);
  const total = format.number((seats * pricePerSeatCents * Math.min(30, Math.max(1, daysLeft))) / 30 / 100, { style: "currency", currency: "EGP", maximumFractionDigits: 0 });
  return (
    <form action={action} className="space-y-3">
      <SeatsInput value={seats} onChange={setSeats} min={1} label={t("addSeats")} />
      <p className="footnote tnum" aria-live="polite">{t("topUpTotal", { total, days: daysLeft })}</p>
      <PhoneInput phone={phone} required={!phone} />
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary w-full">{t("buySeats")}</SubmitButton>
    </form>
  );
}

/** Lower the seat count from the next renewal. */
export function RenewalSeatsForm({ seats, nextSeats, athletes }: { seats: number; nextSeats: number | null; athletes: number }) {
  const t = useTranslations("billing");
  const [state, action] = useActionState(setRenewalSeats, undefined);
  const [value, setValue] = useState(nextSeats ?? seats);
  return (
    <form action={action} className="space-y-3">
      <SeatsInput value={value} onChange={setValue} min={Math.max(1, athletes)} label={t("renewalSeats")} />
      <p className="footnote">{t("renewalSeatsHint", { athletes })}</p>
      {state?.ok && <p role="status" className="text-sm font-medium text-ok">{t("saved")}</p>}
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-secondary w-full">{t("saveRenewalSeats")}</SubmitButton>
    </form>
  );
}

export function SettingsForm({ name, phone, addBack }: { name: string; phone?: string | null; addBack?: boolean }) {
  const t = useTranslations("settings");
  const [state, action] = useActionState(updateSettings, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="list-group divide-y divide-line">
        <label className="flex min-h-[3.25rem] items-center gap-3 px-4">
          <span className="shrink-0 whitespace-nowrap text-[0.9375rem] font-medium">{t("name")}</span>
          <input name="name" defaultValue={name} required autoComplete="name" className="min-h-11 w-full bg-transparent text-end text-[0.9375rem] text-muted focus:text-fg focus:outline-none" />
        </label>
        <label className="flex min-h-[3.25rem] items-center gap-3 px-4">
          <span className="shrink-0 whitespace-nowrap text-[0.9375rem] font-medium">{t("phone")}</span>
          <input name="phone" type="tel" defaultValue={phone ?? ""} autoComplete="tel" dir="ltr" className="min-h-11 w-full bg-transparent text-end text-[0.9375rem] text-muted tnum focus:text-fg focus:outline-none rtl:text-start" />
        </label>
        {addBack !== undefined && <Switch name="addBackExerciseKcal" defaultChecked={addBack} label={t("addBack")} description={t("addBackHint")} />}
      </div>
      {state?.ok && <p role="status" className="px-4 text-sm font-medium text-ok">{t("saved")}</p>}
      {state?.error && <p role="alert" className="px-4 text-sm font-medium text-accent">{t("invalid")}</p>}
      <SubmitButton className="btn-secondary w-full">{t("save")}</SubmitButton>
    </form>
  );
}
