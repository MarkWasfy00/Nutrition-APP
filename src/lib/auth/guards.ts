import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "../db";
import { userHasAccess } from "../subscription";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({ where: { id: session.user.id } });
}

/** Page guard: signed in, else /login. */
export async function requireUser(locale: string) {
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

/** Page guard: signed in + onboarded + active subscription. */
export async function requirePaidUser(locale: string) {
  const user = await requireUser(locale);
  const profile = await db.athleteProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect(`/${locale}/onboarding`);
  if (!(await userHasAccess(user.id))) redirect(`/${locale}/billing`);
  return { user, profile };
}

/** Server-action guards (throw instead of redirecting). */
export async function actionUser() {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function actionPaidUser() {
  const user = await actionUser();
  if (!(await userHasAccess(user.id))) throw new Error("SUBSCRIPTION_REQUIRED");
  return user;
}
