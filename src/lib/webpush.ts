import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const email = (process.env.VAPID_EMAIL || "admin@rms.com").trim();

  if (!publicKey || !privateKey) {
    console.warn("[webpush] VAPID keys not configured, skipping push");
    return false;
  }

  try {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("[webpush] Failed to configure VAPID:", err);
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  if (!ensureVapid()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { auth: sub.auth, p256dh: sub.p256dh },
          },
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        // If subscription is expired/invalid (410 Gone or 404), remove it
        if (
          error &&
          typeof error === "object" &&
          "statusCode" in error &&
          ((error as { statusCode: number }).statusCode === 410 ||
            (error as { statusCode: number }).statusCode === 404)
        ) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("[webpush] Send failed for subscription", sub.id, error);
        }
      }
    })
  );

  void results;
}
