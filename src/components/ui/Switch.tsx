import type { ReactNode } from "react";

/** Accessible switch: a real checkbox with role="switch". */
export function Switch({ name, defaultChecked, label, description }: {
  name: string; defaultChecked?: boolean; label: ReactNode; description?: ReactNode;
}) {
  return (
    <label className="flex min-h-[3.25rem] cursor-pointer items-center gap-4 px-4 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {description && <span className="footnote block">{description}</span>}
      </span>
      <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-[1.9rem] w-[3.1rem] shrink-0 rounded-full bg-surface-3 transition-colors peer-checked:bg-ok
          peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent
          after:absolute after:top-[3px] after:start-[3px] after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform
          peer-checked:after:translate-x-[1.2rem] rtl:peer-checked:after:-translate-x-[1.2rem]"
      />
    </label>
  );
}
