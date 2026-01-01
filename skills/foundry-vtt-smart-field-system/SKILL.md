# Foundry VTT Smart Field System

Create interactive fields that provide context-aware editing with compendium/actor lookups and tooltips, eliminating manual data entry.

## When to Use This Skill

Invoke this skill when implementing fields that need to:
- Select from compendium items (heritage, background, vice, playbook)
- Select from world actors (NPCs, contacts, vice purveyors)
- Filter selections based on character context (playbook, vice type)
- Display tooltips with compendium descriptions
- Provide better UX than plain text input or dropdowns

### ✅ Use Smart Fields For:

- **Character Bio Fields:** Heritage, Background, Vice, Pronouns, Look
- **NPC Selection:** Vice Purveyor, Acquaintances, Contacts
- **Playbook/Class Selection:** Choose from compendium classes
- **Crew Fields:** Crew Type, Hunting Grounds, Reputation
- **Any field where:** Users should select from predefined options with descriptions

### ❌ Don't Use Smart Fields For:

- Simple text input (name, alias, notes)
- Numeric values (XP, stress, harm)
- Checkboxes or toggles
- Fields without compendium backing

## Smart Field System Overview

### What is a Smart Field?

A smart field is an interactive label/value pair that:
1. **Locked mode:** Shows current value as plain text with tooltip
2. **Edit mode:** Shows as clickable label that opens context-aware chooser
3. **Selection:** Opens dialog with filtered candidates (cards with images/descriptions)
4. **Persistence:** Updates actor document automatically
5. **Tooltips:** Always show compendium description for context

### User Experience Flow

```
[Locked Mode]
  Heritage: Imperial

[Edit Mode - Click "Heritage"]
  → Card Selection Dialog Opens
  → Shows heritages from compendium
  → Each card has image + description
  → User selects "Akoros"
  → Actor updates
  → Sheet shows "Heritage: Akoros"
```

## Step-by-Step Implementation

### Step 1: Create Handlebars Helper (One-Time Setup)

**File:** `scripts/handlebars-helpers.js`

```javascript
Handlebars.registerHelper(
  "smart-field",
  function (
    allow_edit,
    parameter_name,
    label,
    current_value,
    uniq_id,
    context,
    options
  ) {
    // Extract optional parameters from hash
    const source = options.hash?.source || "compendium_item";
    const filterField = options.hash?.filterField || "";
    const filterValue = options.hash?.filterValue || "";

    // Get tooltip from context (compendium description)
    const tooltip = getTooltipForField(parameter_name, current_value, context);

    // Escape all values for XSS prevention
    const escapedLabel = Handlebars.escapeExpression(label);
    const escapedValue = Handlebars.escapeExpression(current_value || "");
    const escapedParam = Handlebars.escapeExpression(parameter_name);
    const escapedId = Handlebars.escapeExpression(uniq_id || "");
    const sourceStr = Handlebars.escapeExpression(source);

    // Locked Mode: Show value with tooltip
    if (!allow_edit) {
      const displayValue = escapedValue || `<em>${escapedLabel}</em>`;
      return new Handlebars.SafeString(
        `<span class="smart-field-value" data-tooltip="${tooltip}">${displayValue}</span>`
      );
    }

    // Edit Mode: Interactive label
    const displayWithPlaceholder = escapedValue || escapedLabel;
    return new Handlebars.SafeString(
      `<span class="smart-field-label"
             data-action="smart-edit"
             data-field="${escapedParam}"
             data-header="${escapedLabel}"
             data-value="${escapedValue}"
             data-id="${escapedId}"
             data-source="${sourceStr}"
             data-filter-field="${filterField}"
             data-filter-value="${filterValue}"
             tabindex="0"
             data-tooltip="${tooltip}">${displayWithPlaceholder}</span>`
    );
  }
);

function getTooltipForField(fieldName, currentValue, context) {
  // Look up tooltip from compendium item description
  // Implementation depends on your data structure
  const item = findCompendiumItem(fieldName, currentValue);
  return item?.system?.description || "";
}
```

