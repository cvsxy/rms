import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  action: AuditAction;
  userId: string;
  orderId?: string;
  orderItemId?: string;
  details?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId,
        orderId: params.orderId ?? null,
        orderItemId: params.orderItemId ?? null,
        details: params.details ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to create audit log:", err);
  }
}
