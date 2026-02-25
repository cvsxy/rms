import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getSession();

    if (session?.jti) {
      await prisma.session.deleteMany({ where: { token: session.jti } });
    }

    await destroySession();

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Logout error:", error);
    await destroySession();
    return NextResponse.json({ data: { success: true } });
  }
}
