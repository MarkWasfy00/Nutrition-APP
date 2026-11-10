import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";

/** Large-title page header (iOS style), with optional back link and trailing action. */
export function PageHeader({ title, subtitle, back, action }: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {back && (
        <Link href={back.href} className="-ms-2 mb-1 inline-flex min-h-11 items-center gap-0.5 rounded-lg pe-2 text-[0.9375rem] font-medium text-accent">
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
          {back.label}
        </Link>
      )}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="title-lg">{title}</h1>
          {subtitle && <p className="footnote mt-1">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
