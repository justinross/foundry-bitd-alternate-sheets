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

## Skills First Policy (CRITICAL)

**BEFORE making recommendations or taking action, you MUST check if relevant skills exist and consult them.**

### Why Skills Matter

Skills codify project-specific best practices, patterns, and policies. They preserve institutional knowledge and prevent repeated mistakes. **Ignoring skills wastes user effort in creating them and leads to inconsistent behavior.**

### Mandatory Skill Consultation Triggers

When the user requests ANY of these, **STOP and check relevant skills FIRST**:

| User Request | Skills to Check | Why |
|-------------|----------------|-----|
| "Implement [task/feature]" | `claude-code-delegation-policy`, `git-branching-strategy` | Determine delegation strategy + git workflow |
| "Add [feature]", "Build [thing]" | Same as above | Same reasoning |
| "Review code", "Check quality" | Project-specific review skills if they exist | Follow established review standards |
| "How does [X] work?" | Relevant technical skills (foundry-vtt-*, etc.) | Use documented patterns instead of guessing |
| "What's the process for [X]?" | `claude-code-development-workflow`, workflow skills | Follow established procedures |
| Styling/CSS work | `foundry-bitd-alt-css-authoring` | Design tokens, Firefox bugs, etc. |
| Error handling | `foundry-vtt-error-handling` | Foundry-native patterns |
| Git operations | `git-branching-strategy` | Proper workflow |

### Systematic Skill Check Process

**Before responding to implementation requests:**

1. **Identify relevant skills** - Which skills apply to this request?
2. **Explicitly reference them** - "Let me check the delegation policy skill..."
3. **Quote key guidance** - Show the user you consulted the skill
4. **Apply the guidance** - Follow what the skill says, not assumptions

### Example: Correct Skill Usage

```
User: "Implement L3"

✅ CORRECT:
You: "Before proceeding, let me check the relevant skills:
      - claude-code-delegation-policy (should this be delegated?)
      - git-branching-strategy (need a feature branch?)

      Based on the delegation policy skill, L3 should be delegated because:
      [quotes skill reasoning]

      I'll create a feature branch and delegate to a Task agent."

❌ WRONG:
You: "I'll implement L3 now by reading files and adding JSDoc..."
     (Ignored delegation policy, ignored git strategy, cluttered context)
```

### Available Skills Reference

Check the table at the end of this document for complete skill list. Key skills:

- **Process**: `claude-code-delegation-policy`, `git-branching-strategy`, `claude-code-development-workflow`
- **Foundry Patterns**: `foundry-vtt-error-handling`, `foundry-vtt-dialog-compat`, `foundry-vtt-performance-safe-updates`, etc.
- **Project-Specific**: `foundry-bitd-alt-css-authoring`

### Consequences of Ignoring Skills

- ❌ Repeat mistakes that skills were created to prevent
- ❌ Waste user's effort in creating/maintaining skills
- ❌ Inconsistent behavior across sessions
- ❌ Miss optimizations (like delegation for context preservation)
- ❌ Violate established policies (like git workflow)

**Golden Rule**: When in doubt, check if a skill exists. Better to over-consult than under-consult.

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

### Implementation Work
- **Triggers:** "Implement [plan/task]", "Add [feature]", "Refactor [component]"
- **Decision:** Check `claude-code-delegation-policy` skill to determine:
  - If well-defined (approved plan exists) → Delegate to Task (general-purpose or feature-dev)
  - If needs design/exploration first → Use `/feature-dev` workflow
- **Rationale:** Preserve main context for strategic discussion, delegate autonomous execution

---

## Context Window Preservation Through Delegation

**Core Principle** (from Anthropic official guidance): Preserve main conversation context by delegating autonomous work to subagents.

> "Each subagent operates in its own context, preventing pollution of the main conversation and keeping it focused on high-level objectives."

### Three-Tier Context Strategy

1. **Main thread** - High-level discussion, decisions, strategy, user interaction
2. **Subagent threads** - Autonomous execution, file operations, detailed work
3. **Result** - Longer sessions, clearer conversations, better focus

### When to Delegate

Delegate work to Task agents when:

✅ **Context preservation matters**
- Implementation work requiring multiple file reads/edits
- Iterative refinement that would consume many tokens
- Details that don't need to be in strategic conversation

✅ **Task is well-defined**
- Clear scope, approved plan, or specific instructions
- Deliverables are understood
- Success criteria are clear

✅ **Specialized expertise helps**
- Code review, exploration, architecture design
- Specific agent types available for the task

✅ **You want focused results**
- Subagent returns clean summary
- Main context stays strategic
- Implementation noise abstracted away

### Example: L3 JSDoc Implementation

