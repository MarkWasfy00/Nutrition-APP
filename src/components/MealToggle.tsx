import { Check } from "lucide-react";
import { togglePlanMeal } from "@/actions/food";
import { SubmitButton } from "./SubmitButton";

/** Round "eaten" check with a 44px hit area; state exposed via aria-pressed. */
export function MealToggle({ mealKey, logged, label }: { mealKey: string; logged: boolean; label: string }) {
  return (
    <form action={togglePlanMeal.bind(null, mealKey)} className="-m-2 shrink-0">
      <SubmitButton
        label={label}
        pressed={logged}
        className="grid size-11 place-items-center rounded-full"
        pendingText={<span className="size-6 animate-pulse rounded-full bg-surface-3" />}
      >
        <span className={`grid size-6 place-items-center rounded-full border-2 transition-colors ${logged ? "border-ok bg-ok text-bg" : "border-subtle"}`}>
          {logged && <Check className="size-3.5" strokeWidth={3.5} aria-hidden />}
        </span>
      </SubmitButton>
    </form>
  );
}
