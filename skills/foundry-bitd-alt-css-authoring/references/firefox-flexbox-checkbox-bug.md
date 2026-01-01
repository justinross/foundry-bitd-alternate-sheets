# Firefox Flexbox Checkbox Width Bug

## The Problem

Firefox has a known bug where flex containers with `display: flex` or `display: inline-flex` do NOT correctly calculate `width: max-content` when containing checkbox `<input>` elements.

**Symptom:** The container computes a width smaller than its content, causing checkboxes to overflow and overlap with adjacent text.

## Root Cause

Firefox calculates the flex container's intrinsic width based on font-size (e.g., `1em = 14px`) rather than the actual rendered width of checkbox children (which may be `20px`).

This is compounded when the container itself is a flex item in a parent flex layout, as Firefox's flex shrinking algorithm ignores `width: max-content` directives.

## Visual Example

```
Chrome (correct):
[☐][☐][☐] Reflexes

Firefox (broken with flex):
[☐][☐ Reflexes
     ☐]
```

## The Solution

Use `display: inline-block` instead of any flex display mode for checkbox containers.

### ✅ Correct Implementation

```scss
.ability-checkboxes {
  display: inline-block;  // NOT flex!
  white-space: nowrap;
  vertical-align: top;

  input[type="checkbox"] {
    display: inline-block;
    vertical-align: top;
    width: 1em;
    min-width: 1em;
  }

  .join-line {
    display: inline-block;
    vertical-align: top;
    width: 0.5em;
    height: 2px;
    margin-top: 0.5em;  // Centers vertically relative to 1em checkboxes
  }
}
```

### ❌ Broken Implementation

```scss
.ability-checkboxes {
  display: flex;        // BROKEN IN FIREFOX!
  gap: 0.25em;

  input[type="checkbox"] {
    width: 1em;
  }
}
```

## Why inline-block Works

- Forces container to shrink-wrap to actual content width
- Works identically in Chrome, Firefox, Safari, Edge
- Simpler than flex (no need for gap, align-items, etc.)
- Combined with `white-space: nowrap`, prevents wrapping

## Affected Elements in BitD Alternate Sheets

- `.ability-checkboxes` - Ability cost bars (tooth bars)
- `.crew-ability-checkboxes` - Crew upgrade checkboxes
- `.join-line` - Visual connectors between multi-cost ability boxes
- Any container holding checkbox inputs for horizontal layout

## DO NOT Switch Back to Flex

**WARNING:** Do NOT switch back to `display: flex` or `display: inline-flex` for `.ability-checkboxes` without extensive cross-browser testing, especially in Firefox.

The `inline-block` approach is:
- ✅ Simpler
- ✅ More reliable
- ✅ Works identically across all browsers

## References

- Known Firefox issue: [flexbugs](https://github.com/philipwalton/flexbugs)
- Stack Overflow discussions on Firefox flex + checkbox width bugs
- CONTRIBUTING.md lines 41-50 for full context
