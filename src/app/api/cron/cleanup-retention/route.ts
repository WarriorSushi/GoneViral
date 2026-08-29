import { readServerEnv } from "@/config/env/server";
import { deleteExpiredClickDedupe } from "@/server/clicks/outbound-redirect";

export async function GET(request: Request) {
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "unauthorized" },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }

  return Response.json(
    { deletedClickDedupe: await deleteExpiredClickDedupe() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
