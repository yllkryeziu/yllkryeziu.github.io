# Ferret article

The article is a native post (`components/BlogFerret.tsx`) at `#work/ferret`.
Its interactive figures live in `components/post/FerretFigures.tsx` and run on
small example data; numbers from real repositories are written into the text and
captions with their source. The Ferret repository is private, so the post has no
repository link.

## Cover illustration

Asset: [`public/blog-previews/ferret.png`](../public/blog-previews/ferret.png)

Drawn by hand as SVG on October 3, 2026, at 1536 × 1024, to match the series'
cut-paper covers: four worktree cards whose threads gather into one shared index
board, with a few terracotta tiles as matches. [`ferret-cover/draw.py`](ferret-cover/draw.py)
writes the SVG; it was rendered with headless Chrome:

```sh
python3 draw.py
chrome --headless=new --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1536,1024 --screenshot=cover.png "file://$PWD/cover.html"
```
