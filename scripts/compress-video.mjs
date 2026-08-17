#!/usr/bin/env node
// Compresses every video in public/uploads in place, same filename. Filenames
// are load-bearing here: content/*.md reference them verbatim
// (e.g. `/uploads/automated-factory-conveyor-in-action.mp4` — see
// CoverMedia.tsx/Hero.tsx), so this rewrites each file's bytes, never its name.
//
// Every <video> rendered by this app (CoverMedia.tsx, Hero.tsx) is
// unconditionally `muted` with no audio UI — the audio track is always dead
// weight, so it's stripped (-an) rather than re-encoded. Set
// COMPRESS_KEEP_AUDIO=1 if that ever stops being true.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, renameSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, basename } from "node:path";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const UPLOADS_DIR = join(fileURLToPath(new URL("..", import.meta.url)), "public", "uploads");

const CRF = process.env.COMPRESS_CRF ?? "28";
const PRESET = process.env.COMPRESS_PRESET ?? "medium";
const KEEP_AUDIO = process.env.COMPRESS_KEEP_AUDIO === "1";
const MIN_SIZE_MB = Number(process.env.COMPRESS_MIN_SIZE_MB ?? "2");
// Only replace the original if the recompress saves at least this much —
// guards against re-compressing an already-optimized file into something
// bigger (re-encoding always loses a little quality, so it's only worth it
// for a real size win).
const MIN_SAVINGS_RATIO = 0.9;

const CODEC_ARGS = {
  ".mp4": ["-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
  ".m4v": ["-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
  ".mov": ["-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
  ".webm": ["-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0"],
};

function assertFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
  } catch {
    console.error("ffmpeg not found. Install it first: brew install ffmpeg");
    process.exit(1);
  }
}

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + "MB";
}

function compressOne(filePath) {
  const ext = extname(filePath).toLowerCase();
  const codecArgs = CODEC_ARGS[ext];
  if (!codecArgs) return null;

  const originalSize = statSync(filePath).size;
  if (originalSize < MIN_SIZE_MB * 1024 * 1024) {
    return { file: basename(filePath), skipped: "already small" };
  }

  const tmpDir = mkdtempSync(join(tmpdir(), "compress-video-"));
  const tmpOut = join(tmpDir, "out" + ext);

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        filePath,
        "-map_metadata",
        "-1",
        "-vf",
        "scale='min(1920,iw)':-2",
        ...codecArgs,
        ...(KEEP_AUDIO ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"]),
        tmpOut,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
  } catch (err) {
    return { file: basename(filePath), error: err.stderr?.toString().slice(-500) ?? String(err) };
  }

  const newSize = statSync(tmpOut).size;
  if (newSize >= originalSize * MIN_SAVINGS_RATIO) {
    rmSync(tmpDir, { recursive: true, force: true });
    return { file: basename(filePath), skipped: "recompress didn't save enough", originalSize, newSize };
  }

  // Same-directory rename only — cross-device rename (tmpdir -> project dir)
  // can throw EXDEV, so copy the bytes across, then drop the tmp dir.
  const finalTmp = filePath + ".compressing" + ext;
  execFileSync("cp", [tmpOut, finalTmp]);
  rmSync(tmpDir, { recursive: true, force: true });
  renameSync(finalTmp, filePath);

  return { file: basename(filePath), originalSize, newSize };
}

function main() {
  assertFfmpeg();
  if (!existsSync(UPLOADS_DIR)) {
    console.error(`No such directory: ${UPLOADS_DIR}`);
    process.exit(1);
  }

  const files = readdirSync(UPLOADS_DIR)
    .filter((f) => CODEC_ARGS[extname(f).toLowerCase()])
    .map((f) => join(UPLOADS_DIR, f));

  if (files.length === 0) {
    console.log("No video files found in public/uploads.");
    return;
  }

  console.log(`Compressing ${files.length} video(s) in public/uploads (crf=${CRF}, preset=${PRESET})...\n`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    process.stdout.write(`  ${basename(file)} ... `);
    const result = compressOne(file);
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
    console.log(`${formatMB(result.originalSize)} -> ${formatMB(result.newSize)} (-${pct}%)`);
  }

  if (totalBefore > 0) {
    const pct = (100 * (1 - totalAfter / totalBefore)).toFixed(0);
    console.log(`\nTotal: ${formatMB(totalBefore)} -> ${formatMB(totalAfter)} (-${pct}%)`);
    console.log("\nReview with `git status`/`git diff --stat` and commit deliberately — these are tracked binary files.");
  }
}

main();
