# Foundry VTT Virtual Lists (Character Sheet Pattern)

Display ALL available items/abilities for selection, not just owned items, enabling "check to add" UX instead of "drag from compendium" workflow.

## When to Use This Skill

Invoke this skill when implementing character sheet features that need to:

### ✅ Use Virtual Lists For:

- **Playbook abilities** - Show all available abilities for current playbook, not just owned
- **Items/gear** - Display available equipment for selection
- **Special abilities** - Show full list of options with checkboxes
- **Cross-playbook abilities** - Display abilities from other playbooks with "ghost" state
- **Talents/upgrades** - Any character option that can be selected/toggled

### ❌ Don't Use Virtual Lists For:

- Simple owned item inventory (regular Foundry item list)
- Items that aren't associated with playbooks/classes
- Non-selectable display-only lists
- Items where "drag from compendium" UX is acceptable

## The Problem: Default Foundry Sheets

### What Happens with Standard Foundry Item Lists

```
Default Actor Sheet:
  ↓
Only shows OWNED items
  ↓
To add ability:
  1. User opens compendium
  2. User searches for ability
  3. User drags to sheet
  4. Item created on actor
  ↓
Result: Clunky UX, doesn't match tabletop character sheet experience
```

**Issues:**
- ❌ User can't see what abilities are available
- ❌ Must know ability name to search for it
- ❌ Can't see ability description before adding
- ❌ Doesn't match paper character sheet (shows all options with checkboxes)
- ❌ Cross-playbook abilities are hidden

## Solution: Virtual Lists

### What is a Virtual List?

A **virtual list** shows ALL available items of a type, merging:
1. **Source items** - From world + compendia (available but not owned)
2. **Owned items** - From actor.items (already added to character)
3. **Ghost slots** - Cross-playbook items with progress=0 (placeholder UI)

### User Experience Flow

```
Virtual List Sheet:
  ↓
Shows ALL abilities for playbook (native + cross-playbook)
  ↓
Each ability has checkbox:
  - Empty = not owned
  - Checked = owned and activated
  - Ghost = owned but from other playbook, unchecked
  ↓
User clicks checkbox:
  - If not owned → Create embedded document
  - If owned → Toggle progress/active state
  - If ghost → Activate (set progress > 0)
  ↓
Result: Tabletop-like UX, all options visible
```

## Step-by-Step Implementation

### Step 1: Fetch Source Items

**File:** `scripts/utils/collections.js` (or similar)

```javascript
/**
 * Get all items of a type from world + compendia
 * @param {string} item_type - "ability", "item", "class", "npc", etc.
 * @returns {Promise<Array>} All available items of this type
 */
export async function getSourcedItemsByType(item_type) {
  const populateFromWorld = game.settings.get("my-module", "populateFromWorld");
  const populateFromCompendia = game.settings.get("my-module", "populateFromCompendia");
  const searchAllPacks = game.settings.get("my-module", "searchAllPacks");

  let items = [];

  // 1. Get from world items/actors
  if (populateFromWorld) {
    if (item_type === "npc") {
      items = items.concat(game.actors.filter(a => a.type === item_type));
    } else {
      items = items.concat(game.items.filter(i => i.type === item_type));
    }
  }

  // 2. Get from compendia
  if (populateFromCompendia) {
    if (searchAllPacks) {
      // Search ALL packs (for homebrew content)
      const targetDocName = item_type === "npc" ? "Actor" : "Item";
      for (const pack of game.packs) {
        if (pack.documentName !== targetDocName) continue;
        const docs = await pack.getDocuments();
        items = items.concat(docs.filter(d => d.type === item_type));
      }
    } else {
      // Search only system-specific pack
      const packName = item_type === "npc" ? "npcs" : item_type;
      const pack = game.packs.get(`my-system.${packName}`);

      if (pack) {
        const docs = await pack.getDocuments();
        items = items.concat(docs.filter(d => d.type === item_type));
      }
    }
  }

  // 3. Sort alphabetically
  items.sort((a, b) => a.name.localeCompare(b.name));

  return items;
}
```

**Settings Required:**
```javascript
// In scripts/settings.js
game.settings.register("my-module", "populateFromWorld", {
  name: "Populate from World Items",
  scope: "world",
  config: true,
  type: Boolean,
  default: true,
});

game.settings.register("my-module", "populateFromCompendia", {
  name: "Populate from Compendia",
  scope: "world",
  config: true,
  type: Boolean,
  default: true,
});

game.settings.register("my-module", "searchAllPacks", {
  name: "Search All Packs (Homebrew Support)",
  hint: "Search all installed modules for items, not just core system",
  scope: "world",
  config: true,
  type: Boolean,
  default: false,
});
```

