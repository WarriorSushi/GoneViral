import { readServerEnv } from "@/config/env/server";
import { revalidatePaymentResult } from "@/server/cache/revalidate-payment-result";
import { runPaymentReconciliation } from "@/server/payments/reconciliation";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  try {
    const summary = await runPaymentReconciliation({
      onProcessed: revalidatePaymentResult,
    });
    return Response.json(summary, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { status: "retry" },
      {
        headers: { "Cache-Control": "private, no-store, max-age=0" },
        status: 503,
      },
    );
  }
}
