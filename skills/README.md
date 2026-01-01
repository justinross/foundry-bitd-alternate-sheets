# Claude Code Skills for BitD Alternate Sheets

This directory contains reusable Claude Code skills extracted from project documentation. These skills encode repeatable workflows and domain-specific knowledge for developing the Blades in the Dark Alternate Sheets Foundry VTT module.

## Available Skills

### 1. foundry-vtt-performance-safe-updates

**Purpose:** Prevent multi-client update storms and render cascades when implementing Foundry VTT features.

**Use when:**
- Adding new features that update actors or items
- Implementing hook handlers
- Modifying existing update logic
- Replacing or swapping embedded documents

**Key patterns:**
- Ownership guards (`item.parent?.isOwner`, `game.user.isGM`)
- No-op update checks (skip if value unchanged)
- Batched updates (single update call for multiple fields)
- queueUpdate wrapper (prevent concurrent update collisions)
- Atomic embedded document updates (updateEmbeddedDocuments vs delete+create)

**References:**
- `docs/performance-update-guidelines.md` - Original performance guidelines
- `docs/PERFORMANCE_FIX_PLAN.md` - Implementation history

---

### 2. foundry-vtt-data-migrations

**Purpose:** Implement safe, version-controlled data migrations when changing data structures or storage locations.

**Use when:**
- Moving data between storage locations (system → flags, flags → embedded docs)
- Changing data structures (array → object, renaming fields)
- Changing data types (string → number, boolean → enum)
- Removing deprecated data (orphaned flags, obsolete fields)
- Foundry version compatibility changes

**Key patterns:**
- Schema version system (track and run migrations once per world)
- Safe migration methods (check old/new locations, batch updates)
- Foundry document update syntax (`-=` unset operator)
- Idempotent migrations (safe to run multiple times)
- User notifications and console logging

**References:**
- `scripts/migration.js` - Current migration implementation
- `scripts/settings.js` - Schema version registration

---

### 3. foundry-bitd-alt-css-authoring

**Purpose:** Author SCSS stylesheets following project conventions and avoiding common pitfalls.

**Use when:**
- Adding new UI components or styling
- Modifying existing styles
- Fixing visual bugs or layout issues
- Implementing responsive design

**Key patterns:**
- Design token usage (colors, spacing, breakpoints in `_tokens.scss`)
- SCSS module system (`@use/@forward`, not `@import`)
- Firefox flexbox checkbox bug workaround (`inline-block`, not `flex`)
- Selector simplification (max 3 levels nesting)
- Build workflow (`npm run build:css`, `npm run lint:css`)

**References:**
- `CONTRIBUTING.md` - CSS authoring guidelines and Firefox bug details
- `docs/SCSS_REFACTOR.md` - Architecture documentation

---

### 4. foundry-vtt-smart-field-system

**Purpose:** Create interactive fields that provide context-aware editing with compendium/actor lookups and tooltips.

**Use when:**
- Implementing fields that select from compendium items (heritage, background, vice, playbook)
- Implementing fields that select from world actors (NPCs, contacts, vice purveyors)
- Adding tooltips showing compendium descriptions
- Providing better UX than plain text input or dropdowns

**Key patterns:**
- Handlebars `{{smart-field}}` helper with data attributes
- Context-aware filtering (Vice Purveyor matching vice keywords)
- Click handler: `data-action="smart-edit"` → card selection dialog
- Source types: `compendium_item`, `actor`, or `text` fallback
- Tooltip system using compendium descriptions

**References:**
- `scripts/sheets/actor/smart-edit.js` - Implementation
- `scripts/handlebars-helpers.js` - Handlebars helper registration
- `templates/actor-sheet.html` - Example usage (identity section)

---

### 5. foundry-vtt-optimistic-ui-updates

**Purpose:** Handle race conditions between UI state and Foundry document updates using optimistic UI patterns to prevent flickering and laggy interactions.

**Use when:**
- Implementing interactive elements that update actor/item documents (clocks, checkboxes, toggles, progress bars)
- Clicks aren't registering correctly during rapid interaction
- UI feels laggy or flickers during updates
- Encountering race conditions between form state and document updates

