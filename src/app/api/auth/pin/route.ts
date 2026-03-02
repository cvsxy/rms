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

    const { pin } = await request.json();

    if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 6) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    // Find all active servers
    const servers = await prisma.user.findMany({
      where: { role: "SERVER", active: true, pin: { not: null } },
    });

    // Check PIN against each server
    let matchedServer = null;
    for (const server of servers) {
      if (server.pin && (await compare(pin, server.pin))) {
        matchedServer = server;
        break;
      }
    }

    if (!matchedServer) {
      recordFailure(ip);
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    clearFailures(ip);

    // Create session
    const jti = await createSession({
      userId: matchedServer.id,
      name: matchedServer.name,
      role: "SERVER",
    });

    // Store session in DB
    await prisma.session.create({
      data: {
        userId: matchedServer.id,
        token: jti,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      data: { userId: matchedServer.id, name: matchedServer.name, role: "SERVER" },
    });
  } catch (error) {
    console.error("PIN login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
