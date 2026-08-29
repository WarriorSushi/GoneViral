import type { Metadata, Route } from "next";
import { connection } from "next/server";
import Link from "next/link";

import { ManageLinkForm } from "@/components/owner/manage-link-form";
import { Money } from "@/components/public/money";
import { claimPendingListingsForVerifiedUser } from "@/server/auth/claim-owner";
import { getVerifiedAuthUser } from "@/server/auth/session";
import { listOwnedListings } from "@/server/db/repositories/private/owners";

import { signOutOwner } from "./actions";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Manage your listings",
};

type ManagePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function statusLabel(lifecycle: string, moderation: string): string {
  if (moderation === "suspended") return "Suspended";
  if (moderation === "pending_review") return "In review";
  if (lifecycle === "active") return "Active";
  return lifecycle.replaceAll("_", " ");
}

export default async function ManagePage({ searchParams }: ManagePageProps) {
  await connection();
  const [user, query] = await Promise.all([
    getVerifiedAuthUser(),
    searchParams,
  ]);

  if (!user) {
    return (
      <main className="manage-main" id="main-content">
        <section className="manage-auth-card" aria-labelledby="manage-title">
          <p className="eyebrow">Owner access</p>
          <h1 id="manage-title">Manage your GoneViral listing</h1>
          <p>
            Enter the email used to pay. We’ll send a secure sign-in link if a
            listing is associated with it.
          </p>
          {query.error === "auth" ? (
            <p className="form-notice error-notice" role="alert">
              That sign-in link is invalid or expired. Request a fresh link.
            </p>
          ) : null}
          {query.signedOut === "1" ? (
            <p className="form-notice" role="status">
              You’re signed out on this device.
            </p>
          ) : null}
          <ManageLinkForm />
        </section>
      </main>
    );
  }

  await claimPendingListingsForVerifiedUser({
    email: user.email,
    userId: user.id,
  });
  const listings = await listOwnedListings(user.id);

  return (
    <main className="manage-main" id="main-content">
      <div className="manage-heading">
        <div>
          <p className="eyebrow">Private owner dashboard</p>
          <h1>Your listings</h1>
          <p>Ownership is verified from your active database relationship.</p>
        </div>
        <form action={signOutOwner}>
          <input name="next" type="hidden" value="/manage" />
          <button className="button button-secondary" type="submit">
            Sign out
          </button>
        </form>
      </div>

      {query.claimed === "1" ? (
        <p className="form-notice" role="status">
          Your verified payments have been claimed.
        </p>
      ) : null}

      {listings.length === 0 ? (
        <section className="owner-empty">
          <h2>No claimed listings yet</h2>
          <p>
            This signed-in email does not currently have an active owner
            relationship.
          </p>
        </section>
      ) : (
        <div className="owner-list">
          {listings.map((listing) => (
            <article className="owner-listing-card" key={listing.slug}>
              <div>
                <p className="owner-status">
                  {statusLabel(
                    listing.lifecycleStatus,
                    listing.moderationStatus,
                  )}
                </p>
                <h2>{listing.name}</h2>
              </div>
              <dl className="owner-metrics">
                <div>
                  <dt>Main rank</dt>
                  <dd>{listing.rank ? `#${listing.rank}` : "Not ranked"}</dd>
                </div>
                <div>
                  <dt>Confirmed total</dt>
                  <dd>
                    <Money paise={listing.confirmedTotalPaise} />
                  </dd>
                </div>
                <div>
                  <dt>Today</dt>
                  <dd>
                    <Money paise={listing.todayTotalPaise} />
                  </dd>
                </div>
              </dl>
              <Link
                className="button button-primary"
                href={`/manage/${listing.slug}` as Route}
              >
                View listing
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
