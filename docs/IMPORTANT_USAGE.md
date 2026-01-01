# !important Usage Tracking

**Last Updated**: 2025-12-31
**Total Instances**: 16
**Eliminated**: 5 (2025-12-31)
**Remaining**: 16 (6 legitimate utilities + 10 candidates for refactoring)

---

## ✅ Recently Eliminated (2025-12-31)

### 1. Mixin Resets (3 instances) - `mixin.scss`
**Fixed in commit**: afe74c8

- **toothradio mixin** (line 44): `background-image: none !important`
- **custom_radio mixin** (lines 221-222): `background-image: none !important` + `background-color: $red !important`

**Solution**: Used `:not([for$="-0"])` selector to apply styles only to non-zero labels, eliminating need for overrides.

### 2. Toggle Icons (2 instances) - `components/character/_body.scss`
**Fixed in commit**: 3f1209d

- `.can-expand .toggle-expand .fa-expand` (line 376): `display: initial !important`
- `.can-expand .toggle-expand .fa-compress` (line 380): `display: none !important`

**Solution**: Changed from CSS visibility toggling to JavaScript class toggling. HTML now has single icon, JS toggles between `fa-expand` and `fa-compress` classes.

---

## 🟢 Legitimate Usage (Keep As-Is)

### Utility Classes - `layout/_visibility.scss` (6 instances)

These are **industry-standard utility class patterns** that should NOT be changed:

```scss
// Lines 5, 9, 13
.show { display: block !important; }
.row.show { display: flex !important; }
.hide { display: none !important; }

// Lines 19, 22, 25 (within vis-factory mixin for responsive utilities)
.show-#{$thisPrefix} { display: block !important; }
.row.show-#{$thisPrefix} { display: flex !important; }
.hide-#{$thisPrefix} { display: none !important; }
```

**Rationale**: Utility classes like `.show` and `.hide` are meant to override any existing styles, making `!important` the correct approach.

---

## 🟡 Candidates for Future Refactoring (10 instances)

### Category A: State Overrides - `components/character/_body.scss` (6 instances)

**Location**: Lines 289-301 (`.over-max` state for load banner)

```scss
&.over-max {
  background-color: $red !important;              // Line 290

  label, .load-stats, span {
    color: $alt-white !important;                  // Line 295
  }

  select {
    background-color: color.adjust($red, $lightness: -10%) !important;  // Line 299
    color: $alt-white !important;                  // Line 300
    border-color: color.adjust($red, $lightness: -20%) !important;      // Line 301
  }
}
```

**Why !important is used**: Overrides all previous styles when character is over-encumbered (critical visual feedback).

**Refactoring difficulty**: Medium - Would need to increase specificity or restructure load banner CSS.

**Priority**: Low - Functional and clear intent.

---

**Location**: Line 89 (contenteditable override)

```scss
[contenteditable]:not(.ProseMirror) {
  user-select: auto !important;  // Line 89
  @include editable-style;
}
```

**Why !important is used**: Overrides Foundry VTT's default `user-select: none` on contenteditable fields.

**Refactoring difficulty**: Hard - Fighting framework defaults.

**Priority**: Very Low - Necessary override for third-party framework behavior.

---

### Category B: Height Fixes - `components/shared/_globals.scss` (2 instances)

**Location**: Lines 79, 90 (tab navigation heights)

```scss
// Line 79
nav.tabs .item {
  height: 30px !important;
}

// Line 90
nav.sheet-tabs .item {
  height: 30px !important;
}
```

**Why !important is used**: Likely overriding Foundry VTT default tab heights.

**Refactoring difficulty**: Medium - Need to investigate Foundry's tab CSS specificity.

**Priority**: Medium - Could be eliminated by using more specific selectors.

**Suggested approach**: Try `.sheet-wrapper nav.tabs .item { height: 30px; }` (increased specificity).

---

### Category C: Spacing Fixes - `components/shared/_harm.scss` (1 instance)

**Location**: Line 7 (harm section padding)

```scss
.harm {
  padding-bottom: 2px !important;
}
```

**Why !important is used**: Overriding some other padding style (unclear what).

**Refactoring difficulty**: Easy - Likely unnecessary, test removal.

**Priority**: High - Good candidate for next cleanup.

**Suggested approach**: Remove `!important` and test visually. If padding breaks, increase selector specificity instead.

---

### Category D: Color Overrides - `components/shared/_attributes.scss` (1 instance)

**Location**: Line 64 (harm block text color)

```scss
.harm-block {
  color: $alt-white !important;
}
```

**Why !important is used**: Ensuring white text for contrast (likely on dark background).

**Refactoring difficulty**: Easy - Could be increased specificity.

**Priority**: High - Good candidate for next cleanup.

**Suggested approach**: Use more specific selector path or restructure to avoid cascade conflicts.

---

## 📋 Refactoring Priority Queue

If tackling more !important cleanup, address in this order:

1. **High Priority** (Easy wins, ~15 min each):
   - `_harm.scss` line 7: Test removal of `!important` on `padding-bottom`
   - `_attributes.scss` line 64: Increase specificity for `.harm-block` color

2. **Medium Priority** (Requires testing, ~30 min):
   - `_globals.scss` lines 79, 90: Replace with higher specificity selectors for tab heights

3. **Low Priority** (Significant refactoring, 1-2 hours):
   - `_body.scss` lines 289-301: Restructure `.over-max` state styling
   - `_body.scss` line 89: Document as necessary framework override (keep as-is)

---

## Summary Statistics

| Category | Count | Keep? | Next Action |
|----------|-------|-------|-------------|
| Utility Classes | 6 | ✅ Yes | None - industry standard |
| State Overrides | 6 | 🤔 Maybe | Evaluate on case-by-case basis |
| Height Fixes | 2 | ❌ No | Refactor to higher specificity |
| Spacing Fixes | 1 | ❌ No | Test removal first |
| Color Overrides | 1 | ❌ No | Increase specificity |
| **Total** | **16** | - | **4 good candidates for next pass** |

---

## Testing Checklist for Future Refactoring

When removing any `!important`:

- [ ] Build CSS successfully (`npm run build:css`)
- [ ] Visual regression test on character sheet
- [ ] Test with different playbooks (styles may vary)
- [ ] Test in both expanded and collapsed sheet states
- [ ] Test with over-encumbered character (load > max)
- [ ] Test contenteditable fields (notes, text inputs)
- [ ] Verify harm boxes display correctly
- [ ] Check tab navigation appearance

---

**Decision Log**:
- **2025-12-31**: Removed 5 "easy win" !important instances (mixins + toggle icons)
- **Next Review**: When SCSS refactoring resumes or if specificity issues arise
