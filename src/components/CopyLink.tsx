"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

/** Invite link for athletes: <origin>/<locale>/join/<code>, with a copy button. */
export function CopyInviteLink({ code }: { code: string }) {
  const t = useTranslations("coach");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  // The origin is only known in the browser; set it after hydration so server and client markup match.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/${locale}/join/${code}`;
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={link} aria-label={t("inviteLink")} dir="ltr" className="input min-w-0 flex-1 text-sm" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn-secondary shrink-0 px-3"
        onClick={async () => {
          try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span>{copied ? t("copied") : t("copy")}</span>
      </button>
    </div>
  );
}
