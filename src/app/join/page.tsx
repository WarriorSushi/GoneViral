import type { Metadata } from "next";

import { JoinPageContent } from "@/components/join/join-page-content";

export const metadata: Metadata = { title: "Get listed" };
export const instant = false;

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ target?: string }>;
}) {
  return <JoinPageContent searchParams={searchParams} />;
}
