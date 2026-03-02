import { NextResponse } from "next/server";
import { getSession, SessionPayload } from "./auth";

/**
 * Require an authenticated session. Returns the session or a 401 response.
 */
export async function requireAuth(): Promise<
  { session: SessionPayload; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { session };
}

/**
 * Require an authenticated admin session. Returns the session or a 401/403 response.
 */
export async function requireAdmin(): Promise<
  { session: SessionPayload; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
