# Foundry VTT Dialog V1/V2 Compatibility

Create custom dialogs that work in both Foundry V11 (Dialog V1) and V12+ (DialogV2) by handling Shadow DOM styling and event listeners correctly.

## When to Use This Skill

Invoke this skill when implementing custom dialogs that need:

### ✅ Use Dialog Compat For:

- **Card selection dialogs** - Visual choosers with images and descriptions
- **Multi-choice dialogs** - Radio buttons, checkboxes with custom styling
- **Complex forms** - Input fields with validation and interactivity
- **Interactive confirmations** - Dialogs with hover effects, visual feedback
- **Any custom-styled dialog** - Beyond default Foundry dialog appearance

### ❌ Don't Use Dialog Compat For:

- Simple confirmations - Use `Dialog.confirm()` (already compatible)
- Plain text prompts - Use `Dialog.prompt()` (already compatible)
- Dialogs without custom styling - Default Foundry styling works fine
- Sheet applications - Use `Application` or `FormApplication` instead

## The Problem: Shadow DOM in DialogV2

### What Changed in Foundry V12+

**Foundry V11 (Dialog V1):**
```
Dialog content renders in normal DOM
  ↓
External CSS works
<style> tags work
onclick attributes work
jQuery available
```

**Foundry V12+ (DialogV2):**
```
Dialog content renders in Shadow DOM
  ↓
External CSS BLOCKED
<style> tags STRIPPED
onclick attributes STRIPPED
Must use vanilla JS
```

### Why This Breaks Existing Code

```javascript
// ❌ This worked in V11, BREAKS in V12+
new Dialog({
  content: `
    <style>
      .my-card { border: 2px solid red; }
    </style>
    <div class="my-card" onclick="selectCard()">
      Card 1
    </div>
  `
});

// Result in V12+:
// - <style> tag stripped → no styling
// - onclick attribute stripped → no interaction
// - External CSS can't reach Shadow DOM → no fallback
```

## Solution: Inline Styles + Render Callback

### Three Core Patterns

1. **Inline styles** on every element (no CSS classes, no `<style>` tags)
2. **Render callback** for attaching event listeners programmatically
3. **V1/V2 detection** for compatibility wrapper

## Step-by-Step Implementation

### Step 1: Detect Dialog V2 Support

```javascript
/**
 * Check if Foundry supports DialogV2
 * @returns {boolean}
 */
function supportsDialogV2() {
  const dialogV2 = foundry?.applications?.api?.DialogV2;
  return Boolean(dialogV2 && typeof dialogV2.wait === "function");
}
```

### Step 2: Generate Content with Inline Styles

```javascript
/**
 * Generate dialog HTML with ALL styles inline
 */
function generateCardSelectionContent(choices, currentValue) {
  // Define style constants (easier to maintain)
  const gridStyle = "display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;";

  const getCardStyle = (isSelected) => {
    const base = "display: flex; flex-direction: column; padding: 1rem; border-radius: 5px; cursor: pointer; transition: all 0.2s;";

    if (isSelected) {
      return `${base} border: 2px solid #800000; background: rgba(128, 0, 0, 0.15); box-shadow: 0 0 8px #800000;`;
    } else {
      return `${base} border: 2px solid transparent; background: rgba(0, 0, 0, 0.05);`;
    }
  };

  const cards = choices.map(choice => {
    const isSelected = choice.value === currentValue;

    return `
      <label class="choice-card" style="display: block; cursor: pointer;">
        <input type="radio"
               name="selection"
               value="${choice.value}"
               ${isSelected ? 'checked' : ''}
               style="position: absolute; opacity: 0;">

        <div class="card-content" style="${getCardStyle(isSelected)}">
          <img src="${choice.img || 'icons/svg/mystery-man.svg'}"
               style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; margin-bottom: 0.5rem;"
               alt="${choice.label}" />

          <div style="font-weight: bold; margin-bottom: 0.25rem; text-align: center;">
            ${choice.label}
          </div>

          ${choice.description ? `
            <div style="font-size: 0.85em; color: #666; text-align: center; line-height: 1.3;">
              ${choice.description}
            </div>
          ` : ''}
        </div>
      </label>
    `;
  }).join('');

  return `
    <form id="selection-form">
      <p style="margin-bottom: 1rem; font-style: italic; color: #555;">
        Select an option:
      </p>
      <div class="card-grid" style="${gridStyle}">
        ${cards}
      </div>
    </form>
  `;
}
```

**Key Points:**
- ✅ **ALL styles inline** - No external CSS, no `<style>` tags
- ✅ **Conditional styles** - Generated in JavaScript based on state
- ✅ **Style constants** - Extract to functions for maintainability
- ✅ **Semantic HTML** - Still use proper structure despite inline styles

### Step 3: Attach Event Listeners in Render Callback (V2)

```javascript
/**
 * DialogV2 implementation
 */
