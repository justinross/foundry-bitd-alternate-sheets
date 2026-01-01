# Foundry VTT Document Update Syntax

## Setting Values

### Direct Property Paths

```javascript
const updates = {};

// System fields
updates["system.field"] = newValue;
updates["system.nested.deep.field"] = newValue;

// Flags (use template literal for module name)
updates[`flags.${MODULE_ID}.field`] = newValue;
updates[`flags.${MODULE_ID}.nested.field`] = newValue;

// Apply updates
await actor.update(updates);
```

### Flag Helper Methods

```javascript
// Set flag (alternative to update syntax)
await actor.setFlag("module-name", "flagName", value);

// Get flag
const value = actor.getFlag("module-name", "flagName");

// Unset (remove) flag
await actor.unsetFlag("module-name", "flagName");
```

## Removing Fields (Unset)

### The `-=` Unset Operator

Foundry provides a special `-=` operator to completely remove fields from documents:

```javascript
const updates = {};

// Remove system field
updates["system.-=oldField"] = null;

// Remove flag
updates[`flags.${MODULE_ID}.-=oldFlag`] = null;

// Remove nested field
updates["system.nested.-=oldField"] = null;

// Remove specific key from a map/object
updates[`flags.${MODULE_ID}.map.-=keyName`] = null;

await actor.update(updates);
```

**Important:**
- The value MUST be `null` (not `undefined` or any other value)
- This completely removes the field from the database
- Different from setting to `null` which leaves the key with null value

### Setting to null vs Using `-=`

```javascript
// Setting to null - key remains, value is null
await actor.update({ "system.field": null });
// Result: { system: { field: null } }

// Using -= - key is completely removed
await actor.update({ "system.-=field": null });
// Result: { system: { } }
```

## Safe Property Access

### foundry.utils.getProperty

Safely access nested properties without throwing errors:

```javascript
// Safe - returns undefined if any level missing
const value = foundry.utils.getProperty(actor, "system.deep.nested.field");

// Unsafe - throws TypeError if intermediate property missing
const value = actor.system.deep.nested.field;  // Error if 'deep' is undefined!
```

**Use `getProperty` when:**
- Accessing deeply nested fields
- Field existence is uncertain
- Migrating data that may not exist

### foundry.utils.setProperty

Safely set nested properties, creating intermediate objects as needed:

```javascript
const updates = {};

// Creates nested structure automatically
foundry.utils.setProperty(updates, "system.deep.nested.field", value);

// Equivalent to:
updates["system.deep.nested.field"] = value;
```

## Batching Updates

### Single Update Call (Efficient)

```javascript
const updates = {};

// Accumulate all changes
updates["system.field1"] = value1;
updates["system.field2"] = value2;
updates[`flags.${MODULE_ID}.field3`] = value3;
updates["system.-=oldField"] = null;

// Single database write
await actor.update(updates);
```

### Multiple Calls (Inefficient)

```javascript
// ❌ BAD: Three database writes, three hook cascades
await actor.update({ "system.field1": value1 });
await actor.update({ "system.field2": value2 });
await actor.update({ "system.field3": value3 });
```

## Embedded Documents

### Update Embedded Documents

```javascript
const updates = [];

for (const item of actor.items) {
    if (needsUpdate(item)) {
        updates.push({
            _id: item.id,              // Required - identifies which item to update
            "system.field": newValue,
            "system.-=oldField": null
        });
    }
}

if (updates.length > 0) {
    await actor.updateEmbeddedDocuments("Item", updates);
}
```

**Key points:**
- Must include `_id` to identify which embedded document to update
- Can batch multiple embedded document updates
- Use same property path syntax as regular updates

### Create Embedded Documents

```javascript
const itemsToCreate = [
    {
        name: "New Item",
        type: "ability",
        system: { ... }
    }
];

await actor.createEmbeddedDocuments("Item", itemsToCreate);
```

### Delete Embedded Documents

```javascript
const idsToDelete = ["abc123", "def456"];

await actor.deleteEmbeddedDocuments("Item", idsToDelete);
```

## Common Patterns

### Conditional Update (Only if Changed)

```javascript
const currentValue = actor.system.field;
const newValue = calculateNewValue();

if (currentValue !== newValue) {
    await actor.update({ "system.field": newValue });
}
```

### Migrate Field Location

```javascript
const updates = {};
let changed = false;

const oldValue = actor.system.oldField;
const newValue = actor.getFlag(MODULE_ID, "newField");

if (oldValue && !newValue) {
    // Migrate old → new
    updates[`flags.${MODULE_ID}.newField`] = oldValue;
    updates["system.-=oldField"] = null;
    changed = true;
} else if (oldValue && newValue) {
    // Both exist - clean up old
    updates["system.-=oldField"] = null;
    changed = true;
}

if (changed) {
    await actor.update(updates);
}
```

### Array → Object Transformation

```javascript
const oldArray = actor.getFlag(MODULE_ID, "items");

if (Array.isArray(oldArray)) {
    const newObject = {};
    for (const item of oldArray) {
        if (item?.id) {
            newObject[item.id] = item;
        }
    }

    await actor.setFlag(MODULE_ID, "items", newObject);
}
```

## Update Options

```javascript
// Suppress automatic re-render
await actor.update(updates, { render: false });

// Add diff information
await actor.update(updates, { diff: true });

// Custom options for hook handlers
await actor.update(updates, { myModule: { skipHook: true } });
```

**Common options:**
- `render: false` - Prevent automatic sheet re-render
- `diff: true` - Include change diff in update hooks
- Custom options passed to hook handlers

## Validation and Errors

### Update Returns

```javascript
// update() returns the updated document
const updatedActor = await actor.update(updates);

// Or null if update failed validation
if (!updatedActor) {
    console.error("Update failed validation");
}
```

### Try-Catch for Error Handling

```javascript
try {
    await actor.update(updates);
} catch (err) {
    console.error("Update failed:", err);
    ui.notifications.error("Failed to update actor");
}
```

## Performance Considerations

### Single Update vs Multiple

```javascript
// ✅ EFFICIENT: One database write
const updates = {
    "system.field1": value1,
    "system.field2": value2,
    "system.field3": value3
};
await actor.update(updates);

// ❌ INEFFICIENT: Three database writes
await actor.update({ "system.field1": value1 });
await actor.update({ "system.field2": value2 });
await actor.update({ "system.field3": value3 });
```

**Why batching matters:**
- Each `update()` call triggers database write
- Each triggers `updateActor` hook (on all clients in multi-client session)
- Each may trigger sheet re-render
- Batching = 1 write, 1 hook cascade, 1 render

### Embedded Document Batching

```javascript
// ✅ EFFICIENT: Single updateEmbeddedDocuments call
const updates = items.map(item => ({
    _id: item.id,
    "system.field": newValue
}));
await actor.updateEmbeddedDocuments("Item", updates);

// ❌ INEFFICIENT: Loop with individual updates
for (const item of items) {
    await actor.updateEmbeddedDocuments("Item", [{
        _id: item.id,
        "system.field": newValue
    }]);
}
```
