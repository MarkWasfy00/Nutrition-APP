"use client";

import type { ReactNode } from "react";

export function PrintButton({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className="icon-btn no-print bg-surface" aria-label={label}>
      {icon ?? label}
    </button>
  );
}