**❌ Without delegation:**
- Read 5+ files (~10k tokens)
- Write dozens of JSDoc blocks (~5k tokens)
- Iterate and refine (~5k tokens)
- **Total**: ~20k tokens consumed in main context
- **Result**: Conversation cluttered, harder to continue

**✅ With delegation:**
- Delegation prompt (~500 tokens)
- Agent works autonomously in isolated context
- Agent summary (~1k tokens)
- **Total**: ~1.5k tokens in main context
- **Savings**: ~18.5k tokens preserved for strategy
- **Result**: Clear conversation, room for next steps

### Decision Tree

```
User requests implementation work
         ↓
   Will this consume significant context?
   (multiple files, iteration, details)
         ↓ YES
   Is the task well-defined?
   (approved plan, clear scope)
         ↓ YES
   ✅ DELEGATE to Task agent
         ↓
   Agent works autonomously
         ↓
   Review summary in main context
         ↓
   ✅ Context preserved for strategy
```

**See `skills/claude-code-delegation-policy/SKILL.md` for complete guidance.**

---

## Git Workflow Check (CRITICAL)

**BEFORE implementing ANY code changes, you MUST determine the git strategy.**

### Trigger Keywords Requiring Git Strategy Check

When the user says any of these, **STOP and check** `skills/git-branching-strategy/SKILL.md`:

- "implement [feature/refactor/task]"
- "add [feature/functionality]"
- "refactor [code/component]"
- "build [new thing]"
- "create [new feature]"
- "fix [non-trivial bug]"

### Decision Tree

```
User says: "implement X" or "add feature Y" or "refactor Z"
         ↓
   Is this NON-TRIVIAL work?
   - Changes >2 files?
   - Refactoring existing code?
   - New features/functionality?
   - Implementing planned tasks (L2, L3, etc.)?
         ↓ YES (non-trivial)
   ⚠️ REQUIRED: Create feature branch FIRST
         ↓
   git checkout -b feature/descriptive-name
   (or refactor/descriptive-name)
         ↓
   Make changes on branch
         ↓
   Commit changes on branch
         ↓
   Push to origin (fork): git push -u origin branch-name
         ↓
   Create PR to upstream:
   gh pr create --repo justinross/foundry-bitd-alternate-sheets \
     --base rc-1.1.0 \
     --head ImproperSubset:branch-name
         ↓
   ✅ DONE (proper workflow)
```

### When to Commit Directly to rc-X.X.X

**Rare exceptions only:**
- Documentation-only changes (README, markdown files, NO code changes)
- Critical hotfixes (must be discussed with user first)

**Golden Rule**: When in doubt, **use a feature branch**. PRs provide:
- Documentation of what was changed and why
- Opportunity for review
- Clear history of feature development

### What Happens If You Skip This

❌ **Direct commits to rc-X.X.X bypass**:
- Code review process
- PR documentation
- Proper git workflow
- Visibility into changes

❌ **Result**: Must force-push revert and redo properly (wasteful)

### Checklist Before Writing Code

- [ ] User requested implementation work?
- [ ] Is this non-trivial (>2 files OR refactoring OR new feature)?
- [ ] If YES → Consulted `skills/git-branching-strategy/SKILL.md`?
- [ ] If YES → Created feature branch?
- [ ] If NO (trivial) → Documented why direct commit is appropriate?

**Consult the skill**: `skills/git-branching-strategy/SKILL.md` for complete workflow details.

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

**Skill**: See `skills/foundry-vtt-virtual-lists/SKILL.md` for full implementation details

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

**Compendium Lookups**: The `searchAllPacks` setting (default: false) enables scanning ALL installed modules for matching documents, enabling homebrew support.

### 2. Update Queue Pattern

**Skill**: See `skills/foundry-vtt-performance-safe-updates/SKILL.md` for complete multi-client safety patterns

**Problem**: In multi-client Foundry sessions, concurrent updates from hooks can cause race conditions and update storms.

**Solution**: `scripts/lib/update-queue.js` provides `queueUpdate(fn)` to serialize document updates.

**Usage**:
```javascript
import { queueUpdate } from "./lib/update-queue.js";

queueUpdate(async () => {
  await actor.update({ "system.stress.value": newValue });
});
```

**Critical Rules** (see skill for full details):
1. **Guard with ownership checks**: Only update when `isOwner` or `isGM`
2. **Skip no-op updates**: Compare target state before calling `actor.update()`
3. **Batch updates**: Combine multiple field changes into single update object
4. **Limit rerenders**: Only rerender owned, currently-open sheets

### 3. Compatibility Layer (V12/V13)

**Skill**: See `skills/foundry-vtt-version-compat/SKILL.md` for full compatibility patterns

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

**Skill**: See `skills/foundry-vtt-dialog-compat/SKILL.md` for complete Shadow DOM styling patterns

