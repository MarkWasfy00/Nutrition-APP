"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-primary w-full", pendingText, label, pressed }: {
  children: ReactNode; className?: string; pendingText?: ReactNode; label?: string; pressed?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-label={label} aria-pressed={pressed} aria-busy={pending}>
      {pending ? pendingText ?? <Spinner /> : children}
    </button>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 ${className}`} aria-hidden />;
}
