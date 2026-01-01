# BitD Alternate Sheets Design Tokens

Design tokens are centralized in `styles/scss/abstracts/_tokens.scss`.

**Rule:** ALWAYS add new values to tokens first before using in components.

## Color Tokens

```scss
// Primary palette
$alt-red: #cc0000;
$alt-red-dark: #800000;
$alt-blue: #0066cc;
$alt-gold: #d4a016;
$alt-amber: #e6a800;
$alt-green: #339933;

// Neutrals
$alt-paper: #f0e8d8;
$alt-gray: #888888;
$alt-gray-light: #cccccc;
$alt-almost-black: #1a1a1a;
$alt-almost-white: #f5f5f5;
```

**Usage:**
```scss
@use "abstracts/tokens";

.playbook-title {
  color: tokens.$alt-red;        // NOT #cc0000
  background: tokens.$alt-paper;  // NOT #f0e8d8
}
```

## Spacing Tokens (4px Scale)

```scss
$space-xs: 4px;
$space-sm: 8px;
$space-md: 12px;
$space-lg: 16px;
$space-xl: 20px;
$space-tight: 5px;  // Exception for specific use case
```

**Usage:**
```scss
.section {
  padding: tokens.$space-md;      // NOT 12px
  margin-bottom: tokens.$space-lg; // NOT 16px
  gap: tokens.$space-sm;          // NOT 8px
}
```

**Semantic aliases:**
```scss
$label-height: 30px;
$input-padding: $space-sm;
```

## Radii Tokens

```scss
$radius: 3px;
$radius-sm: 2px;
```

**Usage:**
```scss
.button {
  border-radius: tokens.$radius;  // NOT 3px
}
```

## Breakpoint Tokens

```scss
$breakpoint-sm: 480px;   // Mobile
$breakpoint-md: 768px;   // Tablet
$breakpoint-lg: 1024px;  // Desktop
```

**Usage:**
```scss
.grid {
  grid-template-columns: repeat(3, 1fr);

  @media (max-width: tokens.$breakpoint-md) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: tokens.$breakpoint-sm) {
    grid-template-columns: 1fr;
  }
}
```

## Z-Index Tiers

```scss
$layer-tooltip: 9999999;
$layer-overlay: 600;
$layer-controls: 500;
$layer-content: 10;
```

**Usage:**
```scss
.tooltip {
  z-index: tokens.$layer-tooltip;  // NOT 9999999
}
```

## Typography Tokens

```scss
$font-kirsty: "Kirsty", serif;
$font-crimson: "Crimson Text", serif;

$font-size-display: 2em;
$line-height-tight: 1.1;
```

**Usage:**
```scss
.playbook-title {
  font-family: tokens.$font-kirsty;
  font-size: tokens.$font-size-display;
  line-height: tokens.$line-height-tight;
}
```

## CSS Custom Properties (Runtime Variables)

Tokens are also exposed as CSS custom properties in `.blades-alt`:

```scss
.blades-alt {
  --alt-red: #{$alt-red};
  --alt-blue: #{$alt-blue};
  --space-md: #{$space-md};
  --radius: #{$radius};
}
```

**When to use CSS custom properties:**
- Dynamic theming (user-changeable colors)
- Runtime calculations (grid widths)
- JavaScript access (`getComputedStyle`)

**When to use SCSS tokens:**
- Build-time values (preferred for most cases)
- Math operations in SCSS
- Compile-time constants

## Adding New Tokens

### Step 1: Identify the Value Type

Is it a color, spacing, radius, breakpoint, or z-index?

### Step 2: Add to Appropriate Section

```scss
// In styles/scss/abstracts/_tokens.scss

// Colors
$alt-purple: #663399 !default;  // Always add !default

// Spacing
$space-xxl: 24px !default;

// Semantic alias
$playbook-header-spacing: $space-lg !default;
```

### Step 3: Use in Components

```scss
@use "abstracts/tokens";

.new-component {
  color: tokens.$alt-purple;
  padding: tokens.$playbook-header-spacing;
}
```

## Token Naming Conventions

**Scale-based (preferred for reusability):**
- `$space-{xs|sm|md|lg|xl}` - Size scale
- `$alt-{color}-{variant}` - Color palette

**Semantic (use sparingly):**
- `$label-height` - Specific component size
- `$playbook-header-spacing` - Component-specific spacing

**Rules:**
- Use scale-based tokens when possible (more reusable)
- Use semantic tokens for truly unique values
- Never hardcode values in component files
