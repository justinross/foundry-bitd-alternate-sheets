# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## System Audit Summary

**Module Type**: Foundry VTT Module (Sheet Replacement)
**System**: Blades in the Dark
**Foundry Compatibility**: V12+ (minimum: 12, verified: 13)
**ESM Compliance**: ✅ Full ESM with proper import/export
**DataModel Usage**: N/A (sheet module, extends system classes)

### Architecture Compliance Status

✅ **ESM Imports**: All scripts use ES6 import/export
✅ **Data Access**: Uses `.system.` (not legacy `.data.data`)
✅ **Application Compatibility**: Handles both ApplicationV1/V2
✅ **Dialog Compatibility**: V1/V2 compat layer in place
⚠️ **System Imports**: Uses hardcoded relative paths (see Technical Debt)

---

## Project Overview

This is a Foundry VTT module providing alternate character sheets for the Blades in the Dark system. It replaces the default character sheets with a custom implementation featuring:

- **Virtual item/ability lists** - Shows all available options for a playbook, not just owned items
- **Ghost slots** - Placeholder UI for cross-playbook abilities
- **Dynamic dialogs** - V1/V2 compatible with Shadow DOM support
- **Rich UI** - Built with Handlebars templates and SCSS
- **Multi-client safe** - Update queue pattern prevents concurrent update storms
- **Performance profiling** - Optional metrics logging for debugging

---

## Agent Routing Protocols

*Adhere to these delegation rules. Do not perform these tasks yourself if a specialized agent or tool is available.*

### New Features
- **Triggers:** "Add", "Build", "Create", "Implement [new thing]"
- **Action:** Suggest running `/feature-dev` command, or invoke the full feature-dev workflow.
- **Note:** If user didn't explicitly invoke `/feature-dev`, recommend it before proceeding.

### Architecture & Planning
- **Triggers:** "Plan", "Design", "Refactor strategy", "How should I structure..."
- **Action:** Delegate to `code-architect`.
- **Instruction:** Create a `PLAN.md` file before writing any code.

### Context & Exploration
- **Triggers:** "Where is...", "Explain how X works", "Map the project", "Find usage of..."
- **Action:** Delegate to `code-explorer`.
- **Note:** Do not use `grep` manually if the Explorer agent is available.

### External Research
- **Triggers:** "Look up", "Search for", "What is the latest API for..."
- **Action:** Use web search or configured search MCP.
- **Constraint:** Do not hallucinate APIs. If unsure, search first.

### Code Review & Quality
- **Triggers:** "Review this", "Audit", "Check for bugs", "Is this safe?"
- **Action:** Delegate to `code-reviewer`.

### Version Control
- **Triggers:** "Commit", "Save changes", "Push"
- **Action:** Use commit tooling if available, otherwise spawn Task for commit message drafting.
- **Prohibition:** Do not run raw `git commit` via Bash without a well-crafted message.

### Testing & QA
- **Triggers:** "Test", "Verify UI", "Check login flow"
- **Action:** Run appropriate test commands (`npm test`, etc.) or use browser automation MCP if configured.

---

## Development Commands

### SCSS Build (Required after any style changes)
```bash
npm run build:css         # Compile SCSS to CSS
npm run watch:css         # Watch and auto-compile SCSS changes
npm run lint:css          # Run stylelint on SCSS files
npm run metrics:styles    # Print SCSS line count and CSS byte size
```

### Local Foundry Testing
```bash
# 1. Set environment variables
export FVTT_USER="your_username"
export FVTT_PW="your_password"
export FOUNDRY_ADMIN_KEY="your_admin_key"

# 2. Start Foundry container
docker-compose up

# 3. Access at http://localhost:30000
```

**Note**: Module files are mounted into the container. Edit JS/HBS/SCSS directly (no bundler). Only SCSS requires compilation via `npm run build:css`.

### Code Quality & Metrics
```bash
npm run metrics           # Generate code metrics reports
npm run metrics:diff      # Compare metrics between snapshots
npm run metrics:clean     # Clean metrics reports directory
```

---

## Architecture & Code Structure

### Module Entry Point
**`scripts/module.js`** - ES module entry point (loaded via `module.json`):

```javascript
Hooks.once("init", ...) {
  // Register settings, Handlebars helpers, hooks
}

Hooks.once("ready", ...) {
  // Register sheets (deferred for V13+ compatibility)
  // Run migrations
}
```

**Why defer sheet registration to `ready`?** V13+ requires `DocumentSheetConfig` to be available, which isn't present during `init`. This avoids reliance on legacy globals that will vanish in V15.

