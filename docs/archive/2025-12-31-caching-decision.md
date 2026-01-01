# Compendium Caching Options Comparison

**Decision**: Stick with current module-level cache implementation (Phase 1)
**Date**: 2025-12-31
**Rationale**: Module-level cache already provides 5-10x improvement. Additional caching layers add complexity without sufficient ROI. Can revisit if performance issues arise.

---

## Current Situation

**Problem**: Every sheet render fetches from compendia to populate "available abilities/items" checkbox lists
**Current Fix**: Module-level cache prevents repeated `pack.getDocuments()` calls
**Remaining Issue**: Still iterates 19 packs and processes data on every render

## Option 1: Sheet-Level Cache (What I Originally Proposed)

**Implementation**:
```javascript
async getData() {
  if (!this._cachedAbilities) {
    this._cachedAbilities = await fetchAndProcessAbilities();
  }
  data.abilities = this._cachedAbilities;
}
```

**Storage**: JavaScript variable on sheet instance
**Lifetime**: Lost when sheet closes
**Invalidation**: Clear when playbook changes

**Pros**:
- Fast subsequent renders (same sheet session)
- No data persistence needed
- Easy to implement

**Cons**:
- First render still slow
- Cache lost on sheet close/reopen
- Still need compendium cache underneath

## Option 2: Flag-Based Cache (What You're Proposing)

**Implementation**:
```javascript
// When playbook changes:
async switchPlaybook(newPlaybook) {
  const abilities = await fetchFromCompendia(newPlaybook);
  await this.actor.setFlag('bitd-alternate-sheets', 'availableAbilities', abilities);
}

// In getData():
async getData() {
  data.available_abilities = this.actor.getFlag('bitd-alternate-sheets', 'availableAbilities');

  // If null, populate it (first time or migration)
  if (!data.available_abilities) {
    data.available_abilities = await this._populateAbilityCache();
  }
}
```

**Storage**: Actor flags (persisted to database)
**Lifetime**: Permanent (until playbook changes or compendia updated)
**Invalidation**: On playbook change, or manually when compendia updated

**Pros**:
- Zero compendium access in getData() (after initial population)
- Persists across sheet opens/closes
- Fastest option
- Works even offline (no compendium needed)

**Cons**:
- Data duplication (every character stores full ability list)
- Storage overhead (~200-500 KB per character for full ability lists)
- Stale data if compendia updated (need manual invalidation)
- Migration complexity (need to populate flags for existing characters)
- Need to invalidate/repopulate when:
  - Playbook changes
  - Module updated
  - Compendia updated
  - Settings change (searchAllPacks, populateFromCompendia)

## Option 3: UX Change (Only Show Owned Items)

**Implementation**:
```javascript
// getData() only processes owned items
async getData() {
  data.owned_abilities = this.actor.items.filter(i => i.type === 'ability');
  // No compendium access at all!
}

// Add button opens dialog that fetches from compendia
async openAddAbilityDialog() {
  const available = await fetchFromCompendia();
  // Show dialog with available list
}
```

**Storage**: Only owned items (already in actor.items)
**Compendium Access**: Only when opening "Add Ability" dialog

**Pros**:
- Zero compendium access in getData()
- Zero data duplication
- No cache invalidation needed
- Fastest option by far

**Cons**:
- **Major UX change**: Users can't see all options at a glance
- Breaks "checkbox character builder" design
- Requires template redesign
- May be confusing for players

## Recommendation Matrix

| Priority | Recommendation | Why |
|----------|---------------|-----|
| **Fast implementation, maintain UX** | Option 1 (Sheet-level) | 30 min, 50% speedup, zero risk |
| **Maximum performance, maintain UX** | Option 2 (Flag-based) | Best speed, but complexity |
| **Simplicity + performance** | Option 3 (UX change) | Cleanest architecture, but UX impact |

## Detailed Analysis: Flag-Based Approach

### When to Populate Flags

**Scenario 1: New Character**
```javascript
// On first render, if flag is null:
if (!this.actor.getFlag('bitd-alternate-sheets', 'availableAbilities')) {
  await this._populateAbilityCache();
}
```

**Scenario 2: Playbook Change**
```javascript
async switchPlaybook(newPlaybook) {
  await queueUpdate(async () => {
    await this.actor.update({...});

    // Invalidate and repopulate ability cache
    const abilities = await this._fetchAbilitiesForPlaybook(newPlaybook);
    await this.actor.setFlag('bitd-alternate-sheets', 'availableAbilities', abilities);
  });
}
```

**Scenario 3: Migration (Existing Characters)**
```javascript
// In registerHooks():
Hooks.on('renderBladesAlternateActorSheet', async (sheet) => {
  const needsMigration = !sheet.actor.getFlag('bitd-alternate-sheets', 'availableAbilities');
  if (needsMigration) {
    await sheet._populateAbilityCache();
  }
});
```

### When to Invalidate Flags

**Problem**: Flag data becomes stale when:
1. Compendia are updated (new abilities added to packs)
2. Module settings change (searchAllPacks toggled)
3. Module is updated (ability structure changes)

**Solutions**:

**Option A: Version-based invalidation**
```javascript
const CACHE_VERSION = 2; // Increment when ability structure changes

async _getCachedAbilities() {
  const cache = this.actor.getFlag('bitd-alternate-sheets', 'abilityCache');
  if (cache?.version === CACHE_VERSION) {
    return cache.data;
  }

  // Cache is stale, repopulate
  return await this._populateAbilityCache();
}

async _populateAbilityCache() {
  const abilities = await fetchFromCompendia();
  await this.actor.setFlag('bitd-alternate-sheets', 'abilityCache', {
    version: CACHE_VERSION,
    data: abilities
  });
  return abilities;
}
```

**Option B: Manual invalidation button**
```javascript
// Add a button to sheet header: "Refresh Available Items"
async _onRefreshCache() {
  await this.actor.unsetFlag('bitd-alternate-sheets', 'availableAbilities');
  await this._populateAbilityCache();
  this.render(false);
}
```

**Option C: Timestamp-based expiration**
```javascript
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async _getCachedAbilities() {
  const cache = this.actor.getFlag('bitd-alternate-sheets', 'abilityCache');
  const isExpired = !cache || (Date.now() - cache.timestamp > CACHE_TTL);

  if (isExpired) {
    return await this._populateAbilityCache();
  }
  return cache.data;
}
```

### Storage Size Estimation

Per character:
- 83 abilities × ~500 bytes each = ~41 KB
- 53 items × ~400 bytes each = ~21 KB
- Total: ~62 KB per character

For a world with 10 characters: ~620 KB additional database size

**Verdict**: Storage overhead is acceptable.

### Trade-offs Summary

**Flag-based caching trades:**
- **Complexity** (invalidation logic, migration)
- **Storage** (62 KB per character)
- **Staleness risk** (cache might be outdated)

For:
- **Speed** (zero compendium access in getData)
- **Persistence** (survives sheet close/reopen)

## My Recommendation

Given your question, I think you want **Option 2 (Flag-based)** because you explicitly mentioned flags.

**However**, I'd suggest starting with **Option 1 (Sheet-level)** because:

1. **Current performance is already good** with module-level cache
2. **Flag-based adds complexity** (invalidation, migration)
3. **Sheet-level is 90% of the benefit** with 10% of the complexity
4. **You can always upgrade** to flag-based later if needed

The module-level cache we just implemented already gives you 5-10x speedup. Sheet-level caching would make it even faster, but the marginal improvement might not be worth the flag-based complexity.

**Question**: How slow does the sheet feel to you now with the module-level cache? If it's fast enough, we might not need any additional caching.
