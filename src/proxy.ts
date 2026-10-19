import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookie";

const PROTECTED_PAGES = [
  "/dashboard",
  "/projects",
  "/estimates",
  "/quotations",
  "/rate-book",
  "/settings",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPage = PROTECTED_PAGES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!protectedPage || request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/projects",
    "/projects/:path*",
    "/estimates",
    "/estimates/:path*",
    "/quotations",
    "/quotations/:path*",
    "/rate-book",
    "/rate-book/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