async function openCardSelectionDialogV2(options) {
  const { DialogV2 } = foundry.applications.api;

  const content = generateCardSelectionContent(options.choices, options.currentValue);

  const result = await DialogV2.wait({
    window: {
      title: options.title || "Make a Selection",
      resizable: true
    },
    content,

    // ✅ CRITICAL: Attach event listeners in render callback
    render: (event, dialog) => {
      const form = dialog.element?.querySelector("form");
      if (!form) return;

      const radios = form.querySelectorAll('input[type="radio"]');
      const cardContents = form.querySelectorAll('.card-content');

      // 1. Update visual highlighting on selection change
      radios.forEach((radio, idx) => {
        radio.addEventListener('change', function() {
          // Reset all cards
          cardContents.forEach(card => {
            card.style.border = '2px solid transparent';
            card.style.background = 'rgba(0, 0, 0, 0.05)';
            card.style.boxShadow = 'none';
          });

          // Highlight selected card
          const selectedCard = this.parentElement.querySelector('.card-content');
          selectedCard.style.border = '2px solid #800000';
          selectedCard.style.background = 'rgba(128, 0, 0, 0.15)';
          selectedCard.style.boxShadow = '0 0 8px #800000';
        });
      });

      // 2. Add hover effects
      cardContents.forEach((card, idx) => {
        card.addEventListener('mouseenter', () => {
          const radio = radios[idx];
          if (!radio.checked) {
            card.style.background = 'rgba(0, 0, 0, 0.1)';
          }
        });

        card.addEventListener('mouseleave', () => {
          const radio = radios[idx];
          if (!radio.checked) {
            card.style.background = 'rgba(0, 0, 0, 0.05)';
          }
        });
      });

      // 3. Click entire card to select
      cardContents.forEach((card, idx) => {
        card.addEventListener('click', () => {
          radios[idx].click();
        });
      });
    },

    buttons: [
      {
        action: "ok",
        label: options.okLabel || "Select",
        icon: "fas fa-check",
        default: true,
        callback: (event, button, dialog) => {
          const form = dialog.element.querySelector("form");
          if (!form) return "";

          const formData = new FormDataExtended(form);
          return formData.object.selection || "";
        }
      },
      {
        action: "cancel",
        label: options.cancelLabel || "Cancel",
        icon: "fas fa-times",
        callback: () => undefined
      }
    ]
  });

  // Handle result
  if (result === undefined) return undefined;  // User canceled
  return result.trim() || null;
}
```

**Key Points:**
- ✅ **Vanilla JavaScript** - No jQuery in V2
- ✅ **Scoped queries** - Always query from `dialog.element`, not `document`
- ✅ **Programmatic listeners** - No inline event handlers
- ✅ **FormDataExtended** - Robust form data extraction

### Step 4: Implement V1 Fallback

```javascript
/**
 * Dialog V1 implementation (Foundry V11)
 */
