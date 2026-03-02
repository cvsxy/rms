import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import {
  isWhatsAppConfigured,
  sendTemplate,
  sendMessage,
} from "@/lib/whatsapp";

const sendSchema = z
  .object({
    to: z.string().min(1),
    templateName: z.string().optional(),
    text: z.string().optional(),
    components: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .refine((data) => data.templateName || data.text, {
    message: "Either templateName or text must be provided",
  });

/**
 * POST /api/whatsapp/send — Send a WhatsApp message (template or free-form text)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  if (!isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { to, templateName, text, components } = parsed.data;

  let result: Record<string, unknown> | null = null;

  if (templateName) {
    result = await sendTemplate(to, templateName, components ?? []);
  } else if (text) {
    result = await sendMessage(to, text);
  }

  if (!result) {
    return NextResponse.json(
      { error: "Failed to send WhatsApp message" },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: result });
}