### Step 2: Filter by Playbook/Class

```javascript
/**
 * Filter source items by playbook
 * @param {Array} allItems - All items from getSourcedItemsByType
 * @param {string} playbookName - Current character's playbook
 * @returns {Array} Items for this playbook
 */
function filterByPlaybook(allItems, playbookName) {
  return allItems.filter(item => {
    const itemClass = item.system?.class || item.system?.associated_class || "";

    // Empty class = generic item (not playbook-specific)
    if (itemClass === "") {
      return false;  // Don't show generic items in playbook lists
    }

    // Match current playbook
    return itemClass === playbookName;
  });
}
```

### Step 3: Map to Virtual Item Format

```javascript
/**
 * Convert items to virtual item format
 * @param {Array} items - Source or owned items
 * @param {boolean} owned - Whether these items are owned by actor
 * @returns {Array} Virtual items with metadata
 */
function mapToVirtualItems(items, owned) {
  return items.map(item => ({
    _id: item._id || item.id,
    name: item.name,
    img: item.img || "icons/svg/item-bag.svg",
    type: item.type,
    system: item.system,
    owned: owned,  // ← Critical flag for display
    source: item,  // Reference to original document
  }));
}
```

### Step 4: Merge Source + Owned Items

```javascript
/**
 * Merge source items (available) with owned items
 * @param {Array} sourceVirtual - Virtual items from world/compendia
 * @param {Array} ownedVirtual - Virtual items from actor.items
 * @param {boolean} showDuplicates - Show owned items even if in source list?
 * @returns {Array} Merged list
 */
function mergeVirtualLists(sourceVirtual, ownedVirtual, showDuplicates = false) {
  const merged = [...sourceVirtual];

  for (const owned of ownedVirtual) {
    // Check if this owned item is already in source list
    const existingIndex = merged.findIndex(item => item.name === owned.name);

    if (existingIndex !== -1) {
      // Replace source item with owned version
      merged[existingIndex] = owned;
    } else if (showDuplicates || !existingIndex) {
      // Add owned item that isn't in source list (cross-playbook, custom, etc.)
      merged.push(owned);
    }
  }

  return merged;
}
```

### Step 5: Add Ghost Slots (Cross-Playbook Abilities)

```javascript
/**
 * Add ghost slots for cross-playbook abilities
 * Ghost = owned by actor but from different playbook, currently unchecked
 * @param {Array} virtualList - Merged virtual list
 * @param {Actor} actor - Current actor
 * @returns {Promise<Array>} Virtual list with ghosts
 */
async function addGhostSlots(virtualList, actor) {
  const currentPlaybook = actor.system.playbook;
  const abilityProgress = actor.getFlag(MODULE_ID, "abilityProgress") || {};

  // Find owned abilities from other playbooks
  const ownedAbilities = actor.items.filter(i => i.type === "ability");

  for (const ability of ownedAbilities) {
    const abilityClass = ability.system?.class || "";
    const progress = abilityProgress[ability._id] || 0;

    // Is this a cross-playbook ability with 0 progress?
    const isCrossPlaybook = abilityClass !== currentPlaybook;
    const isGhost = progress === 0;

    if (isCrossPlaybook && isGhost) {
      // Check if already in virtual list
      const exists = virtualList.find(v => v._id === ability._id);
      if (!exists) {
        // Add as ghost
        virtualList.push({
          _id: ability._id,
          name: ability.name,
          img: ability.img,
          type: ability.type,
          system: ability.system,
          owned: true,
          ghost: true,  // ← Special flag for ghost state
          source: ability,
        });
      }
    }
  }

  return virtualList;
}
```

### Step 6: Integrate with getData()

