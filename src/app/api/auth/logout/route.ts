import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Invalidate session in DB before destroying cookie
    const session = await getSession();
    if (session?.jti) {
      await prisma.session.deleteMany({ where: { token: session.jti } });
    }

    await destroySession();
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Logout error:", error);
    // Still destroy cookie even if DB cleanup fails
    try { await destroySession(); } catch { /* ignore */ }
    return NextResponse.json({ data: { success: true } });
  }
}