### File Structure
```
scripts/
├── module.js                           # Entry point, hooks registration
├── blades-alternate-actor-sheet.js     # Character sheet class
├── blades-alternate-crew-sheet.js      # Crew sheet class
├── blades-alternate-class-sheet.js     # Playbook/class sheet class
├── blades-alternate-item-sheet.js      # Item sheet class (unused by default)
├── utils.js                            # Core utilities (sourced items, flags, etc.)
├── utils/
│   ├── collections.js                  # Actor/item filtering helpers
│   └── text.js                         # Description resolution, text utils
├── compat.js                           # V12/V13 API compatibility layer
├── compat-helpers.js                   # Sheet registration, template loading compat
├── migration.js                        # Data migrations (schema versioning)
├── settings.js                         # Module settings registration
├── handlebars-helpers.js               # Custom Handlebars helpers
├── blades-templates.js                 # Template preloading
├── hooks.js                            # Global hooks (clocks, chat, sheets)
├── clocks.js                           # Clock rendering & interactivity
├── profiler.js                         # Performance profiling (optional)
├── patches.js                          # Runtime patches/monkey patches
├── dice-so-nice.js                     # Dice So Nice integration
├── lib/
│   ├── dialog-compat.js                # DialogV1/V2 compatibility wrapper
│   ├── update-queue.js                 # Concurrent update serialization
│   ├── sheet-helpers.js                # Shared sheet utilities
│   └── sortablejs/                     # Vendor: SortableJS
├── sheets/
│   └── actor/
│       └── smart-edit.js               # Smart field system (choosers, NPCs)
└── ui/
    └── dockable-sections.js            # Collapsible sections UI

templates/
├── actor-sheet.html                    # Character sheet template
├── crew-sheet.html                     # Crew sheet template
├── class-sheet.html                    # Class/playbook sheet template
├── item-sheet.html                     # Item sheet template
└── parts/                              # Handlebars partials
    ├── ability.html
    ├── acquaintance-body.html
    ├── attributes.html
    ├── coins.html
    ├── crew-ability.html
    ├── harm.html
    ├── item.html
    ├── load.html
    └── ... (20+ partials)

styles/scss/
├── bitd-alt.scss                       # Entry point (imports all partials)
├── import/
│   ├── _variables.scss                 # Design tokens (colors, spacing, radii)
│   ├── _identity.scss                  # Branding colors
│   ├── character-sheet.scss            # Character sheet styles
│   ├── crew-sheet.scss                 # Crew sheet styles
│   ├── clocks.scss                     # Clock SVG styles
│   ├── general-styles.scss             # Shared base styles
│   └── flexbox/                        # Grid system, visibility utilities
└── ... (compiled to styles/css/bitd-alt.css)
```

---

## Core Architecture Patterns

### 1. Virtual Lists & Sourced Items

**Problem**: Default Foundry sheets only show owned items. BitD sheets need to show ALL available items for a playbook (even unowned), mimicking the official character sheets.

**Solution**: `Utils.getSourcedItemsByType()` fetches items from:
- Actor's owned items
- World items
- Compendium packs (configurable via `searchAllPacks` setting)

**Usage**:
```javascript
const items = await Utils.getSourcedItemsByType(actor, "item", {
  playbook: playbookName
});
// Returns virtual list: owned + available (not owned)
```

**Ghost Slots**: Placeholder UI elements for cross-playbook abilities, allowing visual representation of empty ability slots.

### 2. Update Queue Pattern

**Problem**: In multi-client Foundry sessions, concurrent updates from hooks can cause race conditions and update storms.

**Solution**: `scripts/lib/update-queue.js` provides `queueUpdate(fn)` to serialize document updates.

**Usage**:
```javascript
import { queueUpdate } from "./lib/update-queue.js";

queueUpdate(async () => {
  await actor.update({ "system.stress.value": newValue });
});
```

**Critical Rules** (from `docs/performance-update-guidelines.md`):
1. **Guard with ownership checks**: Only update when `isOwner` or `isGM`
2. **Skip no-op updates**: Compare target state before calling `actor.update()`
3. **Batch updates**: Combine multiple field changes into single update object
4. **Limit rerenders**: Only rerender owned, currently-open sheets

### 3. Compatibility Layer (V12/V13)

**Files**: `scripts/compat.js`, `scripts/compat-helpers.js`

