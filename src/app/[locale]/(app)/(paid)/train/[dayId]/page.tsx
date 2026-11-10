import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePaidUser } from "@/lib/auth/guards";
import { today } from "@/lib/dates";
import { suggestNext } from "@/lib/training/progress";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkoutLogger, type LoggerExercise } from "@/components/WorkoutLogger";

export default async function WorkoutPage({ params }: { params: Promise<{ locale: string; dayId: string }> }) {
  const { locale, dayId } = await params;
  setRequestLocale(locale);
  const { user } = await requirePaidUser(locale);
  const day = await db.programDay.findFirst({
    where: { id: dayId, program: { plan: { userId: user.id } } },
    include: {
      exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
      workouts: { where: { userId: user.id }, include: { sets: true } },
    },
  });
  if (!day) notFound();
  const [t, format] = await Promise.all([getTranslations("train"), getFormatter()]);
  const workout = day.workouts[0] ?? null;
  const isAr = locale.startsWith("ar");

  const exercises: LoggerExercise[] = await Promise.all(
    day.exercises.map(async (pe) => {
      // Most recent previous session for this exercise (excluding this workout).
      const lastWorkout = await db.workoutLog.findFirst({
        where: { userId: user.id, id: workout ? { not: workout.id } : undefined, sets: { some: { exerciseId: pe.exerciseId } } },
        orderBy: { startedAt: "desc" },
        include: { sets: { where: { exerciseId: pe.exerciseId }, orderBy: { setNumber: "asc" } } },
      });
      const last = lastWorkout?.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })) ?? [];
      return {
        exerciseId: pe.exerciseId,
        name: isAr ? pe.exercise.nameAr : pe.exercise.nameEn,
        instructions: isAr ? pe.exercise.instructionsAr : pe.exercise.instructionsEn,
        sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, targetRpe: pe.targetRpe, restSec: pe.restSec,
        last,
        suggestion: suggestNext({ lastSets: last, plannedSets: pe.sets, repMin: pe.repMin, repMax: pe.repMax, isLowerBody: pe.exercise.isLowerBody }),
        logged: workout?.sets.filter((s) => s.exerciseId === pe.exerciseId).map((s) => ({ setNumber: s.setNumber, weightKg: s.weightKg, reps: s.reps, isPR: s.isPR })) ?? [],
      };
    }),
  );

  return (
    <div>
      <PageHeader
        back={{ href: `/train?week=${day.weekNumber}`, label: t("title") }}
        title={t(`focus.${day.focus}`)}
        subtitle={`${format.dateTime(new Date(`${day.day}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}${day.isDeload ? ` · ${t("deload")}` : ""}`}
      />
      <WorkoutLogger
        dayId={day.id}
        workoutId={workout?.id ?? null}
        finished={!!workout?.finishedAt}
        isToday={day.day <= today()}
        exercises={exercises}
      />
    </div>
  );
}
