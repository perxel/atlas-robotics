#!/usr/bin/env node
// Optimizes every JPEG in public/uploads in place, same filename. Filenames
// are load-bearing here: content/*.md reference them verbatim, same as
// compress-video.mjs's videos, so this rewrites each file's bytes, never its
// name.
//
// Uploaded originals come straight from stock-photo sources (routinely
// 4000-9500px wide, several MB each) — far larger than anything this site
// ever requests: next.config.ts's device/image sizes top out at 3840px, and
// next/image's `fit: "scale-down"` never upscales, so a source wider than
// that just wastes origin bytes without improving any served image.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, rmSync, statSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const UPLOADS_DIR = join(fileURLToPath(new URL("..", import.meta.url)), "public", "uploads");
const SHARP_BIN = join(fileURLToPath(new URL("..", import.meta.url)), "node_modules", ".bin", "sharp");

const MAX_WIDTH = process.env.OPTIMIZE_MAX_WIDTH ?? "2560";
const QUALITY = process.env.OPTIMIZE_QUALITY ?? "80";
const MIN_SIZE_MB = Number(process.env.OPTIMIZE_MIN_SIZE_MB ?? "0.5");
// Only replace the original if the re-encode saves at least this much —
// guards against re-compressing an already-optimized file into something
// bigger (re-encoding always loses a little quality, so it's only worth it
// for a real size win). Same guard/ratio as compress-video.mjs.
const MIN_SAVINGS_RATIO = 0.9;

const EXTENSIONS = new Set([".jpg", ".jpeg"]);

function formatKB(bytes) {
  return (bytes / 1024).toFixed(0) + "KB";
}

function optimizeOne(filePath) {
  const originalSize = statSync(filePath).size;
  if (originalSize < MIN_SIZE_MB * 1024 * 1024) {
    return { file: basename(filePath), skipped: "already small" };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "optimize-images-"));
  const tmpOut = join(tmpDir, basename(filePath));

  try {
    execFileSync(SHARP_BIN, [
      "-i",
      filePath,
      "-o",
      tmpDir,
      "-q",
      QUALITY,
      "-p",
      "--mozjpeg",
      "resize",
      MAX_WIDTH,
      "--withoutEnlargement",
    ]);
  } catch (err) {
    rmSync(tmpDir, { recursive: true, force: true });
    return { file: basename(filePath), error: err.stderr?.toString().slice(-500) ?? String(err) };
  }

  const newSize = statSync(tmpOut).size;
  if (newSize >= originalSize * MIN_SAVINGS_RATIO) {
    rmSync(tmpDir, { recursive: true, force: true });
    return { file: basename(filePath), skipped: "re-encode didn't save enough", originalSize, newSize };
  }

  // Same-directory rename only — cross-device rename (tmpdir -> project dir)
  // can throw EXDEV, so copy the bytes across, then drop the tmp dir.
  const finalTmp = filePath + ".optimizing" + extname(filePath);
  execFileSync("cp", [tmpOut, finalTmp]);
  rmSync(tmpDir, { recursive: true, force: true });
  renameSync(finalTmp, filePath);

  return { file: basename(filePath), originalSize, newSize };
}

function main() {
  if (!existsSync(UPLOADS_DIR)) {
    console.error(`No such directory: ${UPLOADS_DIR}`);
    process.exit(1);
  }
  if (!existsSync(SHARP_BIN)) {
    console.error("sharp-cli binary not found. Run `pnpm install` first.");
    process.exit(1);
  }

  const files = readdirSync(UPLOADS_DIR)
    .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()))
    .map((f) => join(UPLOADS_DIR, f));

  if (files.length === 0) {
    console.log("No JPEG files found in public/uploads.");
    return;
  }

  console.log(
    `Optimizing ${files.length} image(s) in public/uploads (max-width=${MAX_WIDTH}, quality=${QUALITY})...\n`
  );

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    process.stdout.write(`  ${basename(file)} ... `);
    const result = optimizeOne(file);
    if (result.error) {
      console.log(`FAILED\n    ${result.error}`);
      continue;
    }
    if (result.skipped) {
      console.log(`skipped (${result.skipped})`);
      continue;
    }
    totalBefore += result.originalSize;
    totalAfter += result.newSize;
    const pct = (100 * (1 - result.newSize / result.originalSize)).toFixed(0);
    console.log(`${formatKB(result.originalSize)} -> ${formatKB(result.newSize)} (-${pct}%)`);
  }

  if (totalBefore > 0) {
    const pct = (100 * (1 - totalAfter / totalBefore)).toFixed(0);
    console.log(`\nTotal: ${formatKB(totalBefore)} -> ${formatKB(totalAfter)} (-${pct}%)`);
    console.log("\nReview with `git status`/`git diff --stat` and commit deliberately — these are tracked binary files.");
  }
}

main();
