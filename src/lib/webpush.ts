import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "admin@rms.com";

webpush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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
