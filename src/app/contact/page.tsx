import type { Metadata } from "next";

import { LegalPageShell } from "@/components/public/legal-page-shell";
import {
  LEGAL_EMAIL,
  LEGAL_PHONE_DISPLAY,
  LEGAL_PHONE_HREF,
} from "@/config/legal";
import { publicPageMetadata } from "@/config/seo";

export const metadata: Metadata = publicPageMetadata({
  description:
    "Contact, support, grievance, abuse-reporting, and urgent-safety details for GoneViral.in.",
  path: "/contact",
  title: "Contact and grievances",
});

export default function ContactPage() {
  return (
    <LegalPageShell
      title="Contact and grievances"
      description="Use these verified operator details for support, privacy, payment, rights, and grievance matters."
    >
      <section>
        <h2>Operator</h2>
        <p>
          GoneViral.in is operated by AltCorp, a proprietorship of Syed Irfan
          Ullah Quadri, registered in Karnataka, India.
        </p>
        <p>
          AltCorp is registered as a regular taxpayer under GST in Karnataka.
          Dodo Payments acts as merchant of record for customer transactions and
          supplies the customer transaction invoice under its terms. AltCorp’s
          registration details appear only on applicable tax documents it issues
          or receives.
        </p>
      </section>
      <section>
        <h2>Email and phone</h2>
        <p>
          Email: <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
          <br />
          Phone: <a href={`tel:${LEGAL_PHONE_HREF}`}>{LEGAL_PHONE_DISPLAY}</a>
        </p>
        <p>
          Do not send passwords, one-time codes, full payment-card details, or
          unnecessary sensitive personal information.
        </p>
      </section>
      <section>
        <h2>Public operator address</h2>
        <address>
          4th Cross Road, Noor Khan Colony, Kalaburagi, Karnataka 585104, India
        </address>
      </section>
      <section>
        <h2>Grievance officer</h2>
        <p>
          Syed Irfan Ullah Quadri is the Grievance Officer for privacy,
          consumer, content, intellectual-property, and service grievances and
          receives them at the email and mobile number above. Use a clear
          subject, identify the relevant listing or payment without exposing
          secrets, explain the issue, and include necessary evidence.
        </p>
        <p>
          We aim to acknowledge messages within 48 hours and resolve ordinary
          grievances within 30 days. Complex investigations, provider disputes,
          or legally constrained cases may take longer; we will provide an
          update where practicable.
        </p>
      </section>
      <section>
        <h2>Urgent safety and abuse</h2>
        <p>
          Use the Report link on a listing for ordinary listing abuse. Clearly
          mark credible imminent threats or child-safety concerns as urgent in
          email. If anyone is in immediate danger, contact local emergency
          services first. Rights owners should follow the procedure on our
          Copyright and trademark page.
        </p>
      </section>
    </LegalPageShell>
  );
}
