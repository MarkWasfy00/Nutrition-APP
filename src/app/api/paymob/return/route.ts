import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

/** Browser redirect after Unified Checkout. Display only: access is granted by the webhook. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale = (routing.locales as readonly string[]).includes(cookieLocale ?? "") ? cookieLocale : routing.defaultLocale;
  const status = url.searchParams.get("success") === "true" ? "success" : "failed";
  return NextResponse.redirect(new URL(`/${locale}/billing?status=${status}`, url.origin));
}
