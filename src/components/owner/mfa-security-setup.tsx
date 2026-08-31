"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { determineMfaFlow, isValidTotpCode } from "@/domain/mfa";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Screen = "challenge" | "enroll" | "loading" | "verified";

const genericError =
  "We could not complete that security check. Try again with a fresh authenticator code.";

export function MfaSecuritySetup({
  refreshAdminAccess = false,
}: {
  refreshAdminAccess?: boolean;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();

    void Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]).then(([assurance, factors]) => {
      if (!active) return;
      if (assurance.error || factors.error) {
        setError(genericError);
        setScreen("enroll");
        return;
      }

      const mode = determineMfaFlow({
        currentLevel: assurance.data.currentLevel,
        forceChallenge: refreshAdminAccess,
        nextLevel: assurance.data.nextLevel,
        verifiedTotpFactorCount: factors.data.totp.length,
      });
      if (mode === "verified") {
        setScreen("verified");
        return;
      }
      if (mode === "challenge") {
        const factor = factors.data.totp[0];
        if (!factor) {
          setError(genericError);
          setScreen("enroll");
          return;
        }
        setFactorId(factor.id);
        setScreen("challenge");
        return;
      }
      setScreen("enroll");
    });

    return () => {
      active = false;
    };
  }, [refreshAdminAccess]);

  async function startEnrollment() {
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const enrollment = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "GoneViral.in staging administration",
      });
      if (enrollment.error) throw enrollment.error;
      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data.totp.qr_code);
    } catch {
      setError(genericError);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!factorId || !isValidTotpCode(verificationCode)) {
      setError("Enter the current six-digit code from your authenticator app.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const verification = await supabase.auth.mfa.verify({
        challengeId: challenge.data.id,
        code: verificationCode,
        factorId,
      });
      if (verification.error) throw verification.error;
      const assurance =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error || assurance.data.currentLevel !== "aal2") {
        throw new Error("The session did not reach AAL2.");
      }
      setVerificationCode("");
      setQrCode("");
      setScreen("verified");
      if (refreshAdminAccess) {
        router.replace("/admin");
      } else {
        router.refresh();
      }
    } catch {
      setError(genericError);
    } finally {
      setBusy(false);
    }
  }

  if (screen === "loading") {
    return (
      <section className="mfa-security-card" aria-busy="true">
        <p role="status">Checking this session’s security level…</p>
      </section>
    );
  }

  if (screen === "verified") {
    return (
      <section className="mfa-security-card mfa-security-success">
        <p className="eyebrow">AAL2 verified</p>
        <h2>This session has two-step verification</h2>
        <p>
          MFA proves control of this account. It does not grant an admin role;
          that remains a separate direct-database ceremony.
        </p>
      </section>
    );
  }

  const enrolling = screen === "enroll" && Boolean(qrCode);
  return (
    <section className="mfa-security-card" aria-labelledby="mfa-setup-title">
      <p className="eyebrow">
        {screen === "challenge"
          ? refreshAdminAccess
            ? "Fresh admin verification"
            : "Verify this session"
          : "Authenticator app"}
      </p>
      <h2 id="mfa-setup-title">
        {screen === "challenge"
          ? refreshAdminAccess
            ? "Refresh sensitive access"
            : "Enter your current code"
          : "Add two-step verification"}
      </h2>
      {screen === "challenge" ? (
        <p>
          {refreshAdminAccess
            ? "Sensitive admin changes require a fresh verification every 30 minutes. Enter the current six-digit code to return to the console."
            : "Use the six-digit code currently shown by your authenticator app."}
        </p>
      ) : enrolling ? (
        <p>
          Scan this QR code with your authenticator app. Do not photograph,
          share, or paste the QR code or its secret into chat.
        </p>
      ) : (
        <p>
          This creates a TOTP factor for the signed-in account. Starting setup
          does not grant administrative access.
        </p>
      )}

      {error ? (
        <p className="form-notice error-notice" role="alert">
          {error}
        </p>
      ) : null}

      {enrolling ? (
        <div className="mfa-qr-frame">
          <Image
            alt="Authenticator enrollment QR code"
            height={240}
            priority
            src={qrCode}
            unoptimized
            width={240}
          />
        </div>
      ) : null}

      {screen === "challenge" || enrolling ? (
        <form
          className="mfa-verification-form"
          onSubmit={(event) => {
            event.preventDefault();
            void verifyCode();
          }}
        >
          <label htmlFor="mfa-code">Six-digit authenticator code</label>
          <input
            autoComplete="one-time-code"
            disabled={busy}
            id="mfa-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            onChange={(event) =>
              setVerificationCode(event.target.value.replace(/\D/g, ""))
            }
            pattern="[0-9]{6}"
            required
            value={verificationCode}
          />
          <button
            className="button button-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? "Verifying…" : "Verify code"}
          </button>
        </form>
      ) : (
        <button
          className="button button-primary"
          disabled={busy}
          onClick={() => void startEnrollment()}
          type="button"
        >
          {busy ? "Starting…" : "Start authenticator setup"}
        </button>
      )}
    </section>
  );
}
