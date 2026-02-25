import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { routing } from "@/i18n/routing";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "rms-session";

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication
const protectedPatterns = ["/tables", "/notifications"];
const adminPatterns = ["/admin"];
const authPages = ["/pin-login", "/admin-login"];
// Display routes (kitchen/bar) are accessible without auth

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; name: string; role: string; jti: string };
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and PWA assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Apply intl middleware first for locale handling
  const response = intlMiddleware(request);

  // Extract the path without locale prefix
  const locales = routing.locales;
  let pathWithoutLocale = pathname;
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      pathWithoutLocale = pathname.slice(`/${locale}`.length) || "/";
      break;
    }
  }

  const session = await getSessionFromRequest(request);

  // If logged in and trying to access auth pages, redirect to appropriate dashboard
  // But allow servers to access admin-login (they need to switch to admin)
  if (session && authPages.some((p) => pathWithoutLocale.startsWith(p))) {
    const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || routing.defaultLocale;
    // Only redirect if already the right role for the page
    if (pathWithoutLocale.startsWith("/pin-login") && session.role === "SERVER") {
      return NextResponse.redirect(new URL(`/${locale}/tables`, request.url));
    }
    if (pathWithoutLocale.startsWith("/admin-login") && session.role === "ADMIN") {
      return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    }
    // Otherwise let them through (e.g. server accessing admin-login to switch accounts)
  }

  // Check protected routes
  const isProtected = protectedPatterns.some((p) => pathWithoutLocale.startsWith(p));
  const isAdmin = adminPatterns.some((p) => pathWithoutLocale.startsWith(p));

  if ((isProtected || isAdmin) && !session) {
    const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || routing.defaultLocale;
    const loginPath = isAdmin ? `/${locale}/admin-login` : `/${locale}/pin-login`;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  if (isAdmin && session && session.role !== "ADMIN") {
    const locale = locales.find((l) => pathname.startsWith(`/${l}`)) || routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/tables`, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*|sw\\.js).*)"],
};