**Problem**: Foundry V13 moved APIs into namespaces (e.g., `ActorSheet` → `foundry.appv1.sheets.ActorSheet`). Direct global access triggers deprecation warnings.

**Solution**: Wrapper functions that try modern API first, fall back to legacy:

```javascript
// compat.js
export function enrichHTML(content, options) {
  const TextEditor = foundry.appv1?.TextEditor ?? globalThis.TextEditor;
  return TextEditor.enrichHTML(content, options);
}

// compat-helpers.js
export function registerDocumentSheet(docClass, namespace, sheetClass, options) {
  const sheetConfig = foundry.applications?.api?.DocumentSheetConfig ?? DocumentSheetConfig;
  // ... handles registration across versions
}
```

**Import from compat, not globals**:
```javascript
// ❌ Bad (direct global)
import { ActorSheet } from "somewhere";

// ✅ Good (compat wrapper)
import { enrichHTML } from "./compat.js";
```

### 4. Dialog System (V1/V2 Compat)

**File**: `scripts/lib/dialog-compat.js`

**Problem**: Foundry V12+ uses `DialogV2` with Shadow DOM. External CSS and `<style>` tags don't work. Inline event handlers are stripped.

**Solution**: `openCardSelectionDialog()` detects V1/V2 and adapts:

- **V2**: All styles inline, event listeners attached in `render` callback
- **V1**: Traditional approach

**See**: `docs/dialogv2-custom-styling-guide.md` for Shadow DOM patterns.

### 5. Data Storage (Flags)

Character data uses Foundry's actor/item system + custom flags:

```javascript
// Multi-dot ability progress (keyed by ability ID)
actor.getFlag("bitd-alternate-sheets", "multiAbilityProgress");
// → { "abilityId123": 2, "abilityId456": 1 }

// Equipped items (Object map, NOT array!)
actor.getFlag("bitd-alternate-sheets", "equipped-items");
// → { "itemId123": { id: "itemId123", ... }, ... }

// Cross-playbook ability slots
actor.getFlag("bitd-alternate-sheets", "added-ability-slots");
// → ["slotId1", "slotId2", ...]
```

**Critical**: When replacing embedded documents, use `updateEmbeddedDocuments` (atomic) instead of `deleteEmbeddedDocuments` + `createEmbeddedDocuments` (causes UI flicker).

### 6. Smart Fields

**File**: `scripts/sheets/actor/smart-edit.js`

Dynamic fields that open chooser dialogs based on `data-source` attribute:

```html
<input data-source="actor" data-filter-path="system.vice" ...>
```

- `source="actor"` → Opens NPC/actor chooser with filtering
- `source="item"` → Opens item chooser from world/compendia

**Description Resolution**: `Utils.resolveDescription()` handles fallback chain:
```
system.description_short → system.description → system.notes → system.biography
```

### 7. Clock System

**File**: `scripts/clocks.js`

Interactive SVG clocks that work in journals, chat, sheets:

- **Global event delegation** - Works anywhere in Foundry UI
- **Chat snapshot** - Preserves clock state at message creation time
- **Click to increment** - Right-click to decrement

### 8. Migration System

**File**: `scripts/migration.js`

Runs once per world (tracked by `schemaVersion` setting):

```javascript
Migration.migrate() {
  // v0 → v1: equipped items array → object
  // v0 → v1: clean orphaned ability progress flags
  // v0 → v1: migrate legacy fields
}
```

---

## CSS Architecture

### Build Process
1. Edit files in `styles/scss/`
2. Run `npm run build:css` (or `npm run watch:css`)
3. Output: `styles/css/bitd-alt.css` (compressed + source map)

### Design Tokens
**Always use tokens, never hardcode values:**

```scss
// ✅ Good
.my-component {
  padding: var(--space-md);
  border-radius: var(--alt-radius-sm);
  background: var(--alt-primary);
}

// ❌ Bad
.my-component {
  padding: 8px;
  border-radius: 4px;
  background: #800000;
}
```

**Token files**:
- `_variables.scss` - Spacing, radii, sizes
- `_identity.scss` - Brand colors

### Grid System (Flexbox Utilities)
```scss
.row { display: flex; }
.col-1 { flex: 0 0 8.333%; }
.col-2 { flex: 0 0 16.666%; }
// ... up to .col-12

.show-mini { /* visible only in mini mode */ }
.hide-mini { /* hidden in mini mode */ }
```

### Critical Firefox Bug

**DO NOT use `display: flex` for `.ability-checkboxes`**

