# herdr website

The homepage is `index.html`. The documentation source is in `src/content/docs/` and is rendered by Astro Starlight.

```bash
bun install
bun run dev
bun run build
```

The build output is `dist/`. `.github/workflows/pages.yml` publishes it to GitHub Pages on pushes to `master` and manual dispatches.
