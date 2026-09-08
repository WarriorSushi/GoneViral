import { connection } from "next/server";

export default async function HowModalCatchAll() {
  await connection();
  return null;
}
