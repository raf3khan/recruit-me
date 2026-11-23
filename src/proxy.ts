import { NextResponse, type NextRequest } from "next/server";

/** Sends "/" and any path without a language to the Arabic (default) or English version. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (/^\/(ar|en)(\/|$)/.test(pathname)) return;
  const prefersEnglish = (request.headers.get("accept-language") ?? "").toLowerCase().startsWith("en");
  const url = request.nextUrl.clone();
  url.pathname = `/${prefersEnglish ? "en" : "ar"}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
