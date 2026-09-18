# Blog media outside Git

The Mario media set contains 36 MP4s and two JPEG posters, about 220 MiB in total. Store them as assets
of a versioned GitHub Release. `blj.json` pins the repository, release tag, filenames, sizes
and SHA-256 hashes; the clips themselves do not need to be part of a source checkout.

`npm run media:fetch` downloads missing assets to `public/blj/`. Existing files are verified
and skipped; a mismatch fails without overwriting a local render. Downloads are verified in a
temporary directory before installation. `npm run media:verify` checks the local set without
network access. Both commands accept an optional destination directory after `--`.

GitHub Actions fetches the assets before Vite builds. The resulting Pages artifact contains
the videos at the same `/blj/` URLs as before. Browsers stream them from Pages, not the release
download endpoint. Local development and ordinary source clones do not need to download them.

Use a new release tag and update the manifest when footage changes. Do not overwrite a published
asset: a pinned release and checksum should continue to identify the same bytes.

## Published media

The current set is [blj-media-v2](https://github.com/yllkryeziu/yllkryeziu.github.io/releases/tag/blj-media-v2).
It retains the original files and adds all 17 speed-policy evolution clips, including the
reconstructed untrained network and every 100k checkpoint through 1M. New captures have no
warmup, so escape counts cover precisely the 15 seconds shown.

The initial set is [blj-media-v1](https://github.com/yllkryeziu/yllkryeziu.github.io/releases/tag/blj-media-v1).
All 21 files were downloaded again and checked against the manifest before the release was
published. The release tag points to source history without the video files.

The September 2026 migration removes historical `public/blj/`, generated `dist/`, and accidentally
committed `node_modules/` files from Git. This reduces packed history from about 235 MiB to
about 7.5 MiB. Existing clones should be replaced with a fresh clone after preserving any local
work; merging the old history back would reintroduce the large objects.

## Updating footage

1. Render the replacement files locally. Keep the filenames expected by the post.
2. Choose a new release tag and update `blj.json` with each file's byte size and SHA-256 hash.
3. Run `npm run media:verify` against the new manifest.
4. Upload the complete set as assets of a draft release, using GitHub's release editor or an
   authenticated GitHub CLI. Do not add the videos to a source commit.
5. Download the draft's assets to an empty directory and run
   `npm run media:verify -- /path/to/downloaded-assets` before publishing it.
6. Once published, test `npm run media:fetch -- /path/to/another-empty-directory`, then commit
   the updated manifest and any article changes. Deployment uses that pinned release.

No Git history rewrite is needed for subsequent media updates. The npm commands never publish
releases or modify Git history.
