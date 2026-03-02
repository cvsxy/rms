const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

/**
 * Check if WhatsApp Business API environment variables are configured.
 */
export function isWhatsAppConfigured(): boolean {
  return !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return { accessToken, phoneNumberId };
}

/**
 * Send a template message via WhatsApp Business API (Meta Cloud API).
 *
 * @param to - Recipient phone number in international format (e.g. "5215512345678")
 * @param templateName - Name of the approved message template
 * @param components - Template component objects (header, body, button params)
 * @returns The API response body, or null if WhatsApp is not configured
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  components: object[]
): Promise<Record<string, unknown> | null> {
  const { accessToken, phoneNumberId } = getConfig();

  if (!accessToken || !phoneNumberId) {
    console.warn(
      "[whatsapp] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set. Skipping template send."
    );
    return null;
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "es" },
        components,
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `[whatsapp] Template send failed (${res.status}):`,
      errorBody
    );
    return null;
  }

  return (await res.json()) as Record<string, unknown>;
}

/**
 * Send a free-form text message via WhatsApp Business API (Meta Cloud API).
 *
 * Note: Free-form messages can only be sent within a 24-hour customer service window
 * (i.e., the customer must have messaged you first within the last 24 hours).
 *
 * @param to - Recipient phone number in international format
 * @param text - The text message body
 * @returns The API response body, or null if WhatsApp is not configured
 */
export async function sendMessage(
  to: string,
  text: string
): Promise<Record<string, unknown> | null> {
  const { accessToken, phoneNumberId } = getConfig();

  if (!accessToken || !phoneNumberId) {
    console.warn(
      "[whatsapp] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set. Skipping message send."
    );
    return null;
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      `[whatsapp] Message send failed (${res.status}):`,
      errorBody
    );
    return null;
  }

  return (await res.json()) as Record<string, unknown>;
}
