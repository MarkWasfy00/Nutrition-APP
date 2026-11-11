"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";

/** Biomotor profile as a radar (0-100). Decorative: the caller renders the same numbers as text. */
export function AbilityRadar({ data }: { data: { label: string; score: number | null }[] }) {
  return (
    <div className="h-60" dir="ltr" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data.map((d) => ({ ...d, score: d.score ?? 0 }))} outerRadius="72%">
          <PolarGrid stroke="#3a3134" />
          <PolarAngleAxis dataKey="label" tick={{ fill: "#a89ea0", fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
          <Radar dataKey="score" stroke="#ff6b7a" fill="#ff6b7a" fillOpacity={0.3} strokeWidth={2} isAnimationActive={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
