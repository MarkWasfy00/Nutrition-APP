"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";

export type FormState = { error?: string; ok?: boolean } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  adult: z.literal("on"),
  locale: z.string(),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "adult" ? "mustBeAdult" : field === "password" ? "passwordShort" : "invalid" };
  }
  const { name, email, password, locale } = parsed.data;
  if (await db.user.findUnique({ where: { email } })) return { error: "emailTaken" };
  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12), locale } });
  await signIn("credentials", { email, password, redirectTo: `/${locale}/onboarding` });
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const locale = String(form.get("locale") || "ar-EG");
  const next = String(form.get("next") || "");
  try {
    await signIn("credentials", {
      email: String(form.get("email") || "").toLowerCase(),
      password: String(form.get("password") || ""),
      redirectTo: next.startsWith(`/${locale}/`) ? next : `/${locale}/today`,
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "badCredentials" };
    throw e;
  }
}

export async function logout(locale: string) {
  await signOut({ redirectTo: `/${locale}` });
}
