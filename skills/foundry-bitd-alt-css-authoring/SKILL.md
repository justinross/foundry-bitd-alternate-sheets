# Foundry BitD Alternate Sheets CSS Authoring

Author SCSS stylesheets for the Blades in the Dark Alternate Sheets module following project conventions and avoiding common pitfalls.

## When to Use This Skill

Invoke this skill when:
- Adding new UI components or styling to BitD Alternate Sheets
- Modifying existing styles (layout, colors, spacing)
- Fixing visual bugs or alignment issues
- Implementing responsive design changes
- Adding new character/crew sheet sections

## Project Architecture

### File Structure

```
styles/scss/
  main.scss              # Entrypoint (compiles to styles/css/bitd-alt.css)
  bitd-alt.scss          # Legacy forwarder (keep for compatibility)
  abstracts/
    _tokens.scss         # Design tokens (colors, spacing, breakpoints)
    _mixins.scss         # Shared mixins
  base/
    _globals.scss        # CSS custom properties, base elements
  layout/
    _grid.scss           # Flex grid system (.row/.col-*)
    _visibility.scss     # Show/hide helpers (.show-*/.hide-*)
  components/
    character/           # Character sheet styles
    crew/                # Crew sheet styles
    shared/              # Shared component styles
```

### Build & Lint Commands

```bash
npm run build:css      # Compile SCSS → CSS (required after changes)
npm run watch:css      # Auto-compile on file changes
npm run lint:css       # Check SCSS for style issues
npm run metrics:styles # Track SCSS lines and CSS bytes
```

### Module System

**Use `@use` and `@forward`, NOT `@import`:**

```scss
// ✅ GOOD: Modern module system
@use "abstracts/tokens";
@use "sass:math";

.my-component {
  color: tokens.$alt-red;
  padding: tokens.$space-md;
}

// ❌ BAD: Deprecated @import
@import "abstracts/tokens";
```

## Step-by-Step Styling Workflow

### Step 1: Check for Design Tokens FIRST

**Before introducing ANY literal value, check if a token exists:**

Open `styles/scss/abstracts/_tokens.scss` and look for:
- **Colors**: `$alt-red`, `$alt-blue`, `$alt-gold`, `$alt-paper`, etc.
- **Spacing**: `$space-xs` (4px), `$space-sm` (8px), `$space-md` (12px), `$space-lg` (16px), `$space-xl` (20px)
- **Radii**: `$radius` (3px), `$radius-sm` (2px)
- **Breakpoints**: `$breakpoint-sm`, `$breakpoint-md`, `$breakpoint-lg`
- **Z-index tiers**: `$layer-tooltip`, `$layer-overlay`, `$layer-controls`

### Step 2: Add New Tokens if Needed

**If the value doesn't exist, add it to `_tokens.scss` first:**

```scss
// In abstracts/_tokens.scss

// Colors (use existing palette)
$alt-dark-red: #800000 !default;

// Spacing (stick to 4px increments)
$space-xxl: 24px !default;

// Give it a semantic name
$playbook-header-spacing: $space-lg !default;
```

**Token naming guidelines:**
- Colors: `$alt-{color}` or `$alt-{color}-{variant}`
- Spacing: `$space-{size}` for scale, or `${component}-{purpose}` for semantic
- Always add `!default` flag to allow overrides

### Step 3: Use Existing Utilities First

**Check if existing classes/mixins solve the problem:**

```scss
// ✅ GOOD: Use existing flex grid
.playbook-grid {
  @extend .row;        // Flex container
  gap: tokens.$space-md;
}

.playbook-column {
  @extend .col-6;      // 50% width column
}

// ✅ GOOD: Use existing visibility helpers
.debug-info {
  @extend .hide-md;    // Hidden on medium screens and below
}
```

**Available utilities:**
- Grid: `.row`, `.col-{1-12}`, `.col-auto`
- Visibility: `.show-{xs|sm|md|lg}`, `.hide-{xs|sm|md|lg}`
- States: `.allow-edit`, `.can-expand`, `.minimized-view`

### Step 4: Keep Selectors Simple (Max 3 Levels)

**Target: 3 levels of nesting maximum (4 with state selectors)**