```javascript
async getData() {
  const data = await super.getData();
  const actor = this.actor;
  const currentPlaybook = actor.system.playbook;

  // Get virtual list of abilities for current playbook
  const abilities = await getVirtualListOfAbilities(actor, currentPlaybook);

  // Add to template data
  data.abilities = abilities;

  // Optionally group by category
  data.abilitiesByCategory = groupAbilitiesByCategory(abilities);

  return data;
}

/**
 * Full virtual list pipeline
 */
async function getVirtualListOfAbilities(actor, playbook) {
  // 1. Get all abilities from world + compendia
  const allAbilities = await getSourcedItemsByType("ability");

  // 2. Filter by playbook
  const playbookAbilities = filterByPlaybook(allAbilities, playbook);

  // 3. Map to virtual format
  const sourceVirtual = mapToVirtualItems(playbookAbilities, false);

  // 4. Get owned abilities
  const ownedAbilities = actor.items.filter(i => i.type === "ability");
  const ownedVirtual = mapToVirtualItems(ownedAbilities, true);

  // 5. Merge
  let merged = mergeVirtualLists(sourceVirtual, ownedVirtual);

  // 6. Add ghost slots
  merged = await addGhostSlots(merged, actor);

  return merged;
}
```

### Step 7: Display in Template

**File:** `templates/actor-sheet.html`

```handlebars
<div class="abilities-section">
  <h2>Abilities</h2>

  {{#each abilities as |ability|}}
    <div class="ability-row {{#if ability.owned}}owned{{/if}} {{#if ability.ghost}}ghost{{/if}}">

      {{!-- Checkbox for owned items --}}
      {{#if ability.owned}}
        <input type="checkbox"
               class="ability-checkbox"
               data-ability-id="{{ability._id}}"
               {{#if (abilityIsActive ability)}}checked{{/if}}
               {{#if ability.ghost}}data-ghost="true"{{/if}}>
      {{else}}
        {{!-- Click to add for non-owned --}}
        <button class="add-ability" data-ability-id="{{ability._id}}" data-ability-name="{{ability.name}}">
          <i class="fas fa-plus"></i>
        </button>
      {{/if}}

      {{!-- Ability name and description --}}
      <div class="ability-info">
        <h4>{{ability.name}}</h4>
        <p>{{ability.system.description}}</p>
      </div>

      {{!-- Delete button for owned items --}}
      {{#if ability.owned}}
        <button class="delete-ability" data-ability-id="{{ability._id}}">
          <i class="fas fa-trash"></i>
        </button>
      {{/if}}
    </div>
  {{/each}}
</div>
```

### Step 8: Handle Click Events

```javascript
activateListeners(html) {
  super.activateListeners(html);

  // Add ability (not owned)
  html.find('.add-ability').click(async (ev) => {
    const abilityId = ev.currentTarget.dataset.abilityId;
    const abilityName = ev.currentTarget.dataset.abilityName;

    // Find in source list
    const allAbilities = await getSourcedItemsByType("ability");
    const ability = allAbilities.find(a => a._id === abilityId || a.name === abilityName);

    if (!ability) {
      ui.notifications.error(`Ability "${abilityName}" not found`);
      return;
    }

    // Create embedded document
    await this.actor.createEmbeddedDocuments("Item", [ability.toObject()]);

    // No need to manually render - Foundry hook handles it
  });

  // Toggle ability (owned)
  html.find('.ability-checkbox').click(async (ev) => {
    const checkbox = ev.currentTarget;
    const abilityId = checkbox.dataset.abilityId;
    const isGhost = checkbox.dataset.ghost === "true";

    // Read current progress
    const abilityProgress = this.actor.getFlag(MODULE_ID, "abilityProgress") || {};
    const currentProgress = abilityProgress[abilityId] || 0;
    const maxProgress = 1;  // Or read from ability.system.maxProgress

    // Toggle progress
    const newProgress = currentProgress >= maxProgress ? 0 : currentProgress + 1;

    // Update flag
    await this.actor.setFlag(MODULE_ID, `abilityProgress.${abilityId}`, newProgress);

    // Ghost becomes non-ghost when checked
    // No manual render needed - optimistic UI + Foundry hook
  });

  // Delete ability
  html.find('.delete-ability').click(async (ev) => {
    const abilityId = ev.currentTarget.dataset.abilityId;

    // Confirm deletion
    const confirmed = await Dialog.confirm({
      title: "Delete Ability",
      content: "<p>Are you sure you want to remove this ability?</p>",
    });

    if (!confirmed) return;

    // Delete embedded document
    await this.actor.deleteEmbeddedDocuments("Item", [abilityId]);

    // Clean up progress flag
    await this.actor.unsetFlag(MODULE_ID, `abilityProgress.${abilityId}`);
  });
}
```

## Virtual List Patterns

### Pattern 1: Simple Virtual List (No Duplicates)

**Use case:** Show ALL playbook abilities, owned ones appear checked

