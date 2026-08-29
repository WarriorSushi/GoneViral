import type { NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const response = await refreshSupabaseSession(request);
  if (request.nextUrl.pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
  }
  return response;
}

export const config = {
  // Auth refresh must not become a dependency of Dodo webhooks, public board
  // reads, or checkout callbacks. Only routes that consume the owner session
  // pass through this network boundary.
  matcher: ["/manage/:path*", "/admin/:path*", "/auth/:path*"],
};
