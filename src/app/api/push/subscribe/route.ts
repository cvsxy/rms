import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const subscription = await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: { userId: session.userId, endpoint },
    },
    update: {
      auth: keys.auth,
      p256dh: keys.p256dh,
    },
    create: {
      userId: session.userId,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
    },
  });

  return NextResponse.json({ data: { id: subscription.id } }, { status: 201 });
}
