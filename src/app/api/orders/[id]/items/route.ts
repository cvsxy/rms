import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusher } from "@/lib/pusher-server";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: orderId } = await params;
  const { items } = await request.json();

  const createdItems = [];

  for (const item of items) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId },
      include: { modifiers: true },
    });
    if (!menuItem) continue;

    // Skip unavailable (86'd) items
    if (!menuItem.available) continue;

    let unitPrice = Number(menuItem.price);
    const modifierData = [];
    if (item.modifierIds?.length) {
      for (const modId of item.modifierIds) {
        const mod = menuItem.modifiers.find((m) => m.id === modId);
        if (mod) {
          unitPrice += Number(mod.priceAdj);
          modifierData.push({ modifierId: mod.id, priceAdj: Number(mod.priceAdj) });
        }
      }
    }

    // Determine status based on course firing logic
    let itemStatus: "SENT" | "PENDING" = "SENT";
    let sentAt: Date | null = new Date();
    const courseNumber = item.courseNumber ?? null;

    if (courseNumber && courseNumber > 1) {
      // Check if this course has been fired already
      const firedCourse = await prisma.orderCourse.findUnique({
        where: { orderId_courseNumber: { orderId, courseNumber } },
      });
      if (!firedCourse || !firedCourse.firedAt) {
        // Course not fired yet — hold item as PENDING
        itemStatus = "PENDING";
        sentAt = null;
      }
    }

    // Auto-create/update OrderCourse records
    if (courseNumber) {
      if (courseNumber === 1) {
        // Course 1 is auto-fired
        await prisma.orderCourse.upsert({
          where: { orderId_courseNumber: { orderId, courseNumber: 1 } },
          create: { orderId, courseNumber: 1, firedAt: new Date() },
          update: { firedAt: new Date() },
        });
      } else {
        // Other courses: create record if it doesn't exist (unfired)
        await prisma.orderCourse.upsert({
          where: { orderId_courseNumber: { orderId, courseNumber } },
          create: { orderId, courseNumber },
          update: {},
        });
      }
    }

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity || 1,
        unitPrice,
        notes: item.notes || null,
        seatNumber: item.seatNumber ?? null,
        courseNumber,
        status: itemStatus,
        sentAt,
        modifiers: modifierData.length ? { create: modifierData } : undefined,
      },
      include: {
        menuItem: true,
        modifiers: { include: { modifier: true } },
      },
    });
    createdItems.push(orderItem);
  }

  // Deduct ingredient stock
  try {
    const menuItemIds = createdItems.map((i) => i.menuItemId);
    const menuItemIngredients = await prisma.menuItemIngredient.findMany({
      where: { menuItemId: { in: menuItemIds } },
    });

    const deductions: Record<string, number> = {};
    for (const ci of createdItems) {
      const qty = ci.quantity;
      const usages = menuItemIngredients.filter(
        (mi) => mi.menuItemId === ci.menuItemId
      );
      for (const usage of usages) {
        const key = usage.ingredientId;
        deductions[key] = (deductions[key] || 0) + Number(usage.quantity) * qty;
      }
    }

    if (Object.keys(deductions).length > 0) {
      await prisma.$transaction(
        Object.entries(deductions).map(([ingredientId, amount]) =>
          prisma.ingredient.update({
            where: { id: ingredientId },
            data: { currentStock: { decrement: amount } },
          })
        )
      );

      // Clamp any negative stock values to 0
      await prisma.ingredient.updateMany({
        where: {
          id: { in: Object.keys(deductions) },
          currentStock: { lt: 0 },
        },
        data: { currentStock: 0 },
      });

      // Auto-86: check for depleted ingredients and mark linked items unavailable
      const depletedIngredients = await prisma.ingredient.findMany({
        where: {
          id: { in: Object.keys(deductions) },
          currentStock: { lte: 0 },
        },
        select: { id: true, name: true },
      });

      if (depletedIngredients.length > 0) {
        const affectedLinks = await prisma.menuItemIngredient.findMany({
          where: { ingredientId: { in: depletedIngredients.map((i) => i.id) } },
          select: { menuItemId: true },
        });

        const affectedItemIds = [...new Set(affectedLinks.map((l) => l.menuItemId))];

        // Only 86 items that are currently available
        const itemsTo86 = await prisma.menuItem.findMany({
          where: { id: { in: affectedItemIds }, available: true },
          select: { id: true, name: true, nameEs: true },
        });

        if (itemsTo86.length > 0) {
          await prisma.menuItem.updateMany({
            where: { id: { in: itemsTo86.map((i) => i.id) } },
            data: { available: false },
          });

          // Notify via Pusher
          try {
            for (const item of itemsTo86) {
              await pusher.trigger("menu", "item-availability-changed", {
                menuItemId: item.id,
                available: false,
                itemName: item.name,
                itemNameEs: item.nameEs,
              });
            }
          } catch {
            // Pusher not configured — continue
          }
        }
      }
    }
  } catch (err) {
    console.error("[inventory] Failed to deduct stock:", err);
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: "SUBMITTED" },
    include: { table: true, server: { select: { id: true, name: true } } },
  });

  // Group items by destination and trigger Pusher events (only SENT items, not held PENDING)
  const sentItems = createdItems.filter((i) => i.status === "SENT");
  const kitchenItems = sentItems.filter((i) => i.menuItem.destination === "KITCHEN");
  const barItems = sentItems.filter((i) => i.menuItem.destination === "BAR");

  const orderPayload = {
    orderId,
    tableNumber: order.table.number,
    tableName: order.table.name,
    serverName: order.server.name,
  };

  try {
    if (kitchenItems.length > 0) {
      await pusher.trigger("kitchen", "new-items", {
        ...orderPayload,
        items: kitchenItems,
      });
    }
    if (barItems.length > 0) {
      await pusher.trigger("bar", "new-items", {
        ...orderPayload,
        items: barItems,
      });
    }
  } catch {
    // Pusher not configured yet — silently continue
  }

  return NextResponse.json({ data: createdItems }, { status: 201 });
}
