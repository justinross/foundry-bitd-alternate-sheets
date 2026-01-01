# Documentation Management

Maintain clean, useful documentation by following clear guidelines for what to create, how to name it, where to put it, and when to archive or delete it.

## When to Use This Skill

Invoke this skill when:

### ✅ Creating Documentation
- About to create a new .md file
- Completing an analysis or audit
- Documenting a decision or design
- Uncertain if something should be documented

### ✅ Maintaining Documentation
- Reviewing existing docs for relevance
- Deciding whether to archive or delete
- Organizing documentation structure
- Creating index/README files

### ✅ Meta Questions
- "Should I document this?"
- "Where does this doc belong?"
- "Is this still useful or just clutter?"
- "What should I name this file?"

## The Problem: Documentation Clutter

### What Happens Without Clear Policies

```
Timeline:
T0: Create ANALYSIS.md during investigation
T1: Create FIX_PLAN.md with proposed changes
T2: Implement fixes, create skills encoding patterns
T3: Create ANOTHER_ANALYSIS.md for different issue
T4: Months later...
  ↓
docs/ directory has 20+ files
  ↓
Generic names: ANALYSIS.md, AUDIT.md, PLAN.md
No dates, no clear relevance
  ↓
Can't tell what's current vs historical
Can't tell what's useful vs clutter
  ↓
New developers overwhelmed
Nobody links to these docs
Nobody maintains them
```

**Result:** Documentation becomes write-only. Nobody reads it, nobody trusts it.

## Solution: Documentation Policy

### Three Core Principles

1. **Be ruthless** - If you wouldn't link to it in README, delete it
2. **Be explicit** - Names and structure should make purpose obvious
3. **Extract to skills** - Repeatable patterns become skills, then delete source docs

## Document Types & Decision Tree

### Type 1: Active Reference Guides

**Purpose:** Timeless reference documentation that developers actively use

**Examples:**
- `dialogv2-custom-styling-guide.md` ✅
- `performance-update-guidelines.md` ✅
- `compat-helpers-guide.md` ✅

**Characteristics:**
- Referenced frequently during development
- Explains HOW to do something
- Doesn't become outdated (or gets updated when it does)
- Would link to it in project README

**Naming:** `{topic}-guide.md`

**Location:** `docs/guides/`

**Lifecycle:** Keep forever, update as needed

**Test:** "Would a new developer need this to work on the project?"

### Type 2: Architecture Documentation

**Purpose:** Explain system design, structure, and "why" decisions

**Examples:**
- `SCSS_ARCHITECTURE.md` ✅
- `VIRTUAL_LISTS_DESIGN.md` ✅
- `MODULE_STRUCTURE.md` ✅

