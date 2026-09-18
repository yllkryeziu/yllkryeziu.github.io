# yllkryeziu.github.io

Personal site built with React and Vite, deployed to GitHub Pages by GitHub Actions.

```sh
npm ci
npm run dev
```

For local video playback, run `npm run media:fetch`. It downloads the versioned Mario clips
only when they are missing and checks their SHA-256 hashes. Text, charts and the rest of the
site can be edited without the videos.

The deployment workflow fetches the media before building, so published video URLs stay at
`/blj/`. `npm run build` builds locally; `npx tsc --noEmit` checks types.

See [media storage and migration](media/README.md) for the release assets and the one-time
Git history cleanup, and [the footage notes](components/post/blj-media.md) for rendering details.
