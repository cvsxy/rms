import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  // Support both flat format { endpoint, auth, p256dh } and nested { endpoint, keys: { auth, p256dh } }
  const endpoint = body.endpoint;
  const auth = body.auth || body.keys?.auth;
  const p256dh = body.p256dh || body.keys?.p256dh;

  if (!endpoint || !auth || !p256dh) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: session.userId, endpoint },
    },
    update: {
      auth,
      p256dh,
    },
    create: {
      userId: session.userId,
      endpoint,
      auth,
      p256dh,
    },
  });

  return NextResponse.json({ data: { id: subscription.id } }, { status: 201 });
}