**Characteristics:**
- Explains WHY the system works this way
- Documents design decisions and trade-offs
- Helps understand the big picture
- Relatively stable (architecture doesn't change often)

**Naming:** `{COMPONENT}_ARCHITECTURE.md` or `{COMPONENT}_DESIGN.md`

**Location:** `docs/architecture/`

**Lifecycle:** Keep forever, update when architecture changes

**Test:** "Does this explain why the system is structured this way?"

### Type 3: Architecture Decision Records (ADRs)

**Purpose:** Document important decisions to prevent re-litigation

**Examples:**
- `2025-11-15-why-virtual-lists.md` ✅
- `2025-12-01-cache-strategy-decision.md` ✅
- `2025-10-20-dialogv2-inline-styles.md` ✅

**Characteristics:**
- Point-in-time decision with context
- Answers: What was decided? Why? What were alternatives?
- Immutable (never updated, new ADR if decision changes)
- Dated to show when decision was made

**Naming:** `YYYY-MM-DD-{decision-title}.md`

**Location:** `docs/decisions/`

**Lifecycle:** Keep forever (shows evolution of thinking)

**Test:** "Would this prevent someone from proposing we re-do something we already tried?"

**Template:**
```markdown
# {Title of Decision}

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded by ADR-XXX
**Context:** What problem are we solving?
**Decision:** What did we decide to do?
**Alternatives Considered:**
- Option A: Pros/Cons
- Option B: Pros/Cons
**Consequences:** What are the implications?
**References:** Links to related issues, PRs, discussions
```

### Type 4: Skills

**Purpose:** Encode repeatable patterns and workflows

**Examples:**
- `foundry-vtt-performance-safe-updates` ✅
- `git-branching-strategy` ✅
- `documentation-management` ✅ (this skill!)

**Characteristics:**
- Actionable, step-by-step guidance
- Repeatable workflow
- Clear triggers for when to use
- Checklists and decision trees

**Naming:** `{descriptive-name}/SKILL.md`

**Location:** `skills/{skill-name}/`

**Lifecycle:** Keep forever, update as patterns evolve

**Test:** "Will I do this task more than once? Does it have clear steps?"

### Type 5: Historical Audits/Analysis

**Purpose:** Document completed investigations and fixes

**Examples:**
- `2025-10-15-performance-audit.md` ⚠️
- `2025-11-20-hook-cascade-audit.md` ⚠️
- `2025-12-31-skill-extraction-analysis.md` ⚠️

**Characteristics:**
- Point-in-time snapshot of a problem
- "Here's what we found and fixed"
- Useful context for understanding why code exists
- BUT: Often superseded by skills or code comments

**Naming:** `YYYY-MM-DD-{audit-name}.md`

**Location:** `docs/archive/` (if kept at all)

**Lifecycle:**
- **Option A:** Delete if lessons are encoded in skills
- **Option B:** Archive with date if decision context is valuable

**Test:** "Does this provide context that isn't captured elsewhere?"

### Type 6: Working Documents

**Purpose:** Temporary analysis during active development

**Examples:**
- `SKILL_CANDIDATES_ANALYSIS.md` ❌
- `PERFORMANCE_FIX_PLAN.md` ❌
- `WIP-new-feature-analysis.md` ❌

**Characteristics:**
- Created during investigation
- Helps organize thoughts
- Not meant to be permanent
- Serves as input to final docs (skills, ADRs, guides)

**Naming:** `YYYY-MM-DD-WIP-{topic}.md` or just work in memory/notes

**Location:** Root directory (temporary) or don't create at all

**Lifecycle:**
- **Delete immediately** after final doc is created
- **Never commit** if just for organizing thoughts
- **Convert** to skill/ADR/guide, then delete working doc

**Test:** "Will this still be useful a month from now?" (If no, delete it)

## The Decision Tree

### Should I Create Documentation?

```
New information/analysis → Should this be documented?
  ↓
Q1: Is this a repeatable pattern/workflow?
  ↓ YES
  → Create SKILL
  → Delete working notes

  ↓ NO
Q2: Is this explaining HOW to do something?
  ↓ YES
  → Create GUIDE (docs/guides/)
  → Permanent

  ↓ NO
Q3: Is this explaining WHY the system is designed this way?
  ↓ YES
  → Create ARCHITECTURE doc (docs/architecture/)
  → Permanent

  ↓ NO
Q4: Is this a decision we might re-litigate?
  ↓ YES
  → Create ADR (docs/decisions/YYYY-MM-DD-*.md)
  → Permanent

  ↓ NO
Q5: Is this just organizing thoughts or temporary analysis?
  ↓ YES
  → Don't create file OR create WIP doc
  → Delete after extracting to skill/guide/ADR
  → NEVER commit working docs to repo

  ↓ NO
  → Don't document it
```

## Directory Structure

### Recommended Organization

```
/
├── README.md                    # Project overview
├── CONTRIBUTING.md              # Development guidelines
├── CLAUDE.md                    # AI assistant guidance
│
├── docs/
│   ├── README.md               # INDEX of all documentation
│   │
│   ├── guides/                 # Active reference (HOW)
│   │   ├── dialogv2-custom-styling-guide.md
│   │   ├── performance-update-guidelines.md
│   │   └── compat-helpers-guide.md
│   │
│   ├── architecture/           # System design (WHY structure)
│   │   ├── scss-architecture.md
│   │   ├── virtual-lists-design.md
│   │   └── module-structure.md
│   │
│   ├── decisions/              # ADRs (WHY decisions)
│   │   ├── 2025-11-15-virtual-lists-over-drag-drop.md
│   │   ├── 2025-12-01-cache-strategy.md
│   │   └── 2025-12-20-inline-styles-for-dialogs.md
│   │
│   └── archive/                # Historical (optional)
│       ├── 2025-10-15-performance-audit.md
│       └── 2025-11-20-hook-cascade-audit.md
│
└── skills/                     # Repeatable patterns
    ├── README.md               # Skills index
    ├── foundry-vtt-performance-safe-updates/
    ├── git-branching-strategy/
    ├── documentation-management/  ← This skill!
    └── ...
```

### Flat Alternative (Minimal)

If you don't want subdirectories:

```
docs/
├── README.md                                # Index
├── dialogv2-guide.md                       # Active
├── performance-guide.md                    # Active
├── scss-architecture.md                    # Architecture
└── 2025-11-15-virtual-lists-decision.md   # ADR (dated)
```

**No archive/** - Just delete historical docs

## Naming Conventions

### Active Reference Guides

**Pattern:** `{topic}-guide.md`

**Examples:**
- `dialog-compatibility-guide.md`
- `performance-update-guide.md`
- `template-authoring-guide.md`

**Why:** Descriptive, timeless, sorts alphabetically by topic

### Architecture Docs

**Pattern:** `{component}-architecture.md` or `{component}-design.md`

**Examples:**
- `scss-architecture.md`
- `virtual-lists-design.md`
- `sheet-registration-design.md`

**Why:** Clear that it's about system design, not a how-to guide

### Architecture Decision Records

**Pattern:** `YYYY-MM-DD-{short-title}.md`

**Examples:**
- `2025-11-15-virtual-lists-over-drag-drop.md`
- `2025-12-01-redis-vs-memory-cache.md`
- `2025-12-20-inline-styles-for-shadow-dom.md`

**Why:** Sorts chronologically, immediately clear when decision was made

### Historical Audits (if keeping)

**Pattern:** `YYYY-MM-DD-{audit-name}.md`

**Examples:**
- `2025-10-15-performance-audit.md`
- `2025-11-20-hook-cascade-audit.md`

**Why:** Dated for context, shows it's a point-in-time snapshot

### Working Documents (temporary)

**Pattern:** `YYYY-MM-DD-WIP-{topic}.md` or don't create file

**Examples:**
- `2025-12-31-WIP-skill-extraction.md`
- `2025-11-10-WIP-performance-analysis.md`

**Why:** WIP prefix signals "delete this later", date shows when it was started

**Better:** Don't commit these at all, keep in local notes

## Creating docs/README.md

Every documentation directory should have an index:

```markdown
# Documentation Index

**New to the project?** Start with:
- [Project README](../README.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Skills](../skills/README.md) - Repeatable development patterns

## Active Guides

How-to guides for common development tasks:
- [Dialog V1/V2 Compatibility](guides/dialogv2-custom-styling-guide.md)
- [Performance & Multi-Client Safety](guides/performance-update-guidelines.md)
- [Version Compatibility Helpers](guides/compat-helpers-guide.md)

## Architecture

System design and structure:
- [SCSS Architecture](architecture/scss-architecture.md)
- [Virtual Lists Design](architecture/virtual-lists-design.md)

## Decisions (ADRs)

Important decisions and their context:
- [2025-11-15: Virtual Lists over Drag-Drop](decisions/2025-11-15-virtual-lists.md)
- [2025-12-01: Cache Strategy](decisions/2025-12-01-cache-strategy.md)

## Archive

Historical audits (for context only):
- [2025-10-15: Performance Audit](archive/2025-10-15-performance-audit.md)

---

**Documentation Policy:** See [skills/documentation-management](../skills/documentation-management/SKILL.md)
```

## Lifecycle Management

### When to Archive

**Trigger:** Audit is complete, problem is solved, lessons are encoded

**Process:**
1. Check if lessons are captured in skills
2. If yes: Move to `docs/archive/` with date
3. If lessons aren't encoded anywhere: Consider creating skill first

**Example:**
```bash
# Before archiving PERFORMANCE_FIX_PLAN.md
# 1. Check: Are lessons in a skill?
cat skills/foundry-vtt-performance-safe-updates/SKILL.md
# Yes? Then archive:
git mv docs/PERFORMANCE_FIX_PLAN.md docs/archive/2025-10-15-performance-audit.md
```

### When to Delete

**Trigger:** Document served its purpose, value is captured elsewhere

**Safe to Delete:**
- Working documents after final doc is created
- Audits where ALL lessons are in skills
- Analysis that led to code but has no ongoing reference value
- Anything you wouldn't link to in README

**The "Link Test":**
```
Question: Would you add a link to this doc in docs/README.md?

NO → Delete it
MAYBE → Archive with date
YES → Keep in active location
```

**Example:**
```bash
# SKILL_CANDIDATES_ANALYSIS.md led to creating 3 skills
# Skills now exist, analysis served its purpose
git rm SKILL_CANDIDATES_ANALYSIS.md
git commit -m "docs: Remove analysis doc, lessons extracted to skills"
```

### When to Extract to Skill

**Trigger:** Identified a repeatable pattern with clear steps

**Process:**
1. Audit/analysis identifies a pattern
2. Create skill encoding the pattern
3. Delete or archive the source audit/analysis
4. Update docs/README.md to link to skill

**Example:**
```bash
# 1. Create skill from audit findings
mkdir skills/foundry-vtt-performance-safe-updates
# ... create SKILL.md with patterns from audit

# 2. Delete audit (lessons now in skill)
git rm docs/PERFORMANCE_FIX_PLAN.md

# 3. Update skills/README.md
# Add new skill to index

git commit -m "docs: Extract performance patterns to skill, remove audit"
```

## Common Scenarios

### Scenario 1: Completed Analysis of Code Issues

**Situation:** Investigated performance problems, documented findings in `PERFORMANCE_AUDIT.md`

**Decision:**
```
Q: Are there repeatable patterns?
A: Yes - ownership guards, batched updates, no-op checks

Action:
1. Create skill: foundry-vtt-performance-safe-updates
2. Delete PERFORMANCE_AUDIT.md (lessons in skill)
```

### Scenario 2: Documenting a Design Decision

**Situation:** Chose virtual lists over drag-and-drop for ability selection

**Decision:**
```
Q: Might we re-litigate this?
A: Yes - someone might suggest "why don't we just use drag-drop?"

Action:
1. Create ADR: docs/decisions/2025-11-15-virtual-lists-decision.md
2. Document alternatives considered and why virtual lists won
3. Keep forever (immutable record)
```

### Scenario 3: Explaining How to Style Dialogs

**Situation:** Discovered Shadow DOM requires inline styles in DialogV2

**Decision:**
```
Q: Will developers need this repeatedly?
A: Yes - every time they create a custom dialog

Action:
1. Create guide: docs/guides/dialogv2-custom-styling-guide.md
2. Keep as active reference
3. Update as DialogV2 evolves
```

### Scenario 4: Analyzing Potential Skills to Create

**Situation:** Created `SKILL_CANDIDATES_ANALYSIS.md` reviewing 100 commits

**Decision:**
```
Q: Is this a working document?
A: Yes - it's helping me decide what skills to create

Q: Will it be useful after skills are created?
A: No - the skills themselves are the output

Action:
1. Extract top candidates to actual skills
2. Delete SKILL_CANDIDATES_ANALYSIS.md (served its purpose)
3. Update skills/README.md with new skills
```

### Scenario 5: Temporary Notes During Feature Development

**Situation:** Taking notes while implementing dockable sections

**Decision:**
```
Q: Should this be documented?
A: Maybe - depends on what's in the notes

If notes contain:
- HOW to implement dockable sections → Create guide
- WHY we chose SortableJS → Create ADR
- TODO list for myself → Don't commit at all
- Exploration that led nowhere → Delete

Action:
Keep notes local, extract to proper docs if needed, delete working notes
```

## Integration with Skills

### Skills Replace Many Audit Docs

**Before Skills:**
```
docs/
├── PERFORMANCE_AUDIT.md          # 500 lines
├── PERFORMANCE_FIX_PLAN.md       # 300 lines
├── OPTIMISTIC_UI_PATTERNS.md     # 400 lines
└── UPDATE_QUEUE_GUIDE.md         # 200 lines
```

**After Skills:**
```
skills/
└── foundry-vtt-performance-safe-updates/
    └── SKILL.md                   # 600 lines, actionable
```

**Benefit:** One actionable skill replaces 4 audit docs

### When Analysis Leads to Skill

**Workflow:**
```
1. Investigation: Create working doc or keep notes locally
   → 2025-12-31-WIP-crew-sheet-analysis.md

2. Identify patterns: Extract to skill
   → skills/foundry-vtt-smart-field-system/SKILL.md

3. Clean up: Delete working doc
   → git rm 2025-12-31-WIP-crew-sheet-analysis.md

4. Document decision (if complex choice was made)
   → docs/decisions/2025-12-31-smart-fields-over-text-input.md
```

## Common Pitfalls

### ❌ Pitfall 1: Documenting Everything

```
// BAD: Creating docs for every investigation
2025-12-01-fix-clock-bug-analysis.md
2025-12-05-ability-checkbox-investigation.md
2025-12-10-css-refactor-notes.md
2025-12-15-performance-check.md
```

**Fix:** Only document if it meets one of the 4 types (guide, architecture, ADR, skill)

### ❌ Pitfall 2: Generic Names Without Dates

```
// BAD: Can't tell when or why these exist
ANALYSIS.md
AUDIT.md
PLAN.md
FIXES.md
```

**Fix:** Use specific names + dates for historical docs

```
// GOOD
2025-10-15-performance-audit.md
2025-11-20-hook-cascade-audit.md
```

### ❌ Pitfall 3: Never Deleting Anything

```
docs/
├── old-audit-1.md
├── old-audit-2.md
├── deprecated-guide.md
├── superseded-analysis.md
└── ... (20+ files no one reads)
```

**Fix:** Be ruthless. If you wouldn't link to it, delete it.

### ❌ Pitfall 4: No Index

```
docs/
├── guide1.md
├── guide2.md
├── arch1.md
└── decision1.md

// New developer: "Which docs should I read?"
```

**Fix:** Create `docs/README.md` with clear sections and links

### ❌ Pitfall 5: Keeping Working Documents

```
// BAD: Committed temporary analysis to repo
git add SKILL_CANDIDATES_ANALYSIS.md
git commit -m "Add analysis"

// Later: "Is this still relevant?"
```

**Fix:** Delete working docs after extracting to final format

```
// GOOD
# Created 3 skills from analysis
git add skills/foundry-vtt-smart-field-system/
git add skills/foundry-vtt-optimistic-ui-updates/
git add skills/foundry-vtt-per-user-ui-state/

# Delete source analysis
git rm SKILL_CANDIDATES_ANALYSIS.md

git commit -m "docs: Extract 3 skills from crew sheet patterns"
```

## Quick Checklist

Before creating documentation:

- [ ] Identified document type (guide, architecture, ADR, skill, working doc)
- [ ] Applied "Link Test" - Would I link to this in README?
- [ ] Used correct naming convention for type
- [ ] Placed in correct directory
- [ ] If working doc: Added WIP prefix or kept local (don't commit)
- [ ] If supersedes old doc: Deleted or archived old doc
- [ ] Updated docs/README.md index (if keeping)

Before committing documentation:

- [ ] Removed any WIP/temporary docs
- [ ] Archived completed audits (if keeping at all)
- [ ] Deleted working documents that served their purpose
- [ ] Updated index files

Periodic maintenance (monthly):

- [ ] Review docs/ for relevance
- [ ] Delete outdated guides or update them
- [ ] Archive completed audits
- [ ] Check for patterns to extract to skills
- [ ] Update docs/README.md

## References

- Example ADR format: [Architecture Decision Records](https://adr.github.io/)
- Documentation best practices: [Divio Documentation System](https://documentation.divio.com/)
- This project's skills: `skills/README.md`

## Project-Specific Notes

For BitD Alternate Sheets:
- Skills are the primary documentation mechanism
- Guides supplement skills for complex topics (DialogV2, compat)
- Historical audits should be deleted after skills are extracted
- Working documents should never be committed
- docs/README.md is the entry point for all documentation