```scss
// ❌ BAD: Deep nesting (6 levels)
.sheet-wrapper {
  .tabs {
    .tab-content {
      .playbook-grid {
        .item-block {
          .item-name {
            color: red;  // Too deep!
          }
        }
      }
    }
  }
}

// ✅ GOOD: Flattened (3 levels)
.playbook-grid {
  .item-block {
    .item-name {
      color: tokens.$alt-red;
    }
  }
}

// ✅ GOOD: Repeat parent class to flatten
.playbook-grid .item-block {
  display: flex;
  gap: tokens.$space-sm;
}

.playbook-grid .item-name {
  color: tokens.$alt-red;
}
```

### Step 5: Avoid !important (Exception: Utility Classes Only)

**Only use `!important` in visibility helpers:**

```scss
// ✅ GOOD: Utility class can use !important
.hide-md {
  @media (max-width: tokens.$breakpoint-md) {
    display: none !important;
  }
}

// ❌ BAD: Component styles should never need !important
.playbook-title {
  color: red !important;  // Sign of specificity problem!
}
```

**If you think you need `!important`, instead:**
1. Check if selector specificity is too low (add class instead of element selector)
2. Use `:not()` pseudo-class to increase specificity without !important
3. Restructure nesting to match the cascade

### Step 6: Use Class-Based Selectors, Not IDs or Elements

```scss
// ✅ GOOD: Class-based, reusable
.ability-checkbox {
  width: 1em;
  height: 1em;
}

// ❌ BAD: Element selector (too broad)
input[type="checkbox"] {
  width: 1em;  // Affects ALL checkboxes
}

// ❌ BAD: ID selector (too specific)
#playbook-header {
  color: red;  // Can't reuse, hard to override
}
```

### Step 7: Build & Verify

**After editing SCSS:**

```bash
# 1. Compile SCSS to CSS
npm run build:css

# 2. Check for lint issues
npm run lint:css

# 3. Verify in Foundry
# - Open character/crew sheet
# - Check browser console for CSS errors
# - Verify visual appearance matches intent
```

## Critical Firefox Flexbox Bug

**Problem:** Firefox incorrectly calculates `width: max-content` for flex containers containing checkboxes.

**Symptom:** Checkboxes overflow and overlap adjacent text in Firefox (but not Chrome).

**Solution:** Use `display: inline-block` for checkbox containers, NOT flex.

```scss
// ✅ GOOD: Works in both Firefox and Chrome
.ability-checkboxes {
  display: inline-block;
  white-space: nowrap;
  vertical-align: top;

  input[type="checkbox"] {
    display: inline-block;
    vertical-align: top;
    width: 1em;
    min-width: 1em;
  }
}

// ❌ BAD: Broken in Firefox
.ability-checkboxes {
  display: flex;        // Firefox bug!
  gap: 0.25em;
}
```

**Related elements affected:**
- `.ability-checkboxes` - Ability cost bars (tooth bars)
- `.join-line` - Lines connecting multi-cost abilities
- Any container with checkbox inputs

**References:** See `CONTRIBUTING.md` lines 41-50 for full implementation details.

## Ability Cost Bars (Join Lines)

**Use case:** Show visual connection between checkboxes for gated abilities.

**When to use join bars:**
- **Gated abilities**: Must fill ALL boxes to unlock (e.g., "Reflexes" requires 3 dots before active)
- Shows visual dependency between boxes

**When NOT to use join bars:**
- **Multi-level abilities**: Each box is independent rank (e.g., "Veteran" - each dot is a separate purchase)
- No dependency between boxes

```scss
// ✅ Join line styles (for gated abilities only)
.ability-checkboxes .join-line {
  display: inline-block;
  vertical-align: top;
  width: 0.5em;
  height: 2px;
  background: tokens.$alt-gold;
  margin-top: 0.5em;  // Vertically center
}
```

**Implementation:** Use data-driven flag in template to determine when to render join lines, don't hard-code ability names.

## Common Patterns

### Adding a New Component Section

