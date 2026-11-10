import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/login", "/register"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const [, locale, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(locale)) {
    const path = "/" + rest.filter(Boolean).join("/");
    if (!PUBLIC_PATHS.has(path) && !req.auth) {
      const url = new URL(`/${locale}/login`, req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return intl(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
