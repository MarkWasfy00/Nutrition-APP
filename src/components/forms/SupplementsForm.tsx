"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { saveSupplements } from "@/actions/profile";
import { SubmitButton, Spinner } from "../SubmitButton";
import { SupplementPicker } from "./SupplementPicker";

export function SupplementsForm({ use, selected }: { use: boolean; selected: string[] }) {
  const t = useTranslations("supplements");
  const [state, action] = useActionState(saveSupplements, undefined);
  return (
    <form action={action} className="space-y-4">
      <SupplementPicker use={use} selected={selected} />
      {state?.ok && <p role="status" className="text-sm font-medium text-ok">{t("saved")}</p>}
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary w-full" pendingText={<><Spinner /> {t("rebuilding")}</>}>{t("save")}</SubmitButton>
    </form>
  );
}