### Step 2: Add Smart Field to Template

**File:** `templates/actor-sheet.html`

```handlebars
<div class="identity-meta-row">
  <label>{{localize "bitd-alt.Heritage"}}:</label>
  {{smart-field
    data.editable
    "system.heritage"
    (localize "bitd-alt.Heritage")
    data.actor.system.heritage
    data.actor._id
    this}}
</div>

<div class="identity-meta-row">
  <label>{{localize "bitd-alt.VicePurveyor"}}:</label>
  {{smart-field
    data.editable
    "system.vice_purveyor"
    (localize "bitd-alt.VicePurveyor")
    data.actor.system.vice_purveyor
    data.actor._id
    this
    source="actor"
    filterField="system.npc_subtype"
    filterValue="Vice Purveyor"}}
</div>
```

**Parameters:**
- `data.editable` - Whether field is interactive (edit mode)
- `"system.heritage"` - Actor property path to update
- `(localize "bitd-alt.Heritage")` - Display label
- `data.actor.system.heritage` - Current value
- `data.actor._id` - Unique ID for element
- `this` - Template context (for tooltip lookup)
- `source="actor"` - Candidates from world actors (not compendium)
- `filterField`/`filterValue` - Additional filtering

### Step 3: Implement Click Handler

**File:** `scripts/sheets/actor/smart-edit.js`

```javascript
export async function handleSmartEdit(sheet, event) {
  event.preventDefault();

  // Extract context from data attributes
  const ctx = {
    field: event.currentTarget.dataset.field,
    header: event.currentTarget.dataset.header,
    initialValue: event.currentTarget.dataset.value || "",
    source: event.currentTarget.dataset.source || "compendium_item",
    filterField: event.currentTarget.dataset.filterField || "",
    filterValue: event.currentTarget.dataset.filterValue || "",
  };

  // Get candidates based on source
  const candidates = await getSmartEditCandidates(sheet, ctx);

  // If no candidates, open text input dialog
  if (!candidates || candidates.length === 0) {
    const textValue = await openSmartEditTextDialog(ctx);
    if (textValue === undefined) return;
    await updateSmartField(sheet, ctx.field, textValue);
    return;
  }

  // Open card selection dialog
  const choices = toSmartEditChoices(candidates);
  const result = await openSmartEditChooser(ctx, choices);

  if (result === undefined) return;  // User cancelled
  const updateValue = result === null ? "" : result;  // null = clear

  await updateSmartField(sheet, ctx.field, updateValue);
}
```

### Step 4: Get Candidates Based on Source

```javascript
async function getSmartEditCandidates(sheet, ctx) {
  // Actor source: Select from world actors
  if (ctx.source === "actor") {
    return getSmartEditActorCandidates(sheet, ctx);
  }

  // Compendium source: Select from compendium items
  return getSmartEditCompendiumCandidates(ctx);
}

async function getSmartEditActorCandidates(sheet, ctx) {
  // Get filtered actors (e.g., NPCs with specific subtype)
  let candidates = await Utils.getFilteredActors(
    "npc",
    ctx.filterField,
    ctx.filterValue
  );

  // Special case: Vice Purveyor filtering
  if (ctx.filterValue === "Vice Purveyor") {
    const currentVice = sheet.actor.system.vice;
    if (currentVice && currentVice.trim().length > 0) {
      const viceKey = currentVice.toLowerCase().trim();

      // Filter NPCs whose associated_crew_type contains the vice keyword
      candidates = candidates.filter((npc) => {
        const keywords = (npc.system.associated_crew_type || "").toLowerCase();
        return keywords.includes(viceKey);
      });
    }
  }

  return candidates || [];
}

async function getSmartEditCompendiumCandidates(ctx) {
  // Map field names to compendium item types
  const typeMap = {
    "system.heritage": "heritage",
    "system.background": "background",
    "system.vice": "vice",
    "system.playbook": "class",
  };

  const type = typeMap[ctx.field];
  if (!type) return [];

  const items = await Utils.getSourcedItemsByType(type);
  return items || [];
}
```

