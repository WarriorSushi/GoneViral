import type { Metadata, Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { BackArrowIcon } from "@/components/icons/back-arrow-icon";
import { ListingEditForm } from "@/components/owner/listing-edit-form";
import { LogoUploadForm } from "@/components/owner/logo-upload-form";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { listPublicCategories } from "@/server/db/repositories/leaderboards";
import {
  listOwnerPendingChanges,
  requireOwnerListingBySlug,
} from "@/server/db/repositories/private/owners";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Edit listing",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const { slug } = await params;
  const [listing, categories, pending] = await Promise.all([
    requireOwnerListingBySlug(slug, user.id),
    listPublicCategories(),
    listOwnerPendingChanges(slug, user.id),
  ]);
  if (!listing) notFound();
  return (
    <main className="manage-main owner-edit-page" id="main-content">
      <Link className="owner-back-link" href={`/manage/${slug}` as Route}>
        <BackArrowIcon />
        <span>Listing overview</span>
      </Link>
      <p className="eyebrow">Owner edits</p>
      <h1>Edit {listing.name}</h1>
      <p>
        Small corrections can appear immediately. Changes to the business
        identity, website, or category are reviewed first. Your current public
        details stay visible during that review.
      </p>

      <section
        className="owner-edit-section"
        aria-labelledby="identity-edit-title"
      >
        <h2 id="identity-edit-title">Listing identity</h2>
        <ListingEditForm categories={categories} listing={listing} />
      </section>

      <section className="owner-edit-section" aria-labelledby="logo-edit-title">
        <h2 id="logo-edit-title">Logo</h2>
        {listing.logoUrl ? (
          <Image
            alt={`${listing.name} current logo`}
            height={96}
            sizes="96px"
            src={listing.logoUrl}
            width={96}
          />
        ) : (
          <p>No public logo. Your initial remains visible.</p>
        )}
        <LogoUploadForm slug={slug} />
      </section>

      <section
        className="owner-edit-section"
        aria-labelledby="pending-edit-title"
      >
        <h2 id="pending-edit-title">Pending review</h2>
        {pending.length === 0 ? (
          <p>No changes are waiting for review.</p>
        ) : (
          <ul>
            {pending.map((change) => (
              <li key={`${change.changeType}-${change.createdAt}`}>
                {change.changeType.replaceAll("_", " ")} · requested{" "}
                <time dateTime={change.createdAt}>
                  {new Date(change.createdAt).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
