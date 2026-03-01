import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { pusher } from "@/lib/pusher-server";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { available } = await request.json();

  const item = await prisma.menuItem.update({
    where: { id },
    data: { available },
  });

  try {
    await pusher.trigger("menu", "item-availability-changed", {
      menuItemId: id,
      available,
      itemName: item.name,
      itemNameEs: item.nameEs,
    });
  } catch {
    // Pusher not configured — continue
  }

  await createAuditLog({
    action: "ITEM_86D",
    userId: session.userId,
    details: {
      menuItemId: id,
      itemName: item.name,
      available,
    },
  });

  return NextResponse.json({ data: item });
}
