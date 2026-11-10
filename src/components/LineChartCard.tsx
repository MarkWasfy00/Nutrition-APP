"use client";

import { useLocale } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type Series = { key: string; label: string; color: string };

export function LineChartCard({ title, data, series, unit, empty }: {
  title: string; data: Record<string, string | number | null>[]; series: Series[]; unit?: string; empty: string;
}) {
  const rtl = useLocale().startsWith("ar");
  const last = data.at(-1);
  return (
    <section className="card" aria-label={title}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="headline">{title}</h2>
          {last && series[0] && last[series[0].key] != null && (
            <p className="mt-0.5 text-2xl font-bold tnum">{last[series[0].key]}<span className="ms-1 text-sm font-normal text-muted">{unit}</span></p>
          )}
        </div>
        {series.length > 1 && (
          <ul className="flex gap-3 text-xs text-muted">
            {series.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />{s.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      {data.length < 2 ? (
        <p className="footnote rounded-xl bg-surface-2 px-4 py-6 text-center">{empty}</p>
      ) : (
        <div className="h-44" dir="ltr" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="#2e2629" vertical={false} />
              <XAxis dataKey="label" reversed={rtl} tick={{ fill: "#a89ea0", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis orientation={rtl ? "right" : "left"} tick={{ fill: "#a89ea0", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} width={44} />
              <Tooltip
                cursor={{ stroke: "#3a3134" }}
                contentStyle={{ background: "#2c2427", border: "none", borderRadius: 12, color: "#f5f2f2", fontSize: 13 }}
                labelStyle={{ color: "#a89ea0" }}
              />
              {series.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2}
                  dot={false} activeDot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
