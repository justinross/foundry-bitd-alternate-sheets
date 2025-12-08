# Repository Guidelines

## Project Structure & Module Organization
- `module.json` is the Foundry manifest; `scripts/` holds the ES modules for actor/class/item sheets, hooks, helpers, and migrations.
- `templates/` contains the Handlebars views; `styles/scss/` are the sources, `styles/css/` are the compiled outputs; `images/` and `languages/` provide assets and localization strings.
- `docs/` contains reference material (see `dialogv2-custom-styling-guide.md` for UI work and `compat-helpers-guide.md` for API drift helpers); `docker-compose.yml` spins up a local Foundry instance; keep relative paths stable so the manifest stays valid.

## Build, Test, and Development Commands
- Run Foundry locally: set `FVTT_USER`/`FVTT_PW`, then `docker-compose up` (listens on http://localhost:30000, mounts `/workspace/data` to `/data`).
- No bundler is used; edit JS/HBS directly. Rebuild styles after SCSS changes: `npm run build:css` (or directly `sass styles/scss/bitd-alt.scss styles/css/bitd-alt.css --style=compressed --source-map`).
- Releases are automated via GitHub Actions. Creating a release with a tag (e.g., `v1.0.0`) triggers a workflow that updates `module.json`, builds the zip, and attaches assets to the release.
- SCSS lint/metrics:
  - `npm run lint:css` runs stylelint on SCSS (SCSS-aware config, vendor/legacy flexbox files ignored, cosmetic rules relaxed to avoid noise).
  - `npm run metrics:styles` prints `scss_lines=<count> css_bytes=<bytes>` (SCSS excludes flexbox vendor folder; CSS is the minified output) to watch growth/shrinkage.

## Coding Style & Naming Conventions
- JavaScript: ES modules with `const`/`let`, two-space indent, double quotes, and semicolons; prefer async/await for Foundry hooks and migrations.
- Compatibility: Use `DialogV2` for Foundry V12+ support. Leverage `scripts/compat.js` and `scripts/compat-helpers.js` for cross-version compatibility layers.
- Templates: Handlebars helpers live in `scripts/handlebars-helpers.js`; keep partial names aligned with filenames and avoid inline logic that belongs in helpers.
- Templates: Handlebars helpers live in `scripts/handlebars-helpers.js`; keep partial names aligned with filenames and avoid listing inline logic that belongs in helpers.

### Updating Embedded Documents (Items/Effects)
- **Avoid Delete + Create**: When "replacing" a single item (e.g., swapping a Crew Ability or Changing Hunting Grounds), do **not** use `deleteEmbeddedDocuments` followed by `createEmbeddedDocuments`. This causes a race condition where the UI renders the "empty" state in between, leading to flickering or stale data display.
- **Use Atomic Updates**: Instead, find the existing document and use `updateEmbeddedDocuments` to transform it in place (update `name`, `img`, `system`, etc.). This ensures a single atomic change event, guaranteeing the UI updates instantly and correctly without gaps.
### CSS authoring expectations (alt sheets)
- Work in `styles/scss/` files. The entry point is `bitd-alt.scss` which imports others.
- **Run `npm run build:css`** (or `npm run watch:css`) to compile SCSS to `styles/css/bitd-alt.css`.
- Keep design tokens in `_variables.scss` or `_identity.scss` (colors, spacing, radii) and **add new values there first** instead of introducing literals.
- Use existing shared utilities and patterns: flex grid (`.row`/`.col-*`), visibility helpers (`.show-*`/`.hide-*`), label styles, checklist/ability list bases, and toggle styles. Prefer extending these rather than creating one-off variants.
- Keep selectors low-specificity and class-based; avoid IDs and descendant chains. Do not add `!important` outside the established visibility helpers.
- Spacing/size/typography: use the token scale (`--space-*`, `--alt-radius*`, label heights) and avoid pixel magic numbers. Font sizes/line-heights should come from a shared scale (or a single shared “display” size), not bespoke per-component tokens. If alignment requires adjustment, prefer tokenized values over negatives; document any unavoidable negative offsets inline with a short comment.
- Colors and backgrounds: use palette tokens (`--alt-*`) and avoid new hex literals. If a new semantic color is needed, add it as a token with a clear name before use.
- Layout consistency: reuse the gap/align conventions already present; avoid ad-hoc margins/padding when a shared utility or tokenized gap would work. If you spot repeated patterns (teeth, tabs, checklists), consolidate into shared rules instead of duplicating blocks.

### Ability cost bars (linked vs. independent)
- The "join-line" bars between multi-box abilities are meant only for gated, single-purchase abilities (you must fill all boxes to unlock the ability).
- Multi-level abilities (e.g., Veteran) improve per purchase and should **not** show join bars; treat each box as an independent rank.
- The template currently renders no join bars by default; if you need to reintroduce them for specific abilities, do it via a data-driven flag/helper (e.g., check a property that marks "requires full fill to unlock") rather than hard-coding ability names.

### Firefox flexbox + checkbox width calculation bug
- **Problem**: Firefox has a known bug where flex containers with `display: flex` or `display: inline-flex` do not correctly calculate `width: max-content` when containing checkbox `<input>` elements. The container computes a width smaller than its content, causing checkboxes to overflow and overlap with adjacent text.
- **Root cause**: Firefox calculates the flex container's intrinsic width based on font-size (e.g., `1em = 14px`) rather than the actual rendered width of checkbox children (which may be `20px`). This is compounded when the container itself is a flex item in a parent flex layout, as Firefox's flex shrinking algorithm ignores `width: max-content` directives.
- **Solution**: Use `display: inline-block` instead of any flex display mode for `.ability-checkboxes`. Combined with `white-space: nowrap`, this forces the container to shrink-wrap to its actual content width in all browsers without triggering Firefox's buggy flex intrinsic sizing.
- **Implementation details**:
  - Container: `display: inline-block; white-space: nowrap; vertical-align: top;`
  - Children (checkboxes): `display: inline-block; vertical-align: top; width: 1em; min-width: 1em;`
  - Join-lines: `display: inline-block; vertical-align: top; margin-top: 0.5em;` (centers them vertically relative to 1em-tall checkboxes)
- **DO NOT** switch back to `display: flex` or `display: inline-flex` for `.ability-checkboxes` without extensive cross-browser testing, especially in Firefox. The `inline-block` approach is simpler, more reliable, and works identically in Chrome and Firefox.
- **References**: This is documented as a known Firefox issue (see [flexbugs](https://github.com/philipwalton/flexbugs) and related Stack Overflow discussions on Firefox flex + checkbox width bugs).

## Testing Guidelines
- No automated suite exists; rely on manual Foundry verification.
- Smoke test: start the container, enable the module, create a character and class, confirm alternate sheets register by default, roll a skill, toggle edit/mini modes, and verify harm/coin/load dialogs function.
- Console Check: Always check the browser console (F12) for deprecation warnings or errors, ensuring clean operation on both V12 and V13.
- After migration changes, confirm `Migration.migrate()` runs once on ready and preserves existing actor data.

## Commit & Pull Request Guidelines
- Commit messages follow a short, imperative style (e.g., `Fix dialog cancel button`, `Remove debug console.log statements`); group related files per commit.
- PRs should describe user-facing behavior changes, target Foundry version(s), and migration impact; include before/after screenshots or GIFs for UI updates; link related issues when available.

## Security & Configuration Tips
- Keep credentials out of the repo; use env vars for Foundry secrets (`FVTT_USER`, `FVTT_PW`, `FOUNDRY_ADMIN_KEY`).
- Rotate test admin keys when using real-world data and avoid checking local-only files into version control.
