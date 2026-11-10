"use client";

import { useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet on phones, centered dialog on larger screens. Native <dialog> gives focus trap + Esc. */
export function Sheet({ trigger, title, closeLabel, children, onClose }: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  closeLabel: string;
  children: (close: () => void) => ReactNode;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = () => ref.current?.showModal();
  const close = () => ref.current?.close();
  return (
    <>
      {trigger(open)}
      <dialog
        ref={ref}
        className="sheet"
        aria-label={title}
        onClose={onClose}
        onClick={(e) => { if (e.target === ref.current) close(); }}
      >
        <div className="rounded-t-3xl bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl">
          <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-surface-3 sm:hidden" aria-hidden />
          <div className="flex items-center justify-between px-4 pt-2">
            <h2 className="title">{title}</h2>
            <button type="button" onClick={close} className="icon-btn -me-2" aria-label={closeLabel}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="max-h-[75dvh] overflow-y-auto px-4 pb-2 pt-3">{children(close)}</div>
        </div>
      </dialog>
    </>
  );
}
