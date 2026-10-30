import "dotenv/config";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { libraryFiles } from "./seed-data/image-library";

const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "property-media";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before uploading seed media.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const root = path.join(process.cwd(), "prisma/seed-data/media");

async function main() {
  let uploaded = 0;
  let skipped = 0;

  for (const image of libraryFiles()) {
    const bytes = readFileSync(path.join(root, image.file));
    const { error } = await supabase.storage.from(bucket).upload(image.storage_path, bytes, {
      contentType: "image/webp",
      upsert: false,
    });
    if (!error) {
      uploaded += 1;
      continue;
    }
    if (/already exists|Duplicate/i.test(error.message)) {
      skipped += 1;
      continue;
    }
    console.error(image.storage_path, error.message);
    process.exit(1);
  }

  console.log(`Seed media: uploaded ${uploaded}, already present ${skipped}.`);
}

main();
