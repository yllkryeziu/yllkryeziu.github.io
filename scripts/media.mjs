import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'media/blj.json'), 'utf8'));
const [command, directory = join(root, 'public/blj')] = process.argv.slice(2);
const destination = resolve(directory);
// A mirror override also lets the complete download path be checked against a local HTTP server.
const baseUrl = process.env.MEDIA_BASE_URL
  ?? `https://github.com/${manifest.repository}/releases/download/${manifest.release}/`;

async function checkFile(path, entry) {
  let stat;
  try {
    stat = await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  if (!stat.isFile() || stat.size !== entry.bytes) {
    throw new Error(`${path}: expected a regular file of ${entry.bytes} bytes. Move it aside or update the manifest before fetching.`);
  }
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest('hex') !== entry.sha256) {
    throw new Error(`${path}: SHA-256 mismatch. The existing file has not been replaced.`);
  }
  return true;
}

async function fetchFile(entry, staging) {
  const url = new URL(entry.name, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  console.log(`Downloading ${entry.name}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) {
    throw new Error(`${entry.name}: HTTP ${response.status}. Check that release ${manifest.release} is published and contains this asset.`);
  }
  const path = join(staging, entry.name);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(path, { flags: 'wx' }));
  await checkFile(path, entry);
}

async function main() {
  if (!['fetch', 'verify'].includes(command) || process.argv.length > 4) {
    throw new Error('Usage: node scripts/media.mjs <fetch|verify> [destination directory]');
  }
  const names = new Set();
  for (const entry of manifest.files) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(mp4|jpg)$/.test(entry.name)
        || names.has(entry.name)
        || !/^[a-f0-9]{64}$/.test(entry.sha256)
        || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0) {
      throw new Error('Invalid media manifest entry');
    }
    names.add(entry.name);
  }

  const missing = [];
  for (const entry of manifest.files) {
    if (!await checkFile(join(destination, entry.name), entry)) missing.push(entry);
  }
  if (missing.length && command === 'verify') {
    throw new Error(`Missing ${missing.length} media files. Run npm run media:fetch.`);
  }
  if (!missing.length) {
    console.log(`Verified all ${manifest.files.length} media files; no download needed.`);
    return;
  }

  await mkdir(destination, { recursive: true });
  const staging = await mkdtemp(join(destination, '.download-'));
  try {
    // Wait for all workers before cleanup, including when one fails. Install only after every
    // download has passed its checksum, so a failed fetch never leaves a partial media set.
    let next = 0;
    const workers = await Promise.allSettled(Array.from({ length: 3 }, async () => {
      while (next < missing.length) {
        const entry = missing[next++];
        await fetchFile(entry, staging);
      }
    }));
    const failure = workers.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    for (const entry of missing) {
      await rename(join(staging, entry.name), join(destination, entry.name));
    }
    console.log(`Fetched and verified ${missing.length} files from ${manifest.release}.`);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