**Problem**: Firefox has a known bug where flex containers with checkbox `<input>` elements miscalculate `width: max-content`, causing overflow.

**Solution**: Use `display: inline-block` with `white-space: nowrap`.

```scss
// ✅ Correct
.ability-checkboxes {
  display: inline-block;
  white-space: nowrap;
  vertical-align: top;
}

// ❌ DO NOT REVERT TO THIS
.ability-checkboxes {
  display: flex; // Breaks in Firefox!
}
```

**See**: `CONTRIBUTING.md` lines 42-50 for full documentation.

### Ability Cost Bars

**Join-line bars** (connecting multi-box abilities) should only appear for **gated abilities** (must fill all boxes to unlock).

**Multi-level abilities** (e.g., Veteran) should NOT show join bars; each box is an independent rank.

**Control via data-driven flags**, not hardcoded ability names.

---

## Handlebars System

### Template Loading
**`scripts/blades-templates.js`** - Preloads all partials in `templates/parts/`

Templates are referenced by path relative to module root:
```javascript
"modules/bitd-alternate-sheets/templates/actor-sheet.html"
```

### Custom Helpers
**`scripts/handlebars-helpers.js`** registers helpers:

```handlebars
{{times 5}} ... {{/times}}              <!-- Loop 5 times -->
{{toLowerCase "Hello"}}                 <!-- "hello" -->
{{eq value 5}}                          <!-- boolean -->
{{or val1 val2}}                        <!-- boolean -->
```

**Keep template logic minimal** - Move complex logic to helpers.

---

## Performance & Profiling

### Enable Profiling
1. **Configure Settings → Module Settings → BitD Alternate Sheets**
2. Enable **"Enable performance profiling logs"** (client-side, defaults off)
3. Open browser console, filter for `bitd-alt-profiler`

### Logged Events
- `clockIncrement` / `clockDecrement` - Clock interactions
- `abilityToggle` - Ability tooth bar toggles
- `crewUpgradeToggle` - Crew upgrade checkboxes

### Multi-Client Safety Checklist
Before merging new code that modifies documents:

1. ✅ Will this update fire on every client? → Guard with `isOwner` / `isGM`
2. ✅ Multiple sequential updates? → Batch into single `update()` call
3. ✅ High-frequency handler? → Add debouncing or early exits
4. ✅ Does new state differ from current? → Skip no-op updates
5. ✅ Will I rerender other sheets? → Only rerender owned & open sheets

---

## Technical Debt & Refactoring Opportunities

### 🔴 CRITICAL: Hardcoded System Paths

**Current (Legacy Pattern)**:
```javascript
import { BladesSheet } from "../../../systems/blades-in-the-dark/module/blades-sheet.js";
```

**Affected Files**:
- `scripts/blades-alternate-actor-sheet.js:1-2`
- `scripts/blades-alternate-crew-sheet.js:1`
- `scripts/blades-alternate-class-sheet.js:1`

**Recommended Refactor**:
```javascript
// Option 1: Absolute path (modern Foundry)
import { BladesSheet } from "/systems/blades-in-the-dark/module/blades-sheet.js";

// Option 2: Via CONFIG (if system exports it)
const BladesSheet = CONFIG.BITD?.sheets?.BladesSheet;

// Option 3: Dynamic import (best for cross-system compat)
const { BladesSheet } = await import(
  `/systems/${game.system.id}/module/blades-sheet.js`
);
```

**Why this matters**:
- Relative paths (`../../..`) are fragile and break if module structure changes
- Absolute paths are clearer and more maintainable
- Dynamic imports allow system-agnostic modules

### 🟡 MEDIUM: Commented-Out Legacy Imports

**Files**:
- `scripts/blades-alternate-actor-sheet.js:11`
- `scripts/blades-alternate-item-sheet.js:1,9`

**Action**: Remove commented imports or uncomment if needed.

### 🟢 LOW: Template Path Hardcoding

**Current**:
```javascript
template: "modules/bitd-alternate-sheets/templates/actor-sheet.html"
```

**Could use**:
```javascript
template: `modules/${MODULE_ID}/templates/actor-sheet.html`
```

**Benefit**: Single source of truth for module ID (already defined in `utils.js`).

---

## Module Settings

**Registered in `scripts/settings.js`**:

| Setting | Scope | Type | Default | Description |
|---------|-------|------|---------|-------------|
| `searchAllPacks` | World | Boolean | `false` | Scan all installed modules for homebrew items |
| `enableProfiling` | Client | Boolean | `false` | Enable performance logging |
| `schemaVersion` | World | Number | `0` | Migration tracking (hidden from UI) |

