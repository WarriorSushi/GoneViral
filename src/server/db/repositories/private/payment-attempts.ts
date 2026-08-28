import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "../../client";
import { paymentAttempts } from "../../schema";

export async function findPaymentAttemptByPublicId(publicId: string) {
  const [attempt] = await getDatabase()
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.publicId, publicId))
    .limit(1);

  return attempt ?? null;
}