**Key patterns:**
- Read from DOM (background-image, class names), not form state (radio/checkbox values)
- Update UI immediately (optimistic), then persist asynchronously
- Suppress redundant renders (let Foundry's updateActor hook handle it)
- No debouncing for discrete actions (clicks, toggles)

**References:**
- `scripts/hooks.js` - Clock segment handlers
- `scripts/blades-alternate-actor-sheet.js` - Ability checkbox handlers
- `docs/performance-update-guidelines.md` - Performance guidelines

---

### 6. foundry-vtt-per-user-ui-state

**Purpose:** Save and load per-user, per-actor UI preferences using Foundry's flag system to remember collapsed sections, filter toggles, dockable layouts, and other UI state.

**Use when:**
- Implementing collapsed/expanded sections that should persist
- Adding filter toggles (show equipped, show owned, visibility settings)
- Implementing dockable drag-and-drop layouts
- Saving sheet lock state (edit mode vs locked mode)
- Any UI-only preference that should persist across sessions

**Key patterns:**
- Storage: `game.user.flags[MODULE_ID].uiStates[actorId]`
- Helper functions: `loadUiState`, `saveUiState`
- Load in `getData`, save in event handlers
- Use `??` (nullish coalescing) for boolean defaults, not `||`
- Sanitize UUIDs: `actorUuid.replace(/\./g, "_")`

**References:**
- `scripts/utils.js` - `loadUiState`, `saveUiState` implementation
- `scripts/ui/dockable-sections.js` - Dockable layout example
- `scripts/blades-alternate-actor-sheet.js` - Filter toggles, collapsed sections

---

### 7. git-branching-strategy

**Purpose:** Prevent monster branches by following disciplined branching and merge practices suited to Foundry module development.

**Use when:**
- Starting new feature work
- Mid-feature, wanting to add "just one more thing"
- Branch has grown beyond 20 commits
- Unsure whether to create new branch or continue current
- Considering adding unrelated changes to current branch

**Key patterns:**
- **One feature, one branch, one PR** - Golden rule
- Branch size targets: 5-15 commits ideal, 30 max, 50+ is a monster
- Decision tree: Related to current feature? Ready to merge? Required dependency?
- Branch naming: `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`
- Commit checkpoints: Check focus at 10, warning at 20, critical at 30
- When to split: Extract completed features, start fresh if too messy

**References:**
- Monster branch example: `feature/alt-crew-sheet` (100+ commits, multiple features)
- Good example: `refactor/scss-modules` (single purpose, clean history)
- Integration workflow: Feature branches → `rc-1.1.0` → `master`

---

### 8. foundry-vtt-virtual-lists

**Purpose:** Display ALL available items/abilities for selection, not just owned items, enabling "check to add" UX instead of "drag from compendium" workflow.

**Use when:**
- Implementing playbook abilities (show all available for current playbook)
- Creating item/gear selection lists
- Displaying special abilities or talents with checkboxes
- Showing cross-playbook abilities with "ghost" state
- Any character option that can be selected/toggled

**Key patterns:**
- `getSourcedItemsByType()` - Fetch from world + compendia
- Virtual item format: `{owned: boolean, ghost: boolean, source: Document}`
- Merge source + owned items, replace source with owned if duplicate
- Ghost slots for cross-playbook abilities (owned but progress=0)
- Filter by playbook/class, group by category, sort by owned first

**References:**
- `scripts/utils/collections.js` - `getSourcedItemsByType()` implementation
- `scripts/utils.js` - `getVirtualListOfItems()`, ghost slot logic
- `templates/actor-sheet.html` - Abilities section display

---

### 9. foundry-vtt-dialog-compat

**Purpose:** Create custom dialogs that work in both Foundry V11 (Dialog V1) and V12+ (DialogV2) by handling Shadow DOM styling and event listeners correctly.

**Use when:**
- Creating card selection dialogs with images and descriptions
- Building multi-choice dialogs with custom styling
- Implementing interactive confirmations with hover effects
- Any custom-styled dialog beyond default Foundry appearance

**Key patterns:**
- Detect V2 support: `foundry?.applications?.api?.DialogV2?.wait`
- ALL styles inline (no CSS classes, no `<style>` tags)
- Event listeners in `render` callback (no inline `onclick`)
- Query from `dialog.element` (not `document`)
- V1 uses jQuery, V2 uses vanilla JS
- FormDataExtended for robust form data extraction

**References:**
- Full guide: `docs/dialogv2-custom-styling-guide.md`
- Implementation: `scripts/lib/dialog-compat.js`
- Example: `scripts/sheets/actor/smart-edit.js` - Card selection dialogs

---

### 10. foundry-vtt-version-compat

**Purpose:** Use compatibility wrappers to avoid deprecation warnings when APIs move from globals to namespaces across Foundry versions (V12/V13/V15+).

**Use when:**
- Importing Foundry classes (ActorSheet, ItemSheet, TextEditor)
- Registering actor/item sheets
- Loading Handlebars templates
- Enriching HTML content (journal entries, descriptions)
- Any Foundry API that has moved or will move to namespaces

**Key patterns:**
- Try modern namespace first: `foundry?.appv1?.sheets?.ActorSheet ?? ActorSheet`
- Cache expensive lookups (DocumentSheetConfig, classes)
- Defer sheet registration to `ready` hook (V13+ requirement)
- Throw clear errors if API not found
- Template: `export function getAPI() { return modern ?? legacy; }`

**References:**
- Implementation: `scripts/compat.js` - Core compatibility wrappers
- Helpers: `scripts/compat-helpers.js` - Sheet registration, template loading
- Guide: `docs/compat-helpers-guide.md`

---

### 11. documentation-management

**Purpose:** Maintain clean, useful documentation by following clear guidelines for what to create, how to name it, where to put it, and when to archive or delete it.

**Use when:**
- About to create a new .md file
- Completing an analysis or audit
- Deciding whether to archive or delete docs
- Uncertain if something should be documented

**Key patterns:**
- **Document types:** Guides (HOW), Architecture (WHY structure), ADRs (WHY decisions), Skills (repeatable patterns)
- **Naming:** Guides: `{topic}-guide.md`, Architecture: `{COMPONENT}_ARCHITECTURE.md`, ADRs: `YYYY-MM-DD-{title}.md`
- **The "Link Test":** Would you link to this in README? No → Delete it
- **Extract to skills:** Repeatable patterns become skills, then delete audit docs
- **Be ruthless:** Delete working documents after extracting to final format

**References:**
- This skill is self-referential - it defines its own purpose!
- Example structure: `docs/{guides,architecture,decisions,archive}/`
- ADR format: [Architecture Decision Records](https://adr.github.io/)

---

## How to Use These Skills

### With Claude Code CLI

Skills can be invoked during a conversation with Claude Code by mentioning the workflow:

```
User: "I need to add a toggle that updates the actor's selected load level"

Claude: [Recognizes this involves Foundry document updates, applies
         foundry-vtt-performance-safe-updates skill patterns]
```

### As Reference Documentation

Skills can be read directly as comprehensive guides:
- Each `SKILL.md` contains step-by-step workflows
- `references/` directories provide domain-specific background
- Checklists help verify implementation correctness

### Installing as User Skills

If your Claude Code setup supports user skills, you can install these:

```bash
# Copy to Claude Code skills directory (path may vary)
cp -r skills/foundry-vtt-performance-safe-updates ~/.claude-code/skills/
cp -r skills/foundry-bitd-alt-css-authoring ~/.claude-code/skills/
```

---

## Skill Structure

Each skill follows this structure:

```
skill-name/
  SKILL.md              # Main skill content (workflow, patterns, examples)
  references/           # Domain-specific background knowledge
    topic-1.md
    topic-2.md
```

**SKILL.md contents:**
- When to use this skill (triggers)
- Step-by-step workflow
- Decision points and common patterns
- Anti-patterns to avoid
- Quick reference checklist
- Project-specific notes

**references/ contents:**
- Domain knowledge not in Claude's training
- Project-specific gotchas and edge cases
- Technical background and rationale

---

## Maintaining Skills

### When to Update Skills

Update skills when:
- Project conventions change (new build tools, different patterns)
- New gotchas discovered (add to anti-patterns section)
- Workflows evolve (additional steps, decision points)

### When to Create New Skills

Create a new skill when you identify:
1. **Repeatable workflow** - Done more than once during development
2. **Domain knowledge gap** - Information Claude wouldn't know from training
3. **Clear decision points** - Specific choices that benefit from guidance

### Extraction Process

1. **Identify workflow** - What repeatable task triggers this?
2. **Extract steps** - What's the procedure (numbered, imperative)?
3. **Document domain knowledge** - What context does Claude need?
4. **Add decision points** - What questions arise during execution?
5. **Include anti-patterns** - What mistakes should be avoided?

---

## Source Documentation

These skills were extracted from:
- `CONTRIBUTING.md` - Development guidelines and conventions
- `AGENTS.md` - Agent-specific instructions
- `docs/performance-update-guidelines.md` - Performance patterns
- `docs/SCSS_REFACTOR.md` - CSS architecture

Historical audit files (NOT converted to skills):
- `docs/PERFORMANCE_FIX_PLAN.md` - Completed performance fixes
- `docs/HOOK_CASCADE_AUDIT.md` - Historical audit findings
- `docs/CACHING_OPTIONS.md` - Decision log
- Various `*_AUDIT.md` files - Past analysis results

These remain as documentation for context but don't encode repeatable workflows.

---

## Future Skill Candidates

Additional patterns identified from crew sheet development:

### Medium Priority
- **Foundry VTT Card Selection Dialogs** - Item/NPC choosers with filtering, partitioning, and smart ordering
- **Foundry VTT Dockable Sections** - Two-column drag-and-drop layout with SortableJS and persistence

### Lower Priority
- **Foundry VTT Ghost Slots** - Cross-playbook abilities persisting as visible placeholders when unchecked
- **Foundry VTT Collapsible Sections** - Simple toggle sections with persistence (may be too simple for dedicated skill)
- **Foundry VTT Dialog Creation** - DialogV2 compatibility patterns (from `AGENTS.md`)
- **Handlebars Template Authoring** - Template conventions and helpers

---

Last Updated: 2025-12-31
