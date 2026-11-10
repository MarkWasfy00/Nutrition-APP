import { Link } from "@/i18n/navigation";

/** Segmented control made of links (keeps state in the URL). */
export function Segmented({ label, items }: {
  label: string;
  items: { href: string; label: string; active: boolean; marker?: boolean }[];
}) {
  return (
    <nav aria-label={label} className="no-print flex rounded-xl bg-surface p-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={`relative flex min-h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
            i.active ? "bg-surface-3 text-fg" : "text-muted hover:text-fg"
          }`}
        >
          {i.label}
          {i.marker && <span className="absolute top-1.5 end-2 size-1.5 rounded-full bg-accent" aria-hidden />}
        </Link>
      ))}
    </nav>
  );
}
