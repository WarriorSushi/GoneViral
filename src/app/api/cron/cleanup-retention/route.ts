import { readServerEnv } from "@/config/env/server";
import { deleteExpiredSiteVisitDedupe } from "@/server/analytics/site-visits";
import { deleteExpiredClickDedupe } from "@/server/clicks/outbound-redirect";

export async function GET(request: Request) {
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "unauthorized" },
      { headers: { "Cache-Control": "no-store" }, status: 401 },
    );
  }

  const [deletedClickDedupe, deletedSiteVisitDedupe] = await Promise.all([
    deleteExpiredClickDedupe(),
    deleteExpiredSiteVisitDedupe(),
  ]);
  return Response.json(
    { deletedClickDedupe, deletedSiteVisitDedupe },
    { headers: { "Cache-Control": "no-store" } },
  );
}
