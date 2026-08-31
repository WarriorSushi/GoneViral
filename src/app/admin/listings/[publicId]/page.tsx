import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { BackArrowIcon } from "@/components/icons/back-arrow-icon";
import { getAdminSession } from "@/server/admin/auth";
import { getAdminListingDetail } from "@/server/admin/read-model";

export const metadata: Metadata = { title: "Admin listing context" };

function safeJson(value: unknown) {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

export default async function AdminListingPage(props: {
  params: Promise<{ publicId: string }>;
}) {
  await connection();
  const auth = await getAdminSession();
  if (auth.kind !== "authenticated") notFound();
  const { publicId } = await props.params;
  const detail = await getAdminListingDetail(auth.session.role, publicId);
  if (!detail) notFound();
  return (
    <main id="main-content" className="public-main admin-page">
      <Link
        className="button button-secondary back-link"
        href={"/admin" as Route}
      >
        <BackArrowIcon />
        <span>Founder console</span>
      </Link>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Redacted operational context</p>
          <h1>{String(detail.listing.name)}</h1>
          <p>
            {String(detail.listing.lifecycle_status)} ·{" "}
            {String(detail.listing.moderation_status)} ·{" "}
            {String(detail.listing.destination_host)}
          </p>
        </div>
      </header>
      {Object.entries({
        "Immutable ledger": detail.ledger,
        "Payment attempts": detail.payments,
        Reports: detail.reports,
        "Moderation history": detail.moderation,
        "Admin audit": detail.audit,
      }).map(([title, rows]) => (
        <section className="admin-section" key={title}>
          <h2>{title}</h2>
          <div className="admin-grid">
            {rows.map((row, index) => (
              <article className="admin-card" key={`${title}-${index}`}>
                <pre>{safeJson(row)}</pre>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