---

## Testing

**No automated test suite exists.** Manual testing workflow:

1. Start Foundry: `docker-compose up`
2. Create character, drag playbook onto sheet
3. Smoke test:
   - Skill rolls work
   - Edit/mini mode toggles function
   - Harm/coin/load dialogs open & save
   - Ability toggles update actor
   - Clocks render & are interactive
4. Console check: No errors/warnings (F12)
5. Multi-client test: Open in two browsers, verify concurrent edits don't cause update storms

**After migration changes**: Verify `Migration.migrate()` runs once and preserves existing actor data.

---

## Commit & PR Guidelines

**Commit Style**: Short, imperative
```
Fix dialog cancel button
Remove debug console.log statements
Refactor ability progress flag handling
```

**PR Requirements**:
- Describe user-facing changes
- Specify target Foundry version(s)
- Note migration impact (if any)
- Include screenshots/GIFs for UI changes
- Link related issues

---

## Important Reference Documents

| File | Purpose |
|------|---------|
| `CONTRIBUTING.md` | Detailed coding conventions, CSS rules, Firefox flexbox bug |
| `AGENTS.md` | Quick reference for NPC integration, dialog compat |
| `docs/performance-update-guidelines.md` | Multi-client update safety patterns |
| `docs/dialogv2-custom-styling-guide.md` | Shadow DOM styling patterns |
| `docs/compat-helpers-guide.md` | API compatibility layer usage |

---

## Quick Reference: Common Tasks

### Add a new sheet element
1. Edit template in `templates/` or `templates/parts/`
2. Add styles in `styles/scss/import/` (use design tokens!)
3. Run `npm run build:css`
4. Test in Foundry

### Add a new setting
1. Register in `scripts/settings.js`
2. Access via `game.settings.get("bitd-alternate-sheets", "yourSetting")`

### Add a new Handlebars helper
1. Define in `scripts/handlebars-helpers.js`
2. Use in templates: `{{yourHelper arg1 arg2}}`

### Modify actor data
```javascript
// ✅ Good (atomic, no flicker)
await actor.update({
  "system.stress.value": newStress,
  "system.trauma.value": newTrauma
});

// ❌ Bad (multiple updates, causes rerenders)
await actor.update({ "system.stress.value": newStress });
await actor.update({ "system.trauma.value": newTrauma });
```

### Update embedded items
```javascript
// ✅ Good (atomic, no empty state)
await actor.updateEmbeddedDocuments("Item", [{
  _id: item.id,
  name: "New Name",
  "system.load": 2
}]);

// ❌ Bad (causes UI flicker)
await actor.deleteEmbeddedDocuments("Item", [item.id]);
await actor.createEmbeddedDocuments("Item", [newItemData]);
```

---

## Foundry API Global Variables (Expected Usage)

These globals are part of the Foundry VTT API and are **safe to use**:

- `game` - Game instance (settings, user, actors, items, packs, etc.)
- `ui` - UI managers (notifications, sidebar, etc.)
- `CONFIG` - Configuration object (document classes, constants)
- `foundry` - Foundry namespace (utils, applications, documents)
- `Hooks` - Hook system
- `Item`, `Actor`, `ChatMessage` - Document classes (if not namespaced)

**Note**: V13+ moves some globals into `foundry.*` namespaces. Use compat helpers when available.

---

## ESM Import/Export Compliance

✅ **All scripts use ES6 modules**

**Entry point**: `module.json` → `"esmodules": ["/scripts/module.js"]`

**Standard pattern**:
```javascript
// Named exports
export class MyClass { ... }
export function myFunction() { ... }

// Imports
import { MyClass } from "./my-class.js";
import { Utils } from "./utils.js";
```

**No CommonJS** (`require()`, `module.exports`) is present.

---

## DataModel Usage

**N/A** - This is a **sheet module**, not a system. It does not define data models.

**Instead**:
- Extends system's base sheet classes (`BladesSheet`, `BladesCrewSheet`, etc.)
- Accesses document data via `.system.` (modern pattern)
- Uses custom flags for module-specific data

**Data access pattern**:
```javascript
// ✅ Modern (V10+)
actor.system.stress.value
item.system.load

// ❌ Legacy (V9 and earlier, DO NOT USE)
actor.data.data.stress.value
item.data.data.load
```

---

**Last Updated**: 2025-12-29
**Audit Conducted By**: Claude Code System Audit
