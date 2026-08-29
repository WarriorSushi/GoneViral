import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { publicRefreshTags } from "@/server/cache/public-refresh";

function safeReturnPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (value === "/" || value === "/today") return value;
  if (/^\/category\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return value;
  return "/";
}

function isSameOriginHost(origin: string, requestHost: string | null): boolean {
  if (!requestHost) return false;
  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const requestHost = request.headers.get("host");
  if (origin && !isSameOriginHost(origin, requestHost)) {
    return new NextResponse(null, { status: 403 });
  }

  const formData = await request.formData();
  const returnTo = safeReturnPath(formData.get("returnTo"));
  for (const tag of publicRefreshTags(formData)) {
    revalidateTag(tag, { expire: 0 });
  }

  const redirectBase =
    origin ??
    `${request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")}://${requestHost ?? request.nextUrl.host}`;
  return NextResponse.redirect(new URL(returnTo, redirectBase), 303);
}
