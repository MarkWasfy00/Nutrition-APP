import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function ListGroup({ title, footer, children, className = "" }: {
  title?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={className}>
      {title && <h2 className="section-label">{title}</h2>}
      <div className="list-group divide-y divide-line">{children}</div>
      {footer && <p className="footnote px-4 pt-2">{footer}</p>}
    </section>
  );
}

type RowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  value?: ReactNode;
  href?: string;
  tone?: "default" | "danger";
  chevron?: boolean;
};

export function ListRow({ title, subtitle, icon, value, href, tone = "default", chevron }: RowProps) {
  const body = (
    <>
      {icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-fg" aria-hidden>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block text-[0.9375rem] font-medium ${tone === "danger" ? "text-accent" : ""}`}>{title}</span>
        {subtitle && <span className="footnote block truncate">{subtitle}</span>}
      </span>
      {value != null && <span className="shrink-0 text-[0.9375rem] text-muted tnum">{value}</span>}
      {(chevron ?? !!href) && <ChevronRight className="size-4 shrink-0 text-subtle rtl:rotate-180" aria-hidden />}
    </>
  );
  const cls = "flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2.5 text-start";
  return href
    ? <Link href={href} className={`${cls} transition-colors hover:bg-surface-2`}>{body}</Link>
    : <div className={cls}>{body}</div>;
}
