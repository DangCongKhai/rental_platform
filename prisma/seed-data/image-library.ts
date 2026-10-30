import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as path from "node:path";

type LibraryImage = {
  file: string;
  storage_path: string;
  level: string;
  caption: string;
};

type ImageSet = {
  property_types: string[];
  unit_kinds: string[];
  images: LibraryImage[];
};

const root = path.join(process.cwd(), "prisma/seed-data/media");
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8")) as {
  sets: ImageSet[];
};

const metaCache = new Map<string, { sha256: string; sizeBytes: number }>();

export function libraryImagesFor(propertyType: string, unitKind: string, number: number): LibraryImage[] {
  const matches = manifest.sets.filter(
    (set) => set.property_types.includes(propertyType) && set.unit_kinds.includes(unitKind),
  );
  if (matches.length === 0) {
    throw new Error(`No image set matches ${propertyType} / ${unitKind}.`);
  }
  return matches[(number - 1) % matches.length].images;
}

export function libraryFileMeta(file: string): { sha256: string; sizeBytes: number } {
  const cached = metaCache.get(file);
  if (cached) return cached;
  const bytes = readFileSync(path.join(root, file));
  const meta = { sha256: createHash("sha256").update(bytes).digest("hex"), sizeBytes: bytes.length };
  metaCache.set(file, meta);
  return meta;
}

export function libraryFiles(): LibraryImage[] {
  return manifest.sets.flatMap((set) => set.images);
}
