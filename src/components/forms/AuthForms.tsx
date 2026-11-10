"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { joinTeam, joinWithCode, login, registerClub } from "@/actions/auth";
import { SPORTS } from "@/lib/sports";
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

function AccountFields() {
  const t = useTranslations("auth");
  return (
    <>
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
    </>
  );
}

function Agree({ label }: { label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl py-1 text-sm text-muted">
      <input type="checkbox" name="agree" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
      <span>{label}</span>
    </label>
  );
}

/** Coach registers the club squad. */
export function RegisterClubForm() {
  const t = useTranslations("auth");
  const ts = useTranslations("sports");
  const locale = useLocale();
  const [state, action] = useActionState(registerClub, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="label" htmlFor="teamName">{t("teamName")}</label>
        <input id="teamName" name="teamName" required minLength={2} placeholder={t("teamNamePlaceholder")} className="input" autoComplete="organization" />
      </div>
      <div>
        <label className="label" htmlFor="sport">{t("teamSport")}</label>
        <select id="sport" name="sport" required defaultValue="" className="input">
          <option value="" disabled>{t("chooseSport")}</option>
          {SPORTS.map((s) => <option key={s.id} value={s.id}>{ts(s.id)}</option>)}
        </select>
      </div>
      <p className="section-label !mt-6">{t("coachAccount")}</p>
      <AccountFields />
      <Agree label={t("agreeCoach")} />
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("createClub")}</SubmitButton>
    </form>
  );
}

/** Athlete account inside a team (from the invite link). */
export function JoinForm({ code }: { code: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [state, action] = useActionState(joinTeam, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="code" value={code} />
      <AccountFields />
      <Agree label={t("agreeAthlete")} />
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("joinTeam")}</SubmitButton>
    </form>
  );
}

/** Signed-in athlete without a team enters the code their coach shared. */
export function InviteCodeForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(joinWithCode, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="code">{t("inviteCode")}</label>
        <input id="code" name="code" required minLength={4} maxLength={16} className="input uppercase tracking-widest" dir="ltr" autoComplete="off" />
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full">{t("joinTeam")}</SubmitButton>
    </form>
  );
}
