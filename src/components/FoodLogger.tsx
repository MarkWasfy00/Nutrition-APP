"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Minus, Plus, Search } from "lucide-react";
import { addCustomFood, addFoodLog, searchFoods } from "@/actions/food";
import { Sheet } from "./ui/Sheet";
import { Spinner } from "./SubmitButton";

type Food = Awaited<ReturnType<typeof searchFoods>>[number];
const SLOTS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export function FoodLogger() {
  const t = useTranslations("today");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>("SNACK");
  const [custom, setCustom] = useState(false);
  const [opened, setOpened] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!opened) return;
    const id = setTimeout(() => start(async () => setResults(await searchFoods(q))), 200);
    return () => clearTimeout(id);
  }, [q, opened]);

  const reset = () => { setSelected(null); setCustom(false); setQ(""); setGrams(100); setOpened(false); };
  const name = (f: Food) => (locale.startsWith("ar") ? f.nameAr : f.nameEn);
  const k = grams / 100;

  return (
    <Sheet
      title={selected ? name(selected) : custom ? t("customFood") : t("addFood")}
      closeLabel={tc("close")}
      onClose={reset}
      trigger={(open) => (
        <button type="button" onClick={() => { setOpened(true); open(); }} className="btn-secondary btn-lg w-full">
          <Plus className="size-5" aria-hidden />{t("addFood")}
        </button>
      )}
    >
      {(close) => (
        <>
          {!selected && !custom && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-subtle" aria-hidden />
                <input type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchFood")}
                  aria-label={t("searchFood")} className="input ps-11" />
              </div>
              <ul className="list-group divide-y divide-line bg-surface-2" aria-busy={pending}>
                {results.map((f) => (
                  <li key={f.id}>
                    <button type="button" onClick={() => setSelected(f)} className="flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-start hover:bg-surface-3">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{name(f)}</span>
                        <span className="footnote tnum">{t("per100", { kcal: Math.round(f.kcal), p: f.proteinG })}</span>
                      </span>
                      <ChevronRight className="size-4 text-subtle rtl:rotate-180" aria-hidden />
                    </button>
                  </li>
                ))}
                {!pending && results.length === 0 && <li className="footnote px-4 py-4">{t("noResults")}</li>}
              </ul>
              <button type="button" onClick={() => setCustom(true)} className="btn-plain w-full">
                <Plus className="size-4" aria-hidden />{t("customFood")}
              </button>
            </div>
          )}

          {selected && (
            <div className="space-y-5">
              <div>
                <span className="label" id="grams-label">{t("grams")}</span>
                <div className="flex items-center gap-3" role="group" aria-labelledby="grams-label">
                  <button type="button" className="icon-btn bg-surface-2" aria-label={t("less")} onClick={() => setGrams((g) => Math.max(5, g - 10))}>
                    <Minus className="size-5" aria-hidden />
                  </button>
                  <input type="number" inputMode="numeric" min={1} max={3000} value={grams} aria-labelledby="grams-label"
                    onChange={(e) => setGrams(Number(e.target.value))} className="input text-center text-xl font-semibold tnum" />
                  <button type="button" className="icon-btn bg-surface-2" aria-label={t("more")} onClick={() => setGrams((g) => Math.min(3000, g + 10))}>
                    <Plus className="size-5" aria-hidden />
                  </button>
                </div>
              </div>
              <fieldset>
                <legend className="label">{t("meal")}</legend>
                <div className="grid grid-cols-4 gap-2">
                  {SLOTS.map((s) => (
                    <label key={s} className="option px-1 text-sm">
                      <input type="radio" name="slot" value={s} checked={slot === s} onChange={() => setSlot(s)} className="sr-only" />
                      {t(`slots.${s}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
                {([["kcal", selected.kcal], ["proteinG", selected.proteinG], ["carbsG", selected.carbsG], ["fatG", selected.fatG]] as const).map(([key, v]) => (
                  <div key={key}>
                    <dt className="caption">{t(`macro.${key}`)}</dt>
                    <dd className="text-lg font-semibold tnum">{Math.round(v * k)}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelected(null)} className="btn-secondary flex-1">{t("back")}</button>
                <button type="button" disabled={pending || grams <= 0} className="btn-primary flex-[2]"
                  onClick={() => start(async () => { await addFoodLog({ foodId: selected.id, grams, slot, locale }); close(); })}>
                  {pending ? <Spinner /> : t("log")}
                </button>
              </div>
            </div>
          )}

          {custom && (
            <form
              className="space-y-4"
              action={(fd) => start(async () => {
                const f = await addCustomFood({
                  name: String(fd.get("name")), kcal: Number(fd.get("kcal")), proteinG: Number(fd.get("proteinG")),
                  carbsG: Number(fd.get("carbsG")), fatG: Number(fd.get("fatG")),
                });
                setCustom(false); setSelected(f);
              })}
            >
              <div>
                <label className="label" htmlFor="cf-name">{t("foodName")}</label>
                <input id="cf-name" name="name" required minLength={2} className="input" />
              </div>
              <p className="footnote">{t("customHint")}</p>
              <div className="grid grid-cols-4 gap-2">
                {(["kcal", "proteinG", "carbsG", "fatG"] as const).map((n) => (
                  <div key={n}>
                    <label className="label" htmlFor={`cf-${n}`}>{t(`macro.${n}`)}</label>
                    <input id={`cf-${n}`} name={n} type="number" inputMode="decimal" min={0} step="0.1" required className="input px-2 text-center tnum" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCustom(false)} className="btn-secondary flex-1">{t("back")}</button>
                <button type="submit" disabled={pending} className="btn-primary flex-[2]">{pending ? <Spinner /> : t("save")}</button>
              </div>
            </form>
          )}
        </>
      )}
    </Sheet>
  );
}