**File**: `scripts/lib/dialog-compat.js`

**Problem**: Foundry V12+ uses `DialogV2` with Shadow DOM. External CSS and `<style>` tags don't work. Inline event handlers are stripped.

**Solution**: `openCardSelectionDialog()` detects V1/V2 and adapts:

- **V2**: All styles inline, event listeners attached in `render` callback
- **V1**: Traditional approach

**Card Chooser**: Supports `description` property (rendered as tooltip `title` attribute on the card label).

**Guide**: See `docs/guides/dialogv2-custom-styling-guide.md` for detailed Shadow DOM patterns.

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
**Skill**: See `skills/foundry-vtt-smart-field-system/SKILL.md`

Dynamic fields that open chooser dialogs based on `data-source` attribute:

```html
<input data-source="actor" data-filter-path="system.vice" ...>
```

- `source="actor"` → Opens NPC/actor chooser with filtering
- `source="item"` → Opens item chooser from world/compendia

**Vice Purveyor Filtering (Recent Implementation):**
- Uses `smart-field` with `source="actor"`
- Filters available Actors based on `actor.system.vice` matching keywords in `npc.system.associated_crew_type`
- Matching is strict lowercase contains check
- Example: Actor with `vice: "gambling"` matches NPC with `associated_crew_type: "Pleasure, gambling, shows"`

**Description Resolution**: `Utils.resolveDescription()` handles fallback chain:
```
system.description_short → system.description → system.notes → system.biography
```

**Note**: NPC description field is defined as `system.description_short` in template. `Utils.resolveDescription` handles fallback gracefully.

### 7. Clock System

**File**: `scripts/clocks.js`

Interactive SVG clocks that work in journals, chat, sheets:

- **Global event delegation** - Works anywhere in Foundry UI
- **Chat snapshot** - Preserves clock state at message creation time
- **Click to increment** - Right-click to decrement

### 8. Migration System

**Skill**: See `skills/foundry-vtt-data-migrations/SKILL.md` for migration patterns and schema versioning

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

**Skill**: See `skills/foundry-bitd-alt-css-authoring/SKILL.md` for complete CSS authoring guidelines

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

Templates are centralized in `scripts/constants.js`:
```javascript
import { TEMPLATES } from "./constants.js";

// Sheet templates use constants
template: TEMPLATES.ACTOR_SHEET
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

### ✅ COMPLETED: Template Path Constants

**Status**: Completed (2025-12-31)

**Implementation**: Template paths are now centralized in `scripts/constants.js`:
```javascript
import { TEMPLATES } from "./constants.js";

// Sheet classes use constants
template: TEMPLATES.ACTOR_SHEET
```

**Files**: `scripts/constants.js`, all sheet classes, `blades-templates.js`

**Benefit**: Single source of truth for template paths, easier refactoring.

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

### Skills (Detailed Patterns)
| Skill | Purpose |
|-------|---------|
| `skills/claude-code-delegation-policy/` | When/how to delegate work to subagents, context window preservation |
| `skills/git-branching-strategy/` | Branch management, PR workflow |
| `skills/claude-code-development-workflow/` | Agent routing, testing, commit guidelines |
| `skills/foundry-vtt-performance-safe-updates/` | Multi-client update safety, ownership guards, queueUpdate |
| `skills/foundry-bitd-alt-css-authoring/` | CSS authoring, design tokens, Firefox flexbox bug |
| `skills/foundry-vtt-virtual-lists/` | Virtual lists, ghost slots, sourced items |
| `skills/foundry-vtt-dialog-compat/` | DialogV2 Shadow DOM styling patterns |
| `skills/foundry-vtt-version-compat/` | API compatibility layer (V12/V13) |
| `skills/foundry-vtt-error-handling/` | Error handling patterns with Hooks.onError + NotificationOptions |
| `skills/foundry-vtt-data-migrations/` | Data migrations, schema versioning |
| `skills/foundry-vtt-smart-field-system/` | Smart fields, NPC integration, compendium lookups |
| `skills/documentation-management/` | Documentation organization policies |

### Guides (How-To)
| File | Purpose |
|------|---------|
| `docs/guides/performance-update-guidelines.md` | Multi-client update safety quick reference |
| `docs/guides/dialogv2-custom-styling-guide.md` | Shadow DOM styling detailed guide |
| `docs/guides/compat-helpers-guide.md` | API compatibility layer usage examples |
| `docs/guides/metrics.md` | Code metrics and tracking |

### Other Documentation
| File | Purpose |
|------|---------|
| `CONTRIBUTING.md` | Human developer onboarding, coding standards |
| `AGENTS.md` | Pointer to CLAUDE.md (for Codex compatibility) |

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
