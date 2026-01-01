# Metrics Guide

Lightweight, repeatable code metrics to track DRY/refactor impact.

## What we measure
- **LOC/File counts**: via `cloc` (templates, scripts, styles).
- **Duplication**: via `jscpd` (JavaScript, Handlebars, SCSS).
- **JS Complexity**: via ESLint `complexity` rule (cyclomatic, top offenders).
- **Style size**: SCSS line count and CSS bytes (included in snapshots).
- **DRY counters**: partials and call sites in templates; SCSS partials and @use/@import counts.

Reports are written to `reports/metrics/`:
- `cloc.json`, `jscpd-report.json`, `complexity.json` (embedded in snapshot)
- `jscpd-report.html` (human-readable duplication report)
- `snapshot.json` (latest run)
- `snapshots/<label>.json` (labeled snapshots)

## Reproducibility
- Use the committed lockfile: `npm ci` (recommended for CI) or `npm install` for local dev.
- Metrics are dev-only; no runtime/bundle deps added.

## Commands
- Clean reports:  
  `npm run metrics:clean`

- Generate metrics (writes `reports/metrics/snapshot.json` and `snapshots/<label>.json`):  
  `npm run metrics`  
  Optional label: `npm run metrics -- --label before`

- Compare snapshots:  
  `npm run metrics:diff -- --baseline reports/metrics/snapshots/before.json --current reports/metrics/snapshots/after.json`

- Style size quick check (existing):  
  `npm run metrics:styles`

## Typical workflow
1) Capture a baseline before changes:  
   `npm run metrics -- --label before`
2) Make refactors/DRY changes.
3) Capture after:  
   `npm run metrics -- --label after`
4) Compare:  
   `npm run metrics:diff -- --baseline reports/metrics/snapshots/before.json --current reports/metrics/snapshots/after.json`

## Interpreting results
- **Duplication (jscpd)**: Prioritize lowering `%` and clone count; this matters more than raw LOC (LOC can rise while duplication drops).
- **LOC**: Track per-language; judge alongside duplication.
- **Complexity (ESLint complexity rule)**: Lower max cyclomatic and fewer high-complexity functions are better. Check offenders list in snapshot for hotspots.
- **CSS size**: SCSS lines/CSS bytes help watch bloat; interpret alongside functionality.
- **DRY counters**: Rising partial call sites without rising partial count can indicate consolidation; rising @use/@import may signal more shared styling.

## Scope & ignores
The metrics scripts scan:
- Templates: `templates/**/*.hbs`
- Styles: `styles/**/*.scss` (ignoring compiled CSS)
- Scripts: `scripts/**/*.js`

Ignored directories: `node_modules`, `dist`, `build`, `coverage`, `reports`, `styles/css`, `packs`, vendored/third-party code (`scripts/lib/**`, `**/*.min.js`).
Complexity/jscpd specifically exclude vendored code to reflect our code quality:
- Excludes: `scripts/lib/**`, `**/*.min.js`, plus the above ignored dirs
- Includes: repo scripts/templates/styles (see snapshot.scope for exact patterns)

## Troubleshooting
- **Complexity errors**: The ESLint-based complexity run should handle modern syntax; if you see an error status, rerun with `npm run metrics -- --label debug` and inspect snapshot.complexity.error.
- **Handlebars parsing in jscpd**: We explicitly set `--format "javascript,handlebars,scss"`; if templates are missed, ensure file extensions remain `.hbs`.
- **Missing CSS bytes**: Run `npm run build:css` before metrics if `styles/css/bitd-alt.css` is absent.

## CI note
No CI gating is enforced. If you add a CI job, run `npm run metrics` and publish `reports/metrics/` (including `jscpd-report.html`) as an artifact. No runtime/bundle dependencies were added; tools are dev-only.
