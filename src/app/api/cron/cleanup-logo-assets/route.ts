import { readServerEnv } from "@/config/env/server";
import { publishPreparedGuestLogos } from "@/server/storage/guest-logo-service";
import { cleanupExpiredLogoAssets } from "@/server/storage/logo-service";
import { SupabaseLogoStorage } from "@/server/storage/logo-storage";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = readServerEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  try {
    const storage = new SupabaseLogoStorage();
    const published = await publishPreparedGuestLogos(storage);
    const cleaned = await cleanupExpiredLogoAssets(storage);
    return Response.json(
      { cleaned, published },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
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