```scss
// 1. Create component file
// File: styles/scss/components/character/_new-section.scss

@use "abstracts/tokens";

.new-section {
  padding: tokens.$space-md;
  background: tokens.$alt-paper;
  border-radius: tokens.$radius;

  .section-header {
    font-size: 1.2em;
    margin-bottom: tokens.$space-sm;
  }

  .section-content {
    display: flex;
    gap: tokens.$space-md;
  }
}

// 2. Import in component index
// File: styles/scss/components/character/_index.scss
@forward "new-section";

// 3. Build
npm run build:css
```

### Responsive Layout

```scss
@use "abstracts/tokens";

.playbook-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: tokens.$space-md;

  // Tablet: 2 columns
  @media (max-width: tokens.$breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }

  // Mobile: 1 column
  @media (max-width: tokens.$breakpoint-sm) {
    grid-template-columns: 1fr;
  }
}
```

### Hover/Active States

```scss
.ability-checkbox {
  cursor: pointer;
  opacity: 0.6;

  &:hover {
    opacity: 0.8;
  }

  &.checked {
    opacity: 1;
    background: tokens.$alt-gold;
  }

  // States count as 4th nesting level (acceptable)
}
```

### Extending Shared Mixins

```scss
@use "abstracts/mixins";
@use "abstracts/tokens";

.crew-ability-list {
  @include mixins.ability-checklist(
    $color: tokens.$alt-blue,
    $spacing: tokens.$space-sm
  );
}
```

## Anti-Patterns to Avoid

### ❌ Hardcoded Color Values
```scss
.playbook-title {
  color: #cc0000;  // Use tokens.$alt-red instead!
}
```

### ❌ Magic Number Spacing
```scss
.section-header {
  margin-bottom: 13px;  // Use tokens.$space-md (12px) instead!
}
```

### ❌ Deep Nesting
```scss
.sheet-wrapper {
  .tabs {
    .content {
      .grid {
        .item {  // Too deep!
```

### ❌ Element Selectors in Components
```scss
.playbook-section {
  div {  // Too broad! Use class selector
    padding: 10px;
  }
}
```

### ❌ Flex for Checkbox Containers
```scss
.ability-checkboxes {
  display: flex;  // Firefox bug! Use inline-block
}
```

## Debugging CSS Issues

### Issue: Styles Not Applying

1. **Check build:** Did you run `npm run build:css`?
2. **Check specificity:** Is another selector overriding yours?
3. **Check cascade:** Is your import order correct in `main.scss`?
4. **Check browser cache:** Hard refresh (Ctrl+Shift+R)

### Issue: Layout Broken in Firefox Only

1. **Check for flex on checkbox containers** → Use inline-block
2. **Check width calculations** → Add explicit min-width
3. **Check white-space** → Add `white-space: nowrap` for inline-block

### Issue: Lint Errors

```bash
# Run lint to see specific errors
npm run lint:css

# Common fixes:
# - Remove empty rulesets
# - Fix selector nesting depth
# - Remove vendor prefixes (autoprefixer handles this)
# - Fix color format (use tokens, not hex)
```

## Quick Reference Checklist

Before committing CSS changes:

- [ ] Used design tokens from `_tokens.scss` (no hardcoded colors/spacing)
- [ ] Checked existing utilities (grid, visibility) before creating new classes
- [ ] Kept nesting ≤3 levels (4 with states)
- [ ] Used class-based selectors (not IDs or element selectors)
- [ ] No `!important` outside utility classes
- [ ] Used `inline-block` for checkbox containers (not flex)
- [ ] Ran `npm run build:css` successfully
- [ ] Ran `npm run lint:css` with no errors
- [ ] Tested in Foundry (character sheet, crew sheet)
- [ ] Tested in Firefox AND Chrome (if layout-critical)

## References

- Full CSS authoring guidelines: `CONTRIBUTING.md` lines 26-50
- Firefox flexbox bug details: `CONTRIBUTING.md` lines 41-50
- Design tokens: `styles/scss/abstracts/_tokens.scss`
- SCSS architecture: `docs/SCSS_REFACTOR.md`

## Project-Specific Files

Key files for BitD Alternate Sheets:
- Entry: `styles/scss/main.scss`
- Tokens: `styles/scss/abstracts/_tokens.scss`
- Character: `styles/scss/components/character/`
- Crew: `styles/scss/components/crew/`
- Shared: `styles/scss/components/shared/`
