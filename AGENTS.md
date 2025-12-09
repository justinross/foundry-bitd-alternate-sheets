# AGENTS README

- Read `CONTRIBUTING.md` before making changes; it covers build commands, stylelint/metrics scripts (`npm run lint:css`, `npm run metrics:styles`), and CSS authoring expectations.
- SCSS lint is relaxed and SCSS-aware; vendor/legacy flexbox files are ignored. Keep lint clean.
- Rebuild styles after SCSS edits: `npm run build:css`.
- Track size/lines with `npm run metrics:styles` (prints SCSS line count and CSS bytes).
- Avoid reintroducing deleted legacy SCSS (`chat.scss`, `clock-sheet.scss`, `dialogs.scss`, `original-styles.scss`) unless there’s a clear need.

## NPC Integration & Dialogs (Dec 2025)
- **Vice Purveyors**:
    - Uses `smart-field` with `source="actor"`.
    - Filters available Actors based on `actor.system.vice` matching keywords in `npc.system.associated_crew_type` (strict lowercase contains check).
    - **Gotcha**: NPC description field is defined as `system.description_short` in template. `Utils.resolveDescription` handles fallback (`description_short` -> `description` -> `notes` -> `biography`).
- **Compendium Lookups**:
    - `Utils.getSourcedItemsByType` handles fetching from packs.
    - `searchAllPacks` setting (default: false) enables scanning *all* installed modules for matching documents, enabling homebrew support.
- **Dialogs (`scripts/lib/dialog-compat.js`)**:
    - Handles V1/V2 compatibility.
    - Card Chooser supports `description` property (rendered as tooltip `title` attribute on the card label).
