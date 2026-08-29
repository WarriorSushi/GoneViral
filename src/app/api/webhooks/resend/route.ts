import {
  processResendDeliveryEvent,
  verifyResendWebhook,
} from "@/server/email/resend-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event;
  try {
    event = verifyResendWebhook(rawBody, request.headers);
  } catch {
    return Response.json(
      { error: "invalid_webhook" },
      { headers: { "Cache-Control": "no-store" }, status: 400 },
    );
  }
  const result = await processResendDeliveryEvent(event);
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
