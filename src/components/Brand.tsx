import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-primary)" />
      <path d="M11 23V9h11M11 16h8" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  const t = useTranslations("app");
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 rounded-lg" aria-label={t("name")}>
      <Logo />
      <span className="text-[1.0625rem] font-bold tracking-tight" dir="ltr">Fuelx</span>
    </Link>
  );
}