### Step 5: Open Card Selection Dialog

```javascript
async function openSmartEditChooser(ctx, choices) {
  return openCardSelectionDialog({
    title: `${game.i18n.localize("Select")} ${ctx.header}`,
    instructions: `Choose a ${ctx.header} from the list below.`,
    okLabel: game.i18n.localize("Select"),
    cancelLabel: game.i18n.localize("Cancel"),
    clearLabel: game.i18n.localize("Clear"),
    choices: choices,
    currentValue: ctx.initialValue,
  });
}

function toSmartEditChoices(items) {
  return items.map((item) => ({
    value: item.name || item._id,
    label: item.name,
    img: item.img || "icons/svg/mystery-man.svg",
    description: item.system?.description || "",
  }));
}
```

### Step 6: Update Actor Field

```javascript
async function updateSmartField(sheet, field, value) {
  try {
    await sheet.actor.update({ [field]: value });
  } catch (err) {
    ui.notifications.error(`Failed to update field: ${err.message}`);
    console.error("Smart field update error:", err);
  }
}
```

### Step 7: Wire Up in Sheet activateListeners

**File:** `scripts/blades-alternate-actor-sheet.js`

```javascript
import { handleSmartEdit } from "./sheets/actor/smart-edit.js";

activateListeners(html) {
  super.activateListeners(html);

  // Smart field click handler
  html.find('[data-action="smart-edit"]').click(async (event) => {
    await handleSmartEdit(this, event);
  });

  // Support keyboard activation (Enter/Space)
  html.find('[data-action="smart-edit"]').keydown(async (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      await handleSmartEdit(this, event);
    }
  });
}
```

## Context-Aware Filtering Patterns

### Pattern 1: Vice Purveyor Filtering

**Problem:** Only show NPCs that match the character's vice.

```javascript
// Character has vice: "Obligation"
// NPC has system.associated_crew_type: "obligation, pleasure, weird"
// Match: "obligation" is contained in NPC keywords

const viceKey = currentVice.toLowerCase().trim();
const keywords = (npc.system.associated_crew_type || "").toLowerCase();
const matches = keywords.includes(viceKey);
```

**Template usage:**
```handlebars
{{smart-field
  data.editable
  "system.vice_purveyor"
  "Vice Purveyor"
  data.actor.system.vice_purveyor
  data.actor._id
  this
  source="actor"
  filterField="system.npc_subtype"
  filterValue="Vice Purveyor"}}
```

### Pattern 2: Playbook-Specific Items

**Problem:** Only show items for current playbook.

```javascript
const playbook = sheet.actor.system.playbook;
const playbookKey = playbook.toLowerCase();

candidates = candidates.filter((item) => {
  const itemClass = (item.system.class || "").toLowerCase();
  return itemClass === playbookKey || !itemClass;  // Match or generic
});
```

### Pattern 3: NPC Subtype Filtering

**Problem:** Filter NPCs by subtype (Contact, Vice Purveyor, etc.).

```javascript
// In getFilteredActors helper
export async function getFilteredActors(type, filterField, filterValue) {
  const allActors = await getAllItemsByType(type);

  if (!filterField || !filterValue) {
    return allActors;
  }

  return allActors.filter((actor) => {
    const fieldValue = foundry.utils.getProperty(actor, filterField);
    return fieldValue === filterValue;
  });
}
```

## Tooltip System

### Getting Tooltip from Compendium

```javascript
function getTooltipForField(fieldName, currentValue, context) {
  if (!currentValue) return "";

  // Look up in cached compendium data
  const typeMap = {
    "system.heritage": "heritage",
    "system.background": "background",
    "system.vice": "vice",
  };

  const type = typeMap[fieldName];
  if (!type) return "";

  // Find matching compendium item
  const item = context.compendiumCache?.[type]?.find(
    (i) => i.name === currentValue
  );

  return item?.system?.description || "";
}
```

