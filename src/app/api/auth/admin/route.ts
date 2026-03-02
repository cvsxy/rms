import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

// In-memory rate limiting: max 5 failed attempts per IP per minute
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || now > entry.resetAt) return true;
  return entry.count < MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = failedAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    failedAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a moment." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const admin = await prisma.user.findFirst({
      where: { email, role: "ADMIN", active: true },
    });

    if (!admin || !admin.password) {
      recordFailure(ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const validPassword = await compare(password, admin.password);
    if (!validPassword) {
      recordFailure(ip);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    clearFailures(ip);

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
