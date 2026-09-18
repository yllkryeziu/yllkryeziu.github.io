# Blog media outside Git

The Mario post uses 19 MP4s and two JPEG posters, about 100 MiB in total. Store them as assets
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

## Initial migration

The fetch command and deployment step are prepared. The current clips remain tracked until
the release has been uploaded and a clean download has been verified. The ignore rules alone
do not remove already-tracked files or historical copies.

A cleanup preview in an isolated mirror of commit `66b8b56` reduced packed Git objects from
235.40 MiB to 7.45 MiB. The resulting source tree was checked against the original: only
`public/blj/`, `dist/` and `node_modules/` were excluded. The working repository and its remote
history were not rewritten.

1. Verify the current files with `npm run media:verify`.
2. With an authenticated GitHub CLI, create a draft release and upload the exact manifest files:

   ```sh
   gh release create blj-media-v1 public/blj/*.mp4 public/blj/*.jpg \
     --repo yllkryeziu/yllkryeziu.github.io --target main --draft \
     --title 'Mario blog media v1' \
     --notes 'Versioned footage and posters for the Mario reinforcement-learning post.'
   ```

3. Publish the reviewed release, then fetch into an empty directory and verify it:

   ```sh
   gh release edit blj-media-v1 --repo yllkryeziu/yllkryeziu.github.io --draft=false
   media_check_dir="$(mktemp -d)"
   npm run media:fetch -- "$media_check_dir"
   npm run media:verify -- "$media_check_dir"
   ```

4. Remove `public/blj/` and `dist/` from Git tracking while retaining local files, then commit
   the source changes. Confirm a clean build can fetch the released media before deployment.
5. Back up the repository and coordinate a one-time history rewrite. In a separate fresh mirror,
   use `git filter-repo --invert-paths --path public/blj/ --path dist/ --path node_modules/`.
   This removes earlier videos, generated builds, and accidentally committed dependencies.
   Check all affected branches and tags, including the media release tag, before replacing remote
   refs. Keep the release assets. The replacement requires explicit approval: commit IDs change
   and existing clones should be replaced or carefully realigned.

Without step 5, shallow clones and source ZIPs become smaller after untracking, but a full
clone still downloads historical video blobs. Adding LFS now would not remove those old
objects either. No history rewrite or remote publication is performed by the npm commands.
