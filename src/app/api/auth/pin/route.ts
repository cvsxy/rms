import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

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
