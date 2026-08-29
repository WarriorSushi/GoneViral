import { z } from "zod";

export const REPORT_REASONS = [
  "harmful_illegal",
  "impersonation",
  "scam",
  "malware_phishing",
  "adult",
  "ip_counterfeit",
  "other",
] as const;

export const REPORT_REASON_LABELS: Record<
  (typeof REPORT_REASONS)[number],
  string
> = {
  adult: "Adult or sexual content",
  harmful_illegal: "Harmful or illegal activity",
  impersonation: "Impersonation",
  ip_counterfeit: "Copyright, trademark, or counterfeit",
  malware_phishing: "Malware or phishing",
  other: "Something else",
  scam: "Scam or misleading claim",
};

const reportSchema = z.object({
  email: z.union([z.literal(""), z.email().max(320)]),
  explanation: z.string().trim().min(20).max(2_000),
  reason: z.enum(REPORT_REASONS),
  turnstileToken: z.string().min(1).max(2_048),
});

export type ReportInput = z.infer<typeof reportSchema>;

export function validateReportForm(formData: FormData) {
  return reportSchema.safeParse({
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    explanation: String(formData.get("explanation") ?? ""),
    reason: String(formData.get("reason") ?? ""),
    turnstileToken: String(formData.get("turnstileToken") ?? ""),
  });
}
