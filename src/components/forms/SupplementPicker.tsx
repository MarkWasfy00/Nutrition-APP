"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { SUPPLEMENTS } from "@/lib/nutrition/supplements";

/** "Do you use supplements?" + checklist of the ones the athlete owns. Field names: useSupplements, supplements. */
export function SupplementPicker({ use, selected }: { use?: boolean; selected?: string[] }) {
  const t = useTranslations("supplements");
  const lang = useLocale().startsWith("ar") ? "ar" : "en";
  const [on, setOn] = useState(!!use);

  return (
    <fieldset className="space-y-3">
      <legend className="label">{t("question")}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["no", "yes"] as const).map((v) => (
          <label key={v} className="option">
            <input type="radio" name="useSupplements" value={v} checked={on === (v === "yes")} onChange={() => setOn(v === "yes")} className="sr-only" />
            {t(v)}
          </label>
        ))}
      </div>
      <p className="footnote">{on ? t("pickHint") : t("noneHint")}</p>
      {on && (
        <div className="list-group divide-y divide-line bg-surface-2">
          {SUPPLEMENTS.map((s) => (
            <label key={s.id} className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 hover:bg-surface-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <input type="checkbox" name="supplements" value={s.id} defaultChecked={selected?.includes(s.id)} className="peer sr-only" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{s.name[lang]}</span>
                <span className="footnote">{s.foodId ? t("inMeals") : t("onSchedule")}</span>
              </span>
              <span className="grid size-6 shrink-0 place-items-center rounded-md border-2 border-subtle text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-bg" aria-hidden>
                <Check className="size-4" strokeWidth={3} />
              </span>
            </label>
          ))}
        </div>
      )}
      {on && <p className="footnote rounded-xl bg-warn/10 p-3 text-warn">{t("safety")}</p>}
    </fieldset>
  );
}
