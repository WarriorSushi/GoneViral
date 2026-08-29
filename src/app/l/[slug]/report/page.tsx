import { randomUUID } from "node:crypto";

import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { readPublicEnv } from "@/config/env/public";
import { ReportForm } from "@/components/public/report-form";
import { toIstBusinessDate } from "@/domain/today";
import { getCachedPublicListingDetail } from "@/server/cache/public-read-model";

export const metadata: Metadata = { title: "Report a listing" };

export default async function ReportListingPage(props: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await props.params;
  const listing = await getCachedPublicListingDetail(
    slug,
    toIstBusinessDate(new Date()),
  );
  if (!listing) notFound();
  const environment = readPublicEnv();
  const localTurnstileToken = environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ? undefined
    : `local-pass-report-${randomUUID()}`;
  return (
    <main id="main-content" className="public-main join-page">
      <section className="join-heading">
        <p className="eyebrow">Trust & safety</p>
        <h1>Report {listing.name}</h1>
        <p>
          Reports go to a human queue. Report count alone never hides a listing
          or changes its paid rank.
        </p>
        <Link href={`/l/${slug}` as Route}>← Back to listing</Link>
      </section>
      <ReportForm
        localTurnstileToken={localTurnstileToken}
        slug={slug}
        turnstileSiteKey={environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </main>
  );
}
