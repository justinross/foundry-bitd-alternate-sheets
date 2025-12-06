# AGENTS README

- Read `CONTRIBUTING.md` before making changes; it covers build commands, stylelint/metrics scripts (`npm run lint:css`, `npm run metrics:styles`), and CSS authoring expectations.
- SCSS lint is relaxed and SCSS-aware; vendor/legacy flexbox files are ignored. Keep lint clean.
- Rebuild styles after SCSS edits: `npm run build:css`.
- Track size/lines with `npm run metrics:styles` (prints SCSS line count and CSS bytes).
- Avoid reintroducing deleted legacy SCSS (`chat.scss`, `clock-sheet.scss`, `dialogs.scss`, `original-styles.scss`) unless there’s a clear need.