async function openCardSelectionDialogV1(options) {
  const content = generateCardSelectionContent(options.choices, options.currentValue);

  return new Promise((resolve) => {
    const dialog = new Dialog({
      title: options.title || "Make a Selection",
      content,

      // V1 render callback uses jQuery
      render: (html) => {
        const radios = html.find('input[type="radio"]');
        const cardContents = html.find('.card-content');

        // Update highlighting
        radios.on('change', function() {
          cardContents.css({
            border: '2px solid transparent',
            background: 'rgba(0, 0, 0, 0.05)',
            boxShadow: 'none'
          });

          const selectedCard = $(this).closest('.choice-card').find('.card-content');
          selectedCard.css({
            border: '2px solid #800000',
            background: 'rgba(128, 0, 0, 0.15)',
            boxShadow: '0 0 8px #800000'
          });
        });

        // Hover effects
        cardContents.hover(
          function() {
            const radio = $(this).closest('.choice-card').find('input[type="radio"]');
            if (!radio.prop('checked')) {
              $(this).css('background', 'rgba(0, 0, 0, 0.1)');
            }
          },
          function() {
            const radio = $(this).closest('.choice-card').find('input[type="radio"]');
            if (!radio.prop('checked')) {
              $(this).css('background', 'rgba(0, 0, 0, 0.05)');
            }
          }
        );

        // Click entire card
        cardContents.click(function() {
          $(this).closest('.choice-card').find('input[type="radio"]').click();
        });
      },

      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: options.okLabel || "Select",
          callback: (html) => {
            const formData = new FormDataExtended(html.find("form")[0]);
            resolve(formData.object.selection || "");
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: options.cancelLabel || "Cancel",
          callback: () => resolve(undefined)
        }
      },

      default: "ok",
      close: () => resolve(undefined)
    });

    dialog.render(true);
  });
}
```

**V1 vs V2 Differences:**
| Feature | V1 | V2 |
|---------|----|----|
| API | `new Dialog()` | `DialogV2.wait()` |
| jQuery | ✅ Available | ❌ Not available |
| Buttons | Object | Array |
| Return value | Promise wrapper needed | Built-in async/await |
| Shadow DOM | ❌ No | ✅ Yes |

### Step 5: Create Compatibility Wrapper

```javascript
/**
 * Unified dialog API that works in both V1 and V2
 * @param {object} options
 * @param {string} options.title - Dialog title
 * @param {Array} options.choices - Array of {value, label, img?, description?}
 * @param {string} options.currentValue - Pre-selected value
 * @param {string} options.okLabel - OK button label
 * @param {string} options.cancelLabel - Cancel button label
 * @returns {Promise<string|undefined>} Selected value or undefined if canceled
 */
