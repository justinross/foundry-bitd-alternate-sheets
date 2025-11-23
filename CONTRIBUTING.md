# Repository Guidelines

## Project Structure & Module Organization
- `module.json` is the Foundry manifest; `scripts/` holds the ES modules for actor/class/item sheets, hooks, helpers, and migrations.
- `templates/` contains the Handlebars views; `styles/scss/` are the sources, `styles/css/` are the compiled outputs; `images/` and `languages/` provide assets and localization strings.
- `docs/` contains reference material; `docker-compose.yml` spins up a local Foundry instance; keep relative paths stable so the manifest stays valid.

## Build, Test, and Development Commands
- Run Foundry locally: set `FVTT_USER`/`FVTT_PW`, then `docker-compose up` (listens on http://localhost:30000, mounts `/workspace/data` to `/data`).
- No bundler is used; edit JS/HBS directly. Rebuild styles after SCSS changes: `sass styles/scss/bitd-alt.scss styles/css/bitd-alt.css --style=compressed --source-map`.
- For release artifacts, zip the repo contents excluding VCS/editor cruft before uploading to a Foundry release.

## Coding Style & Naming Conventions
- JavaScript: ES modules with `const`/`let`, two-space indent, double quotes, and semicolons; prefer async/await for Foundry hooks and migrations.
- Templates: Handlebars helpers live in `scripts/handlebars-helpers.js`; keep partial names aligned with filenames and avoid inline logic that belongs in helpers.
- Styles: keep shared tokens/mixins in `styles/scss/mixin.scss`; prefer SCSS variables over hard-coded colors; match existing class naming.

## Testing Guidelines
- No automated suite exists; rely on manual Foundry verification.
- Smoke test: start the container, enable the module, create a character and class, confirm alternate sheets register by default, roll a skill, toggle edit/mini modes, and verify harm/coin/load dialogs function.
- After migration changes, confirm `Migration.migrate()` runs once on ready and preserves existing actor data.

## Commit & Pull Request Guidelines
- Commit messages follow a short, imperative style (e.g., `Fix dialog cancel button`, `Remove debug console.log statements`); group related files per commit.
- PRs should describe user-facing behavior changes, target Foundry version(s), and migration impact; include before/after screenshots or GIFs for UI updates; link related issues when available.

## Security & Configuration Tips
- Keep credentials out of the repo; use env vars for Foundry secrets (`FVTT_USER`, `FVTT_PW`, `FOUNDRY_ADMIN_KEY`).
- Rotate test admin keys when using real-world data and avoid checking local-only files into version control.
