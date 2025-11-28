# Creating DialogV2 Dialogs with Custom Styling in Foundry VTT

This guide documents the approach and lessons learned while implementing the crew selection dialog for Foundry VTT v12+ using the DialogV2 API.

## Table of Contents
- [Overview](#overview)
- [The Challenge: Shadow DOM](#the-challenge-shadow-dom)
- [Key Concepts](#key-concepts)
- [Implementation Patterns](#implementation-patterns)
- [Complete Example](#complete-example)
- [Common Pitfalls](#common-pitfalls)
- [V1/V2 Compatibility](#v1v2-compatibility)

## Overview

DialogV2 (introduced in Foundry v12, stable in v13) is the modern Application framework that replaces the legacy Dialog API. It uses Shadow DOM for encapsulation, which requires different approaches for styling and event handling.

## The Challenge: Shadow DOM

DialogV2 renders content inside a **Shadow DOM**, which has important implications:

1. **External CSS doesn't work**: Stylesheets outside the shadow root cannot style elements inside
2. **`<style>` tags are stripped**: Inline `<style>` blocks in content HTML are removed by Foundry's sanitization
3. **Event handler attributes are stripped**: Inline `onclick`, `onchange`, etc. attributes are removed for security

## Key Concepts

### What Works in Shadow DOM

✅ **Inline styles on elements**: `<div style="color: red;">` works perfectly  
✅ **Programmatic event listeners**: Attached via `addEventListener()` in JavaScript  
✅ **The `render` callback**: Hook into DialogV2's lifecycle to manipulate the rendered DOM

### What Doesn't Work

❌ **External CSS selectors**: Module CSS files cannot reach inside the shadow DOM  
❌ **`<style>` tags in content**: Foundry strips these for security  
❌ **Inline event handlers**: `onclick="..."`, `onchange="..."` are stripped

## Implementation Patterns

### Pattern 1: Inline Styles for All Styling

Since external CSS and `<style>` tags don't work, all styles must be applied directly to elements:

```javascript
function generateContent() {
  return `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
      <div style="padding: 1rem; border: 2px solid #800000; border-radius: 5px;">
        Card 1
      </div>
    </div>
  `;
}
```

**Tip**: For conditional styling, generate the style string in JavaScript:

```javascript
const isSelected = value === currentValue;
const borderStyle = isSelected 
  ? "border: 2px solid #800000; box-shadow: 0 0 8px #800000;" 
  : "border: 2px solid transparent;";

return `<div style="padding: 0.5rem; ${borderStyle}">...</div>`;
```

### Pattern 2: Programmatic Event Listeners via `render` Callback

The `render` option in `DialogV2.wait()` can be used to attach event listeners after the DOM is created:

```javascript
await DialogV2.wait({
  content: `<form>...</form>`,
  render: (event, dialog) => {
    // Access the dialog's DOM
    const form = dialog.element?.querySelector("form");
    
    // Attach event listeners
    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.addEventListener('change', function() {
        // Handle the change event
        console.log("Selected:", this.value);
      });
    });
  },
  buttons: [...]
});
```

**When this runs**: The `render` callback fires after the dialog HTML is inserted into the DOM but before it's shown to the user.

### Pattern 3: Interactive Styling with Event Listeners

To create visual feedback (hover effects, selection highlighting), inline styles should be combined with event listeners:

```javascript
render: (event, dialog) => {
  const cards = dialog.element.querySelectorAll('.card');
  
  cards.forEach(card => {
    // Highlight on selection
    const radio = card.querySelector('input[type="radio"]');
    radio.addEventListener('change', function() {
      // Reset all cards
      cards.forEach(c => {
        c.style.border = '2px solid transparent';
        c.style.background = 'rgba(0, 0, 0, 0.05)';
      });
      
      // Highlight this card
      const thisCard = this.closest('.card');
      thisCard.style.border = '2px solid #800000';
      thisCard.style.background = 'rgba(128, 0, 0, 0.15)';
    });
    
    // Hover effects
    card.addEventListener('mouseenter', () => {
      if (!card.querySelector('input').checked) {
        card.style.background = 'rgba(0, 0, 0, 0.1)';
      }
    });
    
    card.addEventListener('mouseleave', () => {
      if (!card.querySelector('input').checked) {
        card.style.background = 'rgba(0, 0, 0, 0.05)';
      }
    });
  });
}
```

## Complete Example

Here's a complete implementation of a multi-choice dialog with visual cards:

```javascript
async function openSelectionDialog(choices, currentValue) {
  const { DialogV2 } = foundry.applications.api;
  
  // Generate HTML with inline styles
  const cards = choices.map(choice => {
    const isSelected = choice.value === currentValue;
    const cardStyle = isSelected
      ? "display: flex; flex-direction: column; padding: 1rem; border: 2px solid #800000; background: rgba(128, 0, 0, 0.15); box-shadow: 0 0 8px #800000; border-radius: 5px; cursor: pointer;"
      : "display: flex; flex-direction: column; padding: 1rem; border: 2px solid transparent; background: rgba(0, 0, 0, 0.05); border-radius: 5px; cursor: pointer;";
    
    return `
      <label class="choice-card" style="display: block;">
        <input type="radio" name="selection" value="${choice.value}" 
               ${isSelected ? 'checked' : ''} 
               style="position: absolute; opacity: 0;">
        <div class="card-content" style="${cardStyle}">
          <img src="${choice.img}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;" />
          <div style="font-weight: bold; margin-top: 0.5rem;">${choice.label}</div>
        </div>
      </label>
    `;
  }).join('');
  
  const content = `
    <form>
      <p style="margin-bottom: 1rem; font-style: italic;">Choose an option:</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;">
        ${cards}
      </div>
    </form>
  `;
  
  const result = await DialogV2.wait({
    window: { title: "Make a Selection", resizable: true },
    content,
    
    // Attach interactive behaviors
    render: (event, dialog) => {
      const form = dialog.element?.querySelector("form");
      if (!form) return;
      
      const radios = form.querySelectorAll('input[type="radio"]');
      const cards = form.querySelectorAll('.card-content');
      
      radios.forEach((radio, idx) => {
        // Update visual highlighting when selection changes
        radio.addEventListener('change', function() {
          cards.forEach(card => {
            card.style.border = '2px solid transparent';
            card.style.background = 'rgba(0, 0, 0, 0.05)';
            card.style.boxShadow = 'none';
          });
          
          const selectedCard = this.parentElement.querySelector('.card-content');
          selectedCard.style.border = '2px solid #800000';
          selectedCard.style.background = 'rgba(128, 0, 0, 0.15)';
          selectedCard.style.boxShadow = '0 0 8px #800000';
        });
      });
    },
    
    buttons: [
      {
        action: "ok",
        label: "Select",
        icon: "fas fa-check",
        default: true,
        callback: (event, button, dialog) => {
          const formElement = dialog.element.querySelector("form");
          if (!formElement) return "";
          const formData = new FormDataExtended(formElement);
          return formData.object.selection || "";
        }
      },
      {
        action: "cancel",
        label: "Cancel",
        icon: "fas fa-times",
        callback: () => undefined
      }
    ]
  });
  
  // Handle result
  if (result === undefined) return undefined; // User canceled
  return result.trim() || null;
}
```

## Common Pitfalls

### 1. Trying to Use CSS Classes

**Ineffective approach:**
```javascript
content: `
  <style>
    .my-card { border: 2px solid red; }
  </style>
  <div class="my-card">Card</div>
`
```

The `<style>` tag will be stripped, and the class won't be styled.

**Correct approach:**
```javascript
content: `
  <div style="border: 2px solid red;">Card</div>
`
```

### 2. Using Inline Event Handlers

**Ineffective approach:**
```javascript
content: `
  <button onclick="console.log('clicked')">Click</button>
`
```

The `onclick` attribute will be stripped for security.

**Correct approach:**
```javascript
content: `<button class="my-button">Click</button>`,
render: (event, dialog) => {
  const button = dialog.element.querySelector('.my-button');
  button.addEventListener('click', () => console.log('clicked'));
}
```

### 3. Forgetting to Query from `dialog.element`

**Problematic approach:**
```javascript
render: () => {
  const form = document.querySelector("form"); // Might find the wrong form!
}
```

**Correct approach:**
```javascript
render: (event, dialog) => {
  const form = dialog.element.querySelector("form"); // Scoped to this dialog
}
```

### 4. Not Handling Form Data Correctly

**Fragile approach:**
```javascript
callback: (event, button, dialog) => {
  return dialog.element.querySelector('input[name="myField"]').value;
}
```

This can fail if the input doesn't exist.

**Robust approach:**
```javascript
callback: (event, button, dialog) => {
  const form = dialog.element.querySelector("form");
  if (!form) return "";
  const formData = new FormDataExtended(form);
  return formData.object.myField || "";
}
```

## V1/V2 Compatibility

To support both Foundry v11 (V1 dialogs) and v12+ (V2 dialogs), a wrapper function can be created:

```javascript
function supportsDialogV2() {
  const dialogV2 = foundry?.applications?.api?.DialogV2;
  return Boolean(dialogV2 && typeof dialogV2.wait === "function");
}

export async function openCompatDialog(options) {
  if (supportsDialogV2()) {
    return openDialogV2(options);
  }
  return openDialogV1(options);
}

async function openDialogV2(options) {
  // V2 implementation using DialogV2.wait()
  // Use render callback for event listeners
}

async function openDialogV1(options) {
  // V1 implementation using new Dialog()
  // Use jQuery in render callback
  return new Promise((resolve) => {
    new Dialog({
      content: options.content,
      buttons: { ... },
      render: (html) => {
        // jQuery is available in V1
        html.find('.my-button').click(() => { ... });
      }
    }).render(true);
  });
}
```

**Key differences:**
- **V1**: Uses jQuery (`html.find()`), returns via Promise wrapper, buttons are objects
- **V2**: Uses vanilla JS (`querySelector()`), uses `DialogV2.wait()`, buttons are arrays

## Best Practices

1. **Keep inline styles organized**: Define style constants at the top of functions
2. **Use semantic HTML**: Even though styling is inline, proper HTML structure should be maintained
3. **Test on multiple Foundry versions**: DialogV2 behavior can vary between v12 and v13
4. **Add comments**: Inline styles can get verbose; intentions should be documented
5. **Extract style logic**: Functions should be used to generate conditional styles

## Resources

- [DialogV2 API Documentation](https://foundryvtt.com/api/classes/foundry.applications.api.DialogV2.html)
- [FormDataExtended Documentation](https://foundryvtt.com/api/classes/client.FormDataExtended.html)
- [Shadow DOM MDN Reference](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)

---

**Last Updated**: 2025-11-23  
**Foundry Versions**: v12, v13+
