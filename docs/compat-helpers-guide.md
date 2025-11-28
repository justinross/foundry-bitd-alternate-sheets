# Compatibility Helpers (short version)

Why it exists: Foundry keeps moving APIs into namespaces, which breaks older globals and throws warnings. `scripts/compat.js` and `scripts/compat-helpers.js` wrap the moving targets so sheets, templates, and dialogs keep working without touching call sites.

What it does:
- Resolves “new first, old if missing”: each helper tries the modern namespaced API, then falls back to the legacy global (e.g., `foundry.appv1.sheets.ActorSheet ?? ActorSheet`).
- Centralizes template and text helpers: `loadHandlebarsTemplates`, `renderHandlebarsTemplate`, and `enrichHTML` are routed through one place.
- Wraps sheet registration: `registerDocumentSheet` handles Actors, Items, and other document types, delegating to the right API or legacy collection.
- Caches resolved classes/config: avoids re-looking up `DocumentSheetConfig` or sheet classes on every call.

How to use (practical):
- Import from `scripts/compat.js` when you need a moving API: `import { enrichHTML, generateRandomId } from "./compat.js";`
- Import from `scripts/compat-helpers.js` when registering sheets or loading templates: `import { registerDocumentSheet, loadTemplatesCompat } from "./compat-helpers.js";`
- Keep call sites simple—let the helpers pick the right API.

How to extend (copy/paste recipe):
1) Identify the new namespaced API and the legacy global.
2) Add a helper that prefers the new path and falls back to the old one.
3) Cache heavy lookups (configs/constructors) in a module-level variable.
4) Throw a clear error if neither path exists; don’t silently fail.

When not to use:
- One-off migrations can call the API directly if you only target a single version.
- Styling/layout code doesn’t belong here—these helpers are for API drift only.

Examples:
- Sheet registration: `registerDocumentSheet(CONFIG.Actor.documentClass, "bitd-alt", BladesAlternateActorSheet, { makeDefault: true });`
- Template loading: `await loadTemplatesCompat(["templates/character-sheet.hbs"]);`
- HTML enrichment: `const html = await enrichHTML(text, { secrets: false });`

## Dialog compatibility (short note)
- `scripts/lib/dialog-compat.js` wraps dialog creation so code can use one call site: it prefers DialogV2 and falls back to DialogV1.
- Why: DialogV2 lives in a Shadow DOM; styles must be inline and event handlers attached in a `render` callback. The helper centralizes those differences so calling code stays simple.
- Use it when adding/modifying dialogs: import the helper instead of calling Dialog/ DialogV2 directly, and keep the “inline styles + render callback” pattern from the crew picker.
