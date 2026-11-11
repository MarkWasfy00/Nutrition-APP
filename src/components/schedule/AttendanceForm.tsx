"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";
import type { AttendanceStatus } from "@prisma/client";
import { saveAttendance } from "@/actions/schedule";
import { SubmitButton } from "../SubmitButton";

type Mark = AttendanceStatus | "";

/** Coach marks each expected athlete present or absent. Tapping the selected choice again clears it. */
export function AttendanceForm({ sessionId, athletes }: {
  sessionId: string; athletes: { id: string; name: string; status: AttendanceStatus | null }[];
}) {
  const t = useTranslations("schedule");
  const [marks, setMarks] = useState<Record<string, Mark>>(() => Object.fromEntries(athletes.map((a) => [a.id, a.status ?? ""])));
  const [state, action] = useActionState(saveAttendance.bind(null, sessionId), undefined);
  const values = Object.values(marks);
  const present = values.filter((v) => v === "PRESENT").length;
  const absent = values.filter((v) => v === "ABSENT").length;
  const toggle = (id: string, v: AttendanceStatus) => setMarks((m) => ({ ...m, [id]: m[id] === v ? "" : v }));

  return (
    <form action={action} className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="footnote tnum" aria-live="polite">{t("summary", { present, absent, unmarked: athletes.length - present - absent })}</p>
        {athletes.length > 1 && (
          <button type="button" className="btn-plain -me-2 shrink-0" onClick={() => setMarks(Object.fromEntries(athletes.map((a) => [a.id, "PRESENT"])))}>
            <CheckCheck className="size-5" aria-hidden />{t("markAllPresent")}
          </button>
        )}
      </div>
      <ul className="list-group divide-y divide-line">
        {athletes.map((a) => (
          <li key={a.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <input type="hidden" name={`a:${a.id}`} value={marks[a.id]} />
            <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
            <div role="group" aria-label={t("attendanceFor", { name: a.name })} className="flex shrink-0 rounded-xl bg-surface-2 p-1">
              {(["PRESENT", "ABSENT"] as const).map((v) => {
                const on = marks[a.id] === v;
                return (
                  <button key={v} type="button" aria-pressed={on} onClick={() => toggle(a.id, v)}
                    className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors ${
                      on ? (v === "PRESENT" ? "bg-ok/20 text-ok" : "bg-primary/25 text-accent") : "text-muted hover:text-fg"
                    }`}>
                    {t(v === "PRESENT" ? "present" : "absent")}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      {state?.ok && <p role="status" className="text-sm font-medium text-ok">{t("attendanceSaved")}</p>}
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{t(`errors.${state.error}`)}</p>}
      <SubmitButton className="btn-primary btn-lg w-full" pendingText={t("saving")}>{t("saveAttendance")}</SubmitButton>
    </form>
  );
}
