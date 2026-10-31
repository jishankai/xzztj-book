# Repository Guidelines

## Project Overview

This repository publishes 《新续资治通鉴》, 季善凯’s re-edition of 清·毕沅’s historical work, as a Chinese-language reading/download site. It is a dependency-free static site with a vanilla JavaScript reader, not a framework application.

## Architecture & Data Flow

- GitHub Pages serves the repository root directly. The browser loads `index.html`, `assets/style.css`, and deferred `assets/app.js`. Raw TXT/PDF links remain functional without JavaScript.
- The 220 volume anchors are maintained in HTML. `assets/catalog.json` enriches them with source-derived emperor/reign headings for filtering; the optional `scripts/build_catalog.py` regenerates this committed data.
- The reader fetches only the selected TXT, safely creates text nodes, and renders headings/paragraphs in a native modal dialog. Its article owns scrolling; `#read/001`–`#read/220` and `#read/full` identify documents. Browser history controls reader navigation.
- No backend, database, dependency injection, or cross-device state exists. Guarded `localStorage` (`xzztj-reader-v1`) stores the last document/scroll fraction, font size, and theme. Fetch failures expose retry and original-source links; stale loads use `AbortController` plus a generation token.
- Keep resource URLs relative for deployment beneath a project path such as `/xzztj-book/`. Preserve UTF-8 filenames; browsers encode Chinese URL path segments when requesting them.
- Distinguish editions: the complete TXT has **110 reorganized volumes**; `txt/volumes/` has **220 files following original-book boundaries**. They are not interchangeable numbering schemes or necessarily slices of the current full text.

## Key Directories

- `assets/`: plain CSS, vanilla reader JavaScript, and committed catalog data; no third-party packages, external fonts, analytics, or preprocessing.
- `txt/`: UTF-8 full-book text; `txt/volumes/001.txt` through `220.txt` are the separately organized volume texts. Preserve three-digit filenames and ordered links.
- `pdf/`: checked-in horizontal and right-to-left vertical editions. These are editorial snapshots, not build outputs; their content may differ from the latest TXT.
- `scripts/`: optional Python-standard-library catalog maintenance, not a required site build.

## Development Commands

Run the documented preview from the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`.

There are **no build, test, lint, or formatter commands** configured. No dependency installation is needed. Publication is documented as GitHub Pages → Deploy from a branch → `main` → `/(root)`; committed and pushed changes publish under that setup.

After editing individual-volume text, run `python3 scripts/build_catalog.py` and commit `assets/catalog.json` with the source changes. This regenerates metadata, not PDFs or book text.

## Code Conventions & Common Patterns

- Preserve UTF-8, Chinese punctuation, attribution, and historical wording. Consult the full TXT’s `凡例` before editorial changes; do not invent facts or change quoted meaning.
- Use semantic HTML and native links. Preserve `lang="zh-CN"`, viewport metadata, section IDs (`about`, `downloads`, `volumes`), and navigation accessibility.
- Keep full-book TXT links downloadable via `download`; PDF links allow native browser preview.
- Follow descriptive lowercase CSS classes such as `.hero`, `.volume-card`, and `.reader-toolbar`; shared colors/typefaces use CSS custom properties. No formatter policy is configured; keep edits scoped and readable.
- Preserve semantic markup, keyboard focus, reduced-motion handling, and responsive layouts (notably `750px` for mobile). Use native dialog controls and keep reader text independently scrollable.
- Never insert book/query text through `innerHTML`. Reader search is literal, within the currently loaded document; catalog search only filters volume metadata. Preserve the distinction in UI copy.
- Replacing PDFs requires synchronizing filenames, links, version dates, and sizes. No PDF-generation, volume-splitting, or word-count tooling is provided. Catalog metadata preserves actual `○`/`◎` headings and never infers absent emperor names.

## Important Files

- `index.html`: homepage, static volume/download links, and reader DOM contract.
- `assets/style.css`: responsive homepage and paper/dark reader presentation.
- `assets/app.js`: catalog filtering, async reader loads, safe text rendering/search, history, preferences, and progress.
- `assets/catalog.json` and `scripts/build_catalog.py`: ready-to-serve metadata and deterministic regeneration.
- `txt/新续资治通鉴.txt`: full re-edition, preface, editorial principles, and footnotes.
- `README.md`: preview/deployment instructions, edition caveats, attribution, and rights. Public reading does not grant redistribution permission; no separate open license is provided.
- `.nojekyll`: empty marker for direct static publication; retain at the publishing root.
- `.gitignore`: ignores only `.DS_Store` and `Thumbs.db`.

## Runtime/Tooling Preferences

The deployed site needs only a static host and browser. Python 3 is the documented local-server option, not an application runtime dependency. No Node.js/Bun requirement, package manager, lockfile, runtime pin, GitHub Actions workflow, or build pipeline is defined. Keep ordinary content/layout changes dependency-free.

## Testing & QA

No automated test framework, suite, CI checks, or coverage threshold exists. Recommended manual QA after changes:

- Preview over HTTP; check section navigation, stylesheet loading, and the footer’s `README.md` link.
- Check catalog numeric/text/range filtering, empty state/reset, both editions, representative first/middle/last volumes, and all changed resources. Preserve the ordered `001`–`220` links.
- Exercise reader outline, current-document match navigation, previous/next boundaries, font/theme, saved-position restoration, direct hashes, browser Back/Forward, Escape, and keyboard focus.
- Check fetch failure/retry and unavailable-storage behavior. Verify actual TXT/PDF links, desktop/mobile layouts, reduced motion, and deployment beneath a project subdirectory.
- Allow documented PDF/TXT version differences. Report editorial corrections with filename, volume number, and quoted passage, as requested in `README.md`.
