# Agent Configuration

**For Claude Code users:** See [`CLAUDE.md`](./CLAUDE.md) for comprehensive system documentation.

**For Codex/Cursor users:** This project uses Claude Code as the primary development assistant. The main documentation is in `CLAUDE.md`, but here's a quick reference:

---

## Quick Reference (Codex/Cursor/Gemini Users)

**Project Type:** Foundry VTT Module - Blades in the Dark Alternate Character Sheets

**Tech Stack:**
- JavaScript ES modules (no bundler)
- Handlebars templates
- SCSS → CSS compilation
- Foundry VTT V12+ compatibility

**Key Patterns** (see `skills/` directory for detailed guides):

### Multi-Client Safety
- **Always** add ownership guards: `if (!actor.isOwner) return;`
- **Always** check for no-op updates before calling `actor.update()`
- **Always** batch multiple field changes into single update object
- **Always** use `queueUpdate()` wrapper for concurrent update prevention
- See: `skills/foundry-vtt-performance-safe-updates/SKILL.md`

### CSS Authoring
- **Always** use design tokens from `_variables.scss` or `_identity.scss`
- **Never** use `display: flex` for `.ability-checkboxes` (Firefox bug)
- **Use** `display: inline-block` + `white-space: nowrap` instead
- **Always** rebuild after SCSS changes: `npm run build:css`
- See: `skills/foundry-bitd-alt-css-authoring/SKILL.md`

### Dialog Creation
- **V12+ uses DialogV2** with Shadow DOM
- **ALL styles must be inline** (no CSS classes, no `<style>` tags)
- **Event listeners** in `render` callback (no inline `onclick`)
- See: `skills/foundry-vtt-dialog-compat/SKILL.md`

### Virtual Lists (Core Pattern)
- Show **ALL available items**, not just owned items
- Use `Utils.getSourcedItemsByType()` to fetch from world + compendia
- Ghost slots for cross-playbook abilities
- See: `skills/foundry-vtt-virtual-lists/SKILL.md`

---

## Build Commands

```bash
npm run build:css         # Compile SCSS to CSS
npm run lint:css          # Lint SCSS files
npm run watch:css         # Watch and auto-compile
npm run metrics:styles    # Print SCSS lines and CSS bytes
docker-compose up         # Run Foundry locally (http://localhost:30000)
```

---

## Critical Gotchas

**Firefox Flexbox Bug:**
- Checkboxes in flex containers miscalculate width in Firefox
- **Solution:** Use `inline-block`, not `flex`
- Affects: `.ability-checkboxes` and similar checkbox containers

**Embedded Document Updates:**
- **Don't** use `deleteEmbeddedDocuments` + `createEmbeddedDocuments` (causes flicker)
- **Do** use `updateEmbeddedDocuments` (atomic, no flicker)

**NPC Integration:**
- Vice Purveyors filter by `actor.system.vice` matching keywords in `npc.system.associated_crew_type`
- Description resolution: `description_short` → `description` → `notes` → `biography`

---

## Skills Directory

**12 detailed pattern guides** in `skills/`:

1. `foundry-vtt-performance-safe-updates` - Multi-client update safety
2. `foundry-bitd-alt-css-authoring` - CSS authoring guidelines
3. `foundry-vtt-data-migrations` - Data migration patterns
4. `foundry-vtt-smart-field-system` - Interactive field system
5. `foundry-vtt-optimistic-ui-updates` - Race condition handling
6. `foundry-vtt-per-user-ui-state` - UI state persistence
7. `git-branching-strategy` - Branch management
8. `foundry-vtt-virtual-lists` - Virtual item lists (core pattern)
9. `foundry-vtt-dialog-compat` - DialogV2 Shadow DOM
10. `foundry-vtt-version-compat` - API compatibility (V12/V13)
11. `documentation-management` - Documentation policies
12. `claude-code-development-workflow` - Development workflow

Each skill has:
- When to use it
- Step-by-step workflows
- Decision points
- Anti-patterns to avoid
- Quick reference checklist

---

## Documentation Structure

```
docs/
├── guides/              # How-to guides
│   ├── performance-update-guidelines.md
│   ├── dialogv2-custom-styling-guide.md
│   ├── compat-helpers-guide.md
│   └── metrics.md
├── tracking/            # Active status tracking
│   ├── IMPORTANT_USAGE.md
│   └── REMAINING_REFACTORINGS.md
└── archive/             # Historical context (dated)
    ├── 2025-12-31-caching-decision.md
    ├── 2025-12-31-performance-implementation.md
    └── 2025-12-31-scss-refactor-plan.md
```

---

## Testing

No automated tests. Manual workflow:

1. `docker-compose up` (start Foundry)
2. Create character, test sheet functionality
3. Check browser console (F12) for errors
4. Multi-client test: Open two browsers, verify no update storms

---

## Full Documentation

**➡️ See [`CLAUDE.md`](./CLAUDE.md) for:**
- Complete architecture overview
- Detailed pattern descriptions
- Code examples and references
- API documentation
- Commit and PR guidelines

---

**Last Updated:** 2025-12-31
**Maintained For:** Codex/Cursor/Gemini compatibility
