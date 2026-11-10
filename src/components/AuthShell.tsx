import type { ReactNode } from "react";
import { Brand } from "./Brand";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[env(safe-area-inset-top)]">
      <header className="flex h-16 items-center justify-between">
        <Brand />
        <LocaleSwitcher />
      </header>
      <main id="main" className="flex flex-1 flex-col justify-center pb-16">
        <h1 className="title-lg">{title}</h1>
        {subtitle && <p className="footnote mt-1.5 text-[0.9375rem]">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-center text-[0.9375rem] text-muted">{footer}</p>
      </main>
    </div>
  );
}
