import type { NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  // Auth refresh must not become a dependency of Dodo webhooks, public board
  // reads, or checkout callbacks. Only routes that consume the owner session
  // pass through this network boundary.
  matcher: ["/manage/:path*", "/auth/:path*"],
};
