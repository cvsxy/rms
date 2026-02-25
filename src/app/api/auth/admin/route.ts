import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const admin = await prisma.user.findFirst({
      where: { email, role: "ADMIN", active: true },
    });

    if (!admin || !admin.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const validPassword = await compare(password, admin.password);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const jti = await createSession({
      userId: admin.id,
      name: admin.name,
      role: "ADMIN",
    });

    await prisma.session.create({
      data: {
        userId: admin.id,
        token: jti,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      data: { userId: admin.id, name: admin.name, role: "ADMIN" },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