export async function openCardSelectionDialog(options) {
  if (supportsDialogV2()) {
    return openCardSelectionDialogV2(options);
  } else {
    return openCardSelectionDialogV1(options);
  }
}
```

## Common Patterns

### Pattern 1: Simple Confirmation with Custom Styling

```javascript
async function confirmWithStyle(message) {
  const content = `
    <div style="padding: 1rem; text-align: center;">
      <p style="font-size: 1.1em; margin-bottom: 1rem;">
        ${message}
      </p>
      <div style="background: rgba(255, 200, 0, 0.1); padding: 0.5rem; border-left: 4px solid orange; border-radius: 4px;">
        <strong>Warning:</strong> This action cannot be undone.
      </div>
    </div>
  `;

  if (supportsDialogV2()) {
    const result = await DialogV2.wait({
      window: { title: "Confirm Action" },
      content,
      buttons: [
        { action: "yes", label: "Yes", icon: "fas fa-check", callback: () => true },
        { action: "no", label: "No", icon: "fas fa-times", callback: () => false }
      ]
    });
    return result === true;
  } else {
    return Dialog.confirm({
      title: "Confirm Action",
      content,
    });
  }
}
```

### Pattern 2: Form with Validation

```javascript
async function openFormDialog() {
  const content = `
    <form id="my-form">
      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-weight: bold; margin-bottom: 0.25rem;">
          Name:
        </label>
        <input type="text"
               name="name"
               required
               style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;" />
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-weight: bold; margin-bottom: 0.25rem;">
          Type:
        </label>
        <select name="type"
                style="width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
          <option value="ability">Ability</option>
          <option value="item">Item</option>
          <option value="class">Class</option>
        </select>
      </div>
    </form>
  `;

  if (supportsDialogV2()) {
    return await DialogV2.wait({
      window: { title: "Create Item" },
      content,
      render: (event, dialog) => {
        const form = dialog.element.querySelector("form");
        const nameInput = form.querySelector('input[name="name"]');

        // Add validation feedback
        nameInput.addEventListener('input', function() {
          if (this.value.trim().length > 0) {
            this.style.borderColor = '#4CAF50';
          } else {
            this.style.borderColor = '#f44336';
          }
        });
      },
      buttons: [
        {
          action: "create",
          label: "Create",
          icon: "fas fa-plus",
          callback: (event, button, dialog) => {
            const form = dialog.element.querySelector("form");
            if (!form.checkValidity()) {
              ui.notifications.warn("Please fill in all required fields");
              return false;  // Prevent dialog from closing
            }
            const formData = new FormDataExtended(form);
            return formData.object;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => undefined
        }
      ]
    });
  } else {
    // V1 implementation...
  }
}
```

### Pattern 3: Multi-Select with Checkboxes

```javascript
async function openMultiSelectDialog(choices) {
  const checkboxes = choices.map(choice => `
    <label style="display: block; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 0.5rem; cursor: pointer; background: white;">
      <input type="checkbox"
             name="selections"
             value="${choice.value}"
             style="margin-right: 0.5rem; cursor: pointer;">
      <span style="font-weight: bold;">${choice.label}</span>
      ${choice.description ? `
        <div style="font-size: 0.85em; color: #666; margin-top: 0.25rem; margin-left: 1.5rem;">
          ${choice.description}
        </div>
      ` : ''}
    </label>
  `).join('');

  const content = `
    <form>
      <p style="margin-bottom: 1rem; font-style: italic;">Select one or more:</p>
      ${checkboxes}
    </form>
  `;

  if (supportsDialogV2()) {
    const result = await DialogV2.wait({
      window: { title: "Multi-Select" },
      content,
      render: (event, dialog) => {
        const labels = dialog.element.querySelectorAll('label');

        // Highlight on hover
        labels.forEach(label => {
          label.addEventListener('mouseenter', () => {
            label.style.background = '#f0f0f0';
          });
          label.addEventListener('mouseleave', () => {
            label.style.background = 'white';
          });
        });
      },
      buttons: [
        {
          action: "ok",
          label: "Confirm",
          callback: (event, button, dialog) => {
            const form = dialog.element.querySelector("form");
            const formData = new FormDataExtended(form);

            // Get all checked values
            const selected = [];
            const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(cb => selected.push(cb.value));

            return selected;
          }
        },
        {
          action: "cancel",
          label: "Cancel",
          callback: () => undefined
        }
      ]
    });

    return result || [];
  }
}
```

## Style Organization Best Practices

### Technique 1: Style Constants

```javascript
const STYLES = {
  form: "padding: 1rem;",
  label: "display: block; font-weight: bold; margin-bottom: 0.25rem;",
  input: "width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;",
  button: "padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;",
  error: "color: #f44336; font-size: 0.85em; margin-top: 0.25rem;",
};

const content = `
  <form style="${STYLES.form}">
    <label style="${STYLES.label}">Name:</label>
    <input type="text" name="name" style="${STYLES.input}" />
  </form>
`;
```

### Technique 2: Style Generation Functions

```javascript
function getCardStyle(isSelected, isHovered) {
  const base = {
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const state = {};
  if (isSelected) {
    state.border = '2px solid #800000';
    state.background = 'rgba(128, 0, 0, 0.15)';
    state.boxShadow = '0 0 8px #800000';
  } else if (isHovered) {
    state.border = '2px solid transparent';
    state.background = 'rgba(0, 0, 0, 0.1)';
  } else {
    state.border = '2px solid transparent';
    state.background = 'rgba(0, 0, 0, 0.05)';
  }

  const merged = { ...base, ...state };

  // Convert object to inline style string
  return Object.entries(merged)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case
      const kebab = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${kebab}: ${value}`;
    })
    .join('; ');
}

// Usage:
const cardStyle = getCardStyle(isSelected, false);
const html = `<div style="${cardStyle}">...</div>`;
```

### Technique 3: Template Literal Style Builders

```javascript
function cardTemplate(choice, isSelected) {
  return `
    <label style="display: block; cursor: pointer;">
      <div style="
        ${isSelected ? `
          border: 2px solid #800000;
          background: rgba(128, 0, 0, 0.15);
          box-shadow: 0 0 8px #800000;
        ` : `
          border: 2px solid transparent;
          background: rgba(0, 0, 0, 0.05);
        `}
        padding: 1rem;
        border-radius: 5px;
        transition: all 0.2s;
      ">
        ${choice.label}
      </div>
    </label>
  `;
}
```

## Common Pitfalls

### ❌ Pitfall 1: Using CSS Classes

```javascript
// BAD: Classes won't be styled in V2
content: `
  <style>
    .my-card { border: 2px solid red; }
  </style>
  <div class="my-card">Card</div>
`;
```

**Fix:** Use inline styles

```javascript
// GOOD
content: `
  <div style="border: 2px solid red;">Card</div>
`;
```

### ❌ Pitfall 2: Inline Event Handlers

```javascript
// BAD: onclick will be stripped in V2
content: `
  <button onclick="handleClick()">Click</button>
`;
```

**Fix:** Use render callback

```javascript
// GOOD
content: `<button class="my-btn">Click</button>`,
render: (event, dialog) => {
  const btn = dialog.element.querySelector('.my-btn');
  btn.addEventListener('click', handleClick);
}
```

### ❌ Pitfall 3: Global DOM Queries

```javascript
// BAD: Might find wrong element or fail
render: () => {
  const form = document.querySelector("form");
}
```

**Fix:** Query from dialog.element

```javascript
// GOOD
render: (event, dialog) => {
  const form = dialog.element.querySelector("form");
}
```

### ❌ Pitfall 4: Not Handling V1/V2 Differences

```javascript
// BAD: Only works in V2
async function openDialog() {
  return await DialogV2.wait({ ... });
}
```

**Fix:** Detect and branch

```javascript
// GOOD
async function openDialog() {
  if (supportsDialogV2()) {
    return await DialogV2.wait({ ... });
  } else {
    return await openDialogV1({ ... });
  }
}
```

## Quick Checklist

Before implementing custom dialogs:

- [ ] Detected V2 support with `supportsDialogV2()`
- [ ] All styles are inline (no CSS classes, no `<style>` tags)
- [ ] Event listeners attached in `render` callback
- [ ] Queries scoped to `dialog.element` (not `document`)
- [ ] FormDataExtended used for form data extraction
- [ ] V1 fallback implemented (if supporting Foundry V11)
- [ ] Tested in both V11 and V12+ (if applicable)
- [ ] No inline event handlers (`onclick`, etc.)
- [ ] Style constants or functions for maintainability

## References

- Full guide: `docs/dialogv2-custom-styling-guide.md`
- Implementation: `scripts/lib/dialog-compat.js`
- Card selection example: Smart field choosers in `scripts/sheets/actor/smart-edit.js`
- Foundry API: [DialogV2 Documentation](https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html)

## Project-Specific Notes

For BitD Alternate Sheets:
- All card selection dialogs use this pattern
- Smart field system depends on dialog-compat
- Vice purveyor chooser uses card layout with filtering
- Item choosers partition by playbook (native/cross-playbook/generic)
- All dialogs support V11 and V12+ via compatibility wrapper
