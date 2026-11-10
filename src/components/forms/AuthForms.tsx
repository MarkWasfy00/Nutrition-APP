"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { login, register } from "@/actions/auth";
import { SubmitButton } from "../SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" dir="ltr" />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("password")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" dir="ltr" />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("login")}</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="name">{t("name")}</label>
        <input id="name" name="name" required minLength={2} className="input" autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">{t("email")}</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" dir="ltr" />
      </div>
      <div>
        <label className="label" htmlFor="password">{t("password")}</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" dir="ltr" aria-describedby="pw-hint" />
        <p id="pw-hint" className="footnote mt-1.5">{t("passwordHint")}</p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl py-1 text-sm text-muted">
        <input type="checkbox" name="adult" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
        <span>{t("adult")}</span>
      </label>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("createAccount")}</SubmitButton>
    </form>
  );
}