```javascript
const sourceItems = await getSourcedItemsByType("ability");
const playbookItems = filterByPlaybook(sourceItems, currentPlaybook);
const virtualSource = mapToVirtualItems(playbookItems, false);

const ownedItems = actor.items.filter(i => i.type === "ability");
const virtualOwned = mapToVirtualItems(ownedItems, true);

// Merge: owned replaces source
const merged = mergeVirtualLists(virtualSource, virtualOwned, false);
```

**Result:** One entry per ability, `owned: true` for ones on actor

### Pattern 2: Virtual List with Ghost Slots

**Use case:** Show native abilities + cross-playbook abilities as ghosts

```javascript
let merged = mergeVirtualLists(virtualSource, virtualOwned, false);
merged = await addGhostSlots(merged, actor);
```

**Result:** Native abilities + ghost placeholders for cross-playbook

### Pattern 3: Grouped Virtual List

**Use case:** Group abilities by category/type

```javascript
function groupAbilitiesByCategory(virtualList) {
  const grouped = {};

  for (const item of virtualList) {
    const category = item.system?.category || "Other";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(item);
  }

  return grouped;
}

// In template:
{{#each abilitiesByCategory as |abilities category|}}
  <h3>{{category}}</h3>
  {{#each abilities as |ability|}}
    ...
  {{/each}}
{{/each}}
```

### Pattern 4: Sorted Virtual List

**Use case:** Sort by owned first, then alphabetically

```javascript
function sortVirtualItems(virtualList) {
  return virtualList.sort((a, b) => {
    // Owned items first
    if (a.owned && !b.owned) return -1;
    if (!a.owned && b.owned) return 1;

    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}
```

## Performance Considerations

### Caching Source Items

```javascript
// Cache results to avoid repeated compendium lookups
let _cachedSourceItems = {};

async function getSourcedItemsByType(item_type) {
  // Check cache
  if (_cachedSourceItems[item_type]) {
    return _cachedSourceItems[item_type];
  }

  // Fetch from world + compendia
  const items = await fetchItems(item_type);

  // Cache
  _cachedSourceItems[item_type] = items;

  return items;
}

// Invalidate cache when world items change
Hooks.on("createItem", () => {
  _cachedSourceItems = {};
});

Hooks.on("updateItem", () => {
  _cachedSourceItems = {};
});

Hooks.on("deleteItem", () => {
  _cachedSourceItems = {};
});
```

### Lazy Loading for Large Lists

```javascript
// Don't load ALL items upfront if there are hundreds
async function getVirtualListLazy(type, playbook, offset = 0, limit = 50) {
  const allItems = await getSourcedItemsByType(type);
  const filtered = filterByPlaybook(allItems, playbook);

  // Paginate
  const page = filtered.slice(offset, offset + limit);

  return {
    items: page,
    hasMore: offset + limit < filtered.length,
    total: filtered.length,
  };
}
```

## Ghost Slots Pattern

### What is a Ghost Slot?

A **ghost slot** is a UI placeholder for a cross-playbook ability that:
- Is owned by the actor (embedded document exists)
- Has progress = 0 (not activated)
- Appears grayed out on the sheet
- Can be activated by checking the box
- Can be deleted explicitly (trashcan icon)

### Why Ghost Slots?

**Without ghosts:**
```
User adds Lurk ability to Cutter character
User unchecks it (progress = 0)
  ↓
Ability disappears from sheet!
  ↓
User confused: "Where did my ability go?"
```

**With ghosts:**
```
User adds Lurk ability to Cutter character
User unchecks it (progress = 0)
  ↓
Ability remains visible (grayed out)
  ↓
User can re-check or explicitly delete
```

### Implementing Ghost Detection

```javascript
function isGhost(ability, actor) {
  const currentPlaybook = actor.system.playbook;
  const abilityClass = ability.system?.class || "";
  const progress = actor.getFlag(MODULE_ID, `abilityProgress.${ability._id}`) || 0;

  // Ghost = cross-playbook + zero progress
  return abilityClass !== currentPlaybook && progress === 0;
}
```

### Styling Ghosts

```scss
.ability-row.ghost {
  opacity: 0.5;

  .ability-checkbox {
    border: 2px dashed var(--alt-gray);
  }

  .ability-info {
    color: var(--alt-gray-dark);
  }
}

.ability-row.owned:not(.ghost) {
  background: var(--alt-primary-light);
}
```

## Display Patterns

### Pattern 1: Checkbox for Owned, Button for Available

