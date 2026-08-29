import { readServerEnv } from "@/config/env/server";
import { drainEmailOutbox } from "@/server/email/outbox";

export async function GET(request: Request) {
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "unauthorized" },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }
  return Response.json(await drainEmailOutbox(), {
    headers: { "Cache-Control": "no-store" },
  });
}
