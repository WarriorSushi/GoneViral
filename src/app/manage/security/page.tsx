import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { BackArrowIcon } from "@/components/icons/back-arrow-icon";
import { MfaSecuritySetup } from "@/components/owner/mfa-security-setup";
import { getVerifiedAuthUser } from "@/server/auth/session";

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: "Account security",
};

export default async function ManageSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string | string[] }>;
}) {
  await connection();
  const user = await getVerifiedAuthUser();
  if (!user) redirect("/manage?error=session" as Route);
  const query = await searchParams;
  const refreshAdminAccess = query.reauth === "admin";

  return (
    <main className="manage-main mfa-security-page" id="main-content">
      <Link className="owner-back-link" href={"/manage" as Route}>
        <BackArrowIcon />
        <span>Your listings</span>
      </Link>
      <header className="mfa-security-heading">
        <p className="eyebrow">Account security</p>
        <h1>
          {refreshAdminAccess ? "Admin verification" : "Protect your account"}
        </h1>
        <p>
          {refreshAdminAccess
            ? "Enter your admin verification code to continue. Never share it."
            : "Set up or verify your authenticator for this signed-in account. Keep all codes and setup details private."}
        </p>
      </header>
      <MfaSecuritySetup refreshAdminAccess={refreshAdminAccess} />
    </main>
  );
}