```handlebars
{{#if ability.owned}}
  <input type="checkbox" {{#if (abilityIsActive ability)}}checked{{/if}}>
{{else}}
  <button class="add-ability">Add</button>
{{/if}}
```

### Pattern 2: Always Show Checkbox (Disabled if Not Owned)

```handlebars
<input type="checkbox"
       {{#unless ability.owned}}disabled{{/unless}}
       {{#if (abilityIsActive ability)}}checked{{/if}}>
```

### Pattern 3: Teeth Progress Bar (Multi-Level Abilities)

```handlebars
{{!-- For abilities with multiple progress levels (0-3) --}}
<div class="ability-progress">
  {{#times ability.system.maxProgress}}
    <div class="tooth {{#if (lte @index ../currentProgress)}}filled{{/if}}"
         data-ability-id="{{../ability._id}}"
         data-progress="{{@index}}">
    </div>
  {{/times}}
</div>
```

## Common Use Cases

### Use Case 1: Character Sheet Abilities

**Scenario:** Blades in the Dark character with Cutter playbook

```javascript
// In getData()
const abilities = await getVirtualListOfAbilities(this.actor, "Cutter");

// Results:
// - Not the Face (Cutter, not owned) → Show "Add" button
// - Battleborn (Cutter, owned, progress=2) → Show 2/2 teeth filled
// - Shadow (Lurk, owned, progress=0) → Show as ghost
```

### Use Case 2: Equipment List

**Scenario:** Show all available gear for current playbook

```javascript
const gear = await getVirtualListOfItems(this.actor, "Whisper");

// Filter equipped items
const equipped = gear.filter(item => {
  const equippedMap = this.actor.getFlag(MODULE_ID, "equipped-items") || {};
  return equippedMap[item._id];
});
```

### Use Case 3: Crew Upgrades

**Scenario:** Show all available crew upgrades with checkboxes

```javascript
const upgrades = await getVirtualListOfItems(crew, "Shadows");

// Display as checklist
{{#each upgrades as |upgrade|}}
  <label>
    <input type="checkbox"
           data-upgrade-id="{{upgrade._id}}"
           {{#if upgrade.owned}}checked{{/if}}>
    {{upgrade.name}}
  </label>
{{/each}}
```

## Integration with Other Skills

### With Smart Field System

Virtual lists power the smart field choosers:

```javascript
// Smart field opens card selection dialog
// Dialog shows virtual list of NPCs filtered by vice
const npcs = await getFilteredActors("npc", "system.associated_crew_type", viceType);
```

### With Optimistic UI Updates

Checkbox toggles use optimistic UI:

```javascript
// 1. Update UI immediately
checkbox.classList.toggle("checked");

// 2. Persist to flags
await actor.setFlag(MODULE_ID, `abilityProgress.${abilityId}`, newProgress);

// 3. Don't manually render (Foundry hook handles it)
```

### With Performance Safe Updates

Always guard with ownership:

```javascript
html.find('.ability-checkbox').click(async (ev) => {
  // Ownership guard
  if (!this.actor.isOwner) return;

  // Update logic...
});
```

## Quick Checklist

Before implementing virtual lists:

- [ ] Settings registered for `populateFromWorld`, `populateFromCompendia`, `searchAllPacks`
- [ ] `getSourcedItemsByType()` function fetches from world + compendia
- [ ] Filter function for playbook/class matching
- [ ] Map to virtual item format with `owned` flag
- [ ] Merge source + owned items logic
- [ ] Ghost slot detection and addition
- [ ] Template displays owned vs available differently
- [ ] Click handlers for add/toggle/delete
- [ ] Ownership guards on all update operations
- [ ] Caching for performance (if large item lists)

## References

- Implementation: `scripts/utils/collections.js` - `getSourcedItemsByType()`
- Virtual list pipeline: `scripts/utils.js` - `getVirtualListOfItems()`
- Ghost slots: `scripts/utils.js` - `_addGhostSlotsForAbilities()`
- Display: `templates/actor-sheet.html` - Abilities section
- Click handlers: `scripts/blades-alternate-actor-sheet.js` - activateListeners

## Project-Specific Notes

For BitD Alternate Sheets:
- Abilities use virtual lists with ghost slots
- Items use virtual lists for gear selection
- Cross-playbook abilities persist as ghosts when unchecked (progress=0)
- Native playbook abilities auto-delete when unchecked
- Equipped items tracked separately in `equipped-items` flag
- Progress tracked in `abilityProgress` flag (multi-dot abilities)
