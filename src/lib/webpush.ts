import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const email = (process.env.VAPID_EMAIL || "admin@rms.com").trim();

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured");
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  vapidConfigured = true;
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
  ensureVapid();

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

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
        }
      }
    })
  );

  // Silently handle all results
  void results;
}