### Providing Compendium Cache in getData

**File:** `scripts/blades-alternate-actor-sheet.js`

```javascript
async getData() {
  const data = await super.getData();

  // Cache compendium descriptions for tooltips
  data.compendiumCache = {
    heritage: await Utils.getSourcedItemsByType("heritage"),
    background: await Utils.getSourcedItemsByType("background"),
    vice: await Utils.getSourcedItemsByType("vice"),
  };

  return data;
}
```

## Styling Smart Fields

```scss
.smart-field-label {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;

  &:hover {
    color: var(--alt-blue);
    text-decoration-style: solid;
  }

  &:focus {
    outline: 2px solid var(--alt-blue);
    outline-offset: 2px;
  }
}

.smart-field-value {
  font-style: normal;

  em {
    // Placeholder when no value
    color: var(--alt-gray);
  }
}
```

## Common Use Cases

### Use Case 1: Simple Compendium Field

```handlebars
{{smart-field
  data.editable
  "system.heritage"
  "Heritage"
  data.actor.system.heritage
  data.actor._id
  this}}
```

### Use Case 2: NPC Selection with Filtering

```handlebars
{{smart-field
  data.editable
  "system.vice_purveyor"
  "Vice Purveyor"
  data.actor.system.vice_purveyor
  data.actor._id
  this
  source="actor"
  filterField="system.npc_subtype"
  filterValue="Vice Purveyor"}}
```

### Use Case 3: Free Text Fallback

```handlebars
{{smart-field
  data.editable
  "system.look"
  "Look"
  data.actor.system.look
  data.actor._id
  this
  source="text"}}
```

**Note:** If `source="text"` or no candidates found, opens text input dialog instead of card chooser.

## Error Handling

```javascript
export async function handleSmartEdit(sheet, event) {
  try {
    event.preventDefault();
    const ctx = smartEditContextFromEvent(event);
    const candidates = await getSmartEditCandidates(sheet, ctx);

    // ... selection logic ...

    await updateSmartField(sheet, ctx.field, updateValue);

  } catch (err) {
    const fieldName = event.currentTarget.dataset.header || "field";
    ui.notifications.error(`Failed to update ${fieldName}: ${err.message}`);
    console.error("Smart edit error:", err, { context: ctx });
  }
}
```

## Accessibility Considerations

```html
<!-- Keyboard support -->
<span class="smart-field-label"
      data-action="smart-edit"
      tabindex="0"
      role="button"
      aria-label="Edit Heritage">
  Imperial
</span>
```

```javascript
// Support Enter and Space keys
html.find('[data-action="smart-edit"]').keydown(async (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    await handleSmartEdit(this, event);
  }
});
```

## Quick Checklist

Before implementing smart fields:

- [ ] Handlebars `smart-field` helper registered
- [ ] `handleSmartEdit` function imported in sheet class
- [ ] Click handler wired in `activateListeners`
- [ ] Keyboard handler added (Enter/Space)
- [ ] `getSmartEditCandidates` handles your source type
- [ ] Tooltip lookup implemented in `getTooltipForField`
- [ ] Compendium cache provided in `getData` (if using compendium source)
- [ ] Styling added for `.smart-field-label` and `.smart-field-value`
- [ ] Error handling wraps all operations
- [ ] Tested in both locked and edit modes

## References

- Implementation: `scripts/sheets/actor/smart-edit.js`
- Handlebars helper: `scripts/handlebars-helpers.js` (search for "smart-field")
- Example usage: `templates/actor-sheet.html` (identity section)
- Dialog compatibility: `scripts/lib/dialog-compat.js`

## Project-Specific Notes

For BitD Alternate Sheets:
- Vice Purveyor filtering uses strict lowercase `includes()` check
- NPC description fallback: `description_short` → `description` → `notes` → `biography`
- Compendium types: `heritage`, `background`, `vice`, `class`, `npc`
- Card selection dialogs use DialogV2 for Foundry V12+ compatibility
