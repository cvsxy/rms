export const ORDER_STATUSES = {
  OPEN: "OPEN",
  SUBMITTED: "SUBMITTED",
  COMPLETED: "COMPLETED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;

export const ORDER_ITEM_STATUSES = {
  PENDING: "PENDING",
  SENT: "SENT",
  PREPARING: "PREPARING",
  READY: "READY",
  SERVED: "SERVED",
  CANCELLED: "CANCELLED",
} as const;

export const PUSHER_CHANNELS = {
  KITCHEN: "private-kitchen",
  BAR: "private-bar",
  server: (userId: string) => `private-server-${userId}`,
  ADMIN: "private-admin",
} as const;

export const PUSHER_EVENTS = {
  NEW_ITEMS: "new-items",
  ITEM_STATUS_CHANGED: "item-status-changed",
  ITEM_READY: "item-ready",
  ORDER_CLOSED: "order-closed",
} as const;

export const TAX_RATE = parseFloat(process.env.NEXT_PUBLIC_TAX_RATE || "0.16");
