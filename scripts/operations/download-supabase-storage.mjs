import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const [projectUrl, destinationRoot, ...buckets] = process.argv.slice(2);
const secretKey = process.env.GONEVIRAL_BACKUP_SUPABASE_SECRET_KEY;

if (!projectUrl || !destinationRoot || buckets.length === 0 || !secretKey) {
  throw new Error(
    "Storage backup requires a project URL, destination, buckets, and an in-process secret key.",
  );
}

const supabase = createClient(projectUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function safeDestination(bucketRoot, objectName) {
  const normalized = objectName.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe Storage object path in ${bucketRoot}.`);
  }

  const destination = path.resolve(bucketRoot, ...normalized.split("/"));
  const resolvedRoot = path.resolve(bucketRoot);
  if (!destination.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(
      `Storage object escaped its bucket destination: ${normalized}`,
    );
  }
  return destination;
}

async function listFiles(bucket, prefix = "") {
  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error)
      throw new Error(`Could not list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const objectName = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listFiles(bucket, objectName)));
      } else {
        files.push(objectName);
      }
    }
    if (data.length < 1000) break;
    offset += data.length;
  }

  return files;
}

let downloaded = 0;
for (const bucket of buckets) {
  const bucketRoot = path.resolve(destinationRoot, bucket);
  await mkdir(bucketRoot, { recursive: true });
  for (const objectName of await listFiles(bucket)) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(objectName);
    if (error)
      throw new Error(
        `Could not download ${bucket}/${objectName}: ${error.message}`,
      );
    const destination = safeDestination(bucketRoot, objectName);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(await data.arrayBuffer()));
    downloaded += 1;
  }
}

process.stdout.write(
  `Downloaded ${downloaded} Storage object(s) across ${buckets.length} bucket(s).\n`,
);
