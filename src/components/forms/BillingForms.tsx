"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { startCheckout } from "@/actions/billing";
import { updateSettings } from "@/actions/profile";
import { Switch } from "../ui/Switch";
import { SubmitButton } from "../SubmitButton";

export function CheckoutForm({ phone }: { phone?: string | null }) {
  const t = useTranslations("billing");
  const [state, action] = useActionState(startCheckout, undefined);
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="phone">{t("phone")}</label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" required defaultValue={phone ?? ""} placeholder="01xxxxxxxxx" className="input tnum" dir="ltr" />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("pay")}</SubmitButton>
    </form>
  );
}

export function SettingsForm({ name, phone, addBack }: { name: string; phone?: string | null; addBack: boolean }) {
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
        <Switch name="addBackExerciseKcal" defaultChecked={addBack} label={t("addBack")} description={t("addBackHint")} />
      </div>
      {state?.ok && <p role="status" className="px-4 text-sm font-medium text-ok">{t("saved")}</p>}
      {state?.error && <p role="alert" className="px-4 text-sm font-medium text-accent">{t("invalid")}</p>}
      <SubmitButton className="btn-secondary w-full">{t("save")}</SubmitButton>
    </form>
  );
}
