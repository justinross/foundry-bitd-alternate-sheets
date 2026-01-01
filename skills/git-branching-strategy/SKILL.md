# Git Branching Strategy for BitD Alternate Sheets

Prevent monster branches by following disciplined branching and merge practices suited to Foundry module development.

## When to Use This Skill

Invoke this skill when:

### ✅ Starting New Work
- About to implement a new feature
- Planning to fix a bug
- Starting refactoring work
- Adding documentation

### ⚠️ Mid-Feature Warning Signs
- Thinking "while I'm here, I'll also..."
- Wanting to add unrelated functionality
- Branch has grown beyond 20 commits
- Multiple unrelated files changed
- PR would be difficult to review

### 🎯 Decision Points
- Unsure whether to create new branch or continue current
- Wondering if branch is getting too large
- Considering adding "just one more thing"
- Ready to merge but branch feels messy

## The Problem: Monster Branches

### What Happened: feature/alt-crew-sheet

**Timeline:**
- Started as "add crew sheet implementation"
- Grew to include smart fields, dockable sections, optimistic UI, ghost slots
- **100+ commits**, multiple intertwined features
- Difficult to review, hard to merge, risky to revert

**Symptoms:**
- ❌ Multiple distinct features mixed together
- ❌ Hard to describe what the branch does in one sentence
- ❌ Changes span unrelated systems
- ❌ PR description would need multiple sections
- ❌ Reviewer would struggle to follow changes
- ❌ Rolling back one feature means losing others

**Consequences:**
- Long-lived branch diverges from rc-1.1.0
- Merge conflicts accumulate
- Testing becomes all-or-nothing
- Can't ship features incrementally
- Hard to isolate bugs introduced

## Solution: Small, Focused Branches

### The Golden Rule

**One feature, one branch, one PR.**

If you can't describe the branch in a single sentence without using "and", it's too big.

### Good Examples

✅ **Good:** `feat/crew-sheet-base` - "Add basic crew sheet layout and getData"
✅ **Good:** `feat/smart-fields` - "Implement smart field system with compendium lookups"
✅ **Good:** `fix/clock-race-condition` - "Fix optimistic update race in clock segments"
✅ **Good:** `refactor/scss-modules` - "Convert SCSS to module system"
✅ **Good:** `docs/claude-skills` - "Add Claude Code skills for crew patterns"

### Bad Examples

❌ **Bad:** `feat/crew-sheet` - Includes sheet + smart fields + dockable sections + optimistic UI
❌ **Bad:** `feat/improvements` - Too vague, likely includes unrelated changes
❌ **Bad:** `fix/various-bugs` - Multiple unrelated fixes should be separate PRs
❌ **Bad:** `wip/stuff` - Not descriptive, suggests unfocused work

## Branch Size Guidelines

### Target Size

**Ideal:** 5-15 commits, 1-5 files changed significantly
**Acceptable:** Up to 30 commits, up to 10 files
**Too Large:** 50+ commits, 20+ files

**Exception:** Large refactors (SCSS overhaul) that are purely mechanical

### Commit Count Checkpoints

```
5 commits → Normal feature pace
10 commits → Check: Am I still focused on one feature?
20 commits → WARNING: Consider splitting or wrapping up
30 commits → CRITICAL: Finish and merge, or split into multiple PRs
50+ commits → MONSTER: This should have been 3-5 separate branches
```

### When Branch Size is Justified

✅ **Acceptable large branches:**
- Pure refactoring (SCSS conversion, JS modularization)
- Data migrations (changing structure across many files)
- Foundry version upgrades (mechanical API changes)
- Initial feature implementation with tests and docs

❌ **Unacceptable large branches:**
- Multiple unrelated features
- Feature + "while I'm here" improvements
- Feature + unrelated bug fixes
- Feature + refactoring that isn't required for feature

## Decision Tree: New Branch or Continue?

### Question 1: Is this change related to current branch?

```
New change → Related to current feature?
  ↓ YES (same system, same goal)
  → Continue current branch

  ↓ NO (different system, different goal)
  → Question 2
```

### Question 2: Is current branch ready to merge?

```
Current branch → Ready to merge?
  ↓ YES (feature complete, tests pass)
  → Merge current, then new branch for new work

  ↓ NO (feature incomplete)
  → Question 3
```

### Question 3: Is new work required for current feature?

```
New work → Required for current feature to work?
  ↓ YES (dependency)
  → Continue current branch

  ↓ NO (nice-to-have, improvement, unrelated)
  → Stash current, new branch, finish new, resume current
```

### Example Scenarios

**Scenario 1: Adding crew sheet, notice ability checkbox bug**
- Current: `feat/crew-sheet-base`
- Want to: Fix ability checkbox race condition
- **Decision:** New branch `fix/ability-race-condition`, merge it, rebase crew-sheet

**Scenario 2: Implementing smart fields, want to add tooltips**
- Current: `feat/smart-fields`
- Want to: Add compendium description tooltips to smart fields
- **Decision:** Continue current branch (tooltips are part of smart field feature)

**Scenario 3: Working on crew sheet, want to refactor SCSS**
- Current: `feat/crew-sheet-base` (10 commits)
- Want to: Convert all SCSS to module system
- **Decision:** Finish and merge crew sheet first, THEN do SCSS refactor in separate branch

**Scenario 4: Halfway through feature, realize need helper function**
- Current: `feat/dockable-sections` (8 commits)
- Want to: Extract reusable helper for UUID sanitization
- **Decision:** Continue current branch (helper is required for feature)

## Branch Naming Conventions

### Format

```
<type>/<short-description>
```

### Types

- **feat/** - New feature or enhancement
- **fix/** - Bug fix
- **refactor/** - Code restructuring without behavior change
- **docs/** - Documentation only
- **test/** - Adding or fixing tests
- **chore/** - Build, tooling, dependencies

### Examples

```
feat/crew-sheet-base
feat/smart-field-system
feat/dockable-sections
fix/clock-optimistic-update
fix/ability-progress-persistence
refactor/scss-modules
refactor/js-modularization
docs/claude-skills
docs/performance-guidelines
chore/update-foundry-v12
```

### Avoid

❌ `feature/` - Use `feat/` (shorter)
❌ `bugfix/` - Use `fix/` (shorter)
❌ `wip/` - Work in progress is implied, use descriptive name
❌ `my-branch` - Not descriptive
❌ `feat/add-feature` - Redundant "add"

## Branch Lifecycle

### 1. Plan and Scope

**Before creating branch:**
- [ ] Can I describe this in one sentence?
- [ ] Is this the smallest useful increment?
- [ ] Does this depend on other incomplete work?
- [ ] Will this take more than 30 commits?

**If >30 commits expected:** Break into smaller features first.

### 2. Create Branch

```bash
# From rc-1.1.0 (or master)
git checkout rc-1.1.0
git pull upstream rc-1.1.0

# Create feature branch
git checkout -b feat/descriptive-name
```

### 3. Work on Feature

**Commit discipline:**
- Small, focused commits
- Clear commit messages (see Commit Message Conventions below)
- Commit related changes together
- Don't mix formatting with logic changes

**Check progress regularly:**
```bash
# How many commits?
git log rc-1.1.0..HEAD --oneline | wc -l

# How many files changed?
git diff rc-1.1.0 --stat

# Am I still focused?
git log --oneline -10  # Review recent commits
```

### 4. Recognize When to Split

**Warning signs:**
- Commit messages use "and" frequently
- Multiple unrelated `// TODO` comments
- You've forgotten what early commits did
- PR description draft has 3+ bullet points for unrelated changes

**How to split:**

```bash
# Option A: Finish current, branch for next
git commit -m "Complete X feature"
# Merge feat/x
git checkout -b feat/y  # Start next feature

# Option B: Stash incomplete, branch for urgent work
git stash
git checkout -b fix/urgent-bug
# Fix and merge
git checkout feat/original
git stash pop
```

### 5. Prepare for Merge

**Before creating PR:**
```bash
# Rebase on latest rc-1.1.0
git fetch upstream
git rebase upstream/rc-1.1.0

# Review all changes
git diff upstream/rc-1.1.0

# Check commit history is clean
git log upstream/rc-1.1.0..HEAD --oneline
```

**Commit hygiene (optional):**
```bash
# Squash fixup commits
git rebase -i upstream/rc-1.1.0

# Improve commit messages
git commit --amend
```

### 6. Create PR

```bash
git push origin feat/descriptive-name

# Create PR from fork to upstream rc-1.1.0
# IMPORTANT: Use --head to specify fork:branch format
gh pr create --repo justinross/foundry-bitd-alternate-sheets \
  --base rc-1.1.0 \
  --head ImproperSubset:feat/descriptive-name \
  --title "feat: Add descriptive feature" \
  --body "$(cat <<'EOF'
## Summary
- Bullet point 1
- Bullet point 2

## Test plan
- [ ] Test case 1
- [ ] Test case 2
EOF
)"
```

**Why PR to upstream, not fork?**
- ✅ Documents changes going into the release candidate
- ✅ Provides visibility to collaborators
- ✅ Creates proper history on the authoritative repo
- ✅ Enables code review process

### 7. After Merge

```bash
# Delete local branch
git checkout rc-1.1.0
git pull upstream rc-1.1.0
git branch -d feat/descriptive-name

# Delete remote branch (if not auto-deleted)
git push origin --delete feat/descriptive-name
```

## Integration Workflow

### Repository Structure

```
upstream: justinross/foundry-bitd-alternate-sheets (original)
origin:   ImproperSubset/foundry-bitd-alternate-sheets (your fork)

Branches:
  master       → Production release
  rc-1.1.0     → Release candidate (integration branch)
  feat/*       → Feature branches (from rc-1.1.0)
```

### Standard Flow

```
1. Feature branch from rc-1.1.0
   git checkout -b feat/my-feature upstream/rc-1.1.0

2. Work on feature
   git commit -m "feat: add X"

3. Push to your fork
   git push origin feat/my-feature

4. PR from fork to upstream rc-1.1.0
   gh pr create --repo justinross/foundry-bitd-alternate-sheets \
     --base rc-1.1.0 \
     --head ImproperSubset:feat/my-feature

5. After PR merges to upstream, sync local rc-1.1.0
   git checkout rc-1.1.0
   git pull upstream rc-1.1.0
   git push origin rc-1.1.0  # Keep fork in sync

6. Later: rc-1.1.0 → master (release)
```

**Why PR to upstream?** PRs document what's going into the release candidate. Creating PRs on upstream (not in your fork) provides proper visibility and history on the authoritative repository.

### Documentation-Only Changes

**Option A: Direct commit to rc-1.1.0 (if small)**
```bash
git checkout rc-1.1.0
# Make changes
git commit -m "docs: update contributing guidelines"
git push origin rc-1.1.0

# CRITICAL: Push to upstream BEFORE creating feature branches
git push upstream rc-1.1.0
```

**⚠️ Why push to upstream immediately?**

If you make direct commits to rc-1.1.0 locally, then create a feature branch, that feature branch will include your unpushed rc-1.1.0 commits. This creates messy PRs with unrelated changes.

**Example of what goes wrong:**
```bash
# You commit docs directly to rc-1.1.0
git checkout rc-1.1.0
git commit -m "docs: add skills"
# ❌ MISTAKE: Didn't push to upstream yet

# You create a feature branch
git checkout -b feat/new-feature
# ... work on feature ...
git push origin feat/new-feature

# ❌ PROBLEM: Your feature PR now includes the doc commits!
```

**Fix:** Always push rc-1.1.0 to upstream before branching:
```bash
# After committing to rc-1.1.0:
git push upstream rc-1.1.0    # ← Don't skip this!

# Then create feature branches
git checkout -b feat/new-feature
```

**Option B: Feature branch + PR (if larger)**
```bash
git checkout -b docs/descriptive-name
# Make changes
git push origin docs/descriptive-name
gh pr create --repo justinross/foundry-bitd-alternate-sheets \
  --base rc-1.1.0 \
  --head ImproperSubset:docs/descriptive-name
```

**Rule of thumb:**
- README fixes, typo corrections → Direct commit OK (push to upstream immediately)
- New documentation sections, skills, guides → Feature branch + PR

## Commit Message Conventions

### Format

```
<type>: <short description>

<optional body>

<optional footer>
```

### Types

Same as branch types:
- **feat:** - New feature
- **fix:** - Bug fix
- **refactor:** - Code restructuring
- **docs:** - Documentation
- **test:** - Tests
- **chore:** - Build/tooling

### Guidelines

**Good commit messages:**
```
feat: Add smart field system with compendium lookups

Implements interactive fields that open card selection dialogs
filtered by context (playbook, vice type). Includes Handlebars
helper and click handler integration.

Closes #42
```

```
fix: Prevent clock race condition with optimistic UI

Read current value from background-image instead of stale radio
button value during async update window.

Fixes #38
```

**Bad commit messages:**
```
❌ "Updates"
❌ "Fix stuff"
❌ "WIP"
❌ "More changes"
❌ "Final commit (hopefully)"
```

### Commit Message Best Practices

- **Present tense:** "Add feature" not "Added feature"
- **Imperative mood:** "Fix bug" not "Fixes bug"
- **Capitalize first word:** "Add feature" not "add feature"
- **No period at end:** "Add feature" not "Add feature."
- **Body explains why, not what:** Code shows what, message explains why

### Auto-generated Commits

For BitD Alternate Sheets, Claude Code adds:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

This is automatic for commits created via the `/commit` skill.

## When to Split an Existing Branch

### Recognize the Need

**You should split if:**
- Branch has 40+ commits and isn't done
- Multiple reviewers ask "what does this PR do?"
- You can't write a coherent PR description
- Rolling back would lose multiple independent features

### How to Split

**Strategy A: Extract Completed Features**

```bash
# Current branch: feat/massive (50 commits)
# Goal: Extract first feature into separate PR

# 1. Create new branch from rc-1.1.0
git checkout rc-1.1.0
git checkout -b feat/extracted-feature

# 2. Cherry-pick relevant commits
git log feat/massive --oneline  # Find commit SHAs
git cherry-pick abc123 def456 ghi789

# 3. Push and create PR
git push origin feat/extracted-feature
gh pr create --base rc-1.1.0

# 4. After merge, rebase massive branch
git checkout feat/massive
git rebase rc-1.1.0  # Removes duplicate commits
```

**Strategy B: Start Fresh, Reference Old**

```bash
# Current branch: feat/massive (too messy to salvage)

# 1. Create new branch from rc-1.1.0
git checkout rc-1.1.0
git checkout -b feat/feature-1-clean

# 2. Manually apply changes from massive branch
# (Copy files, make clean commits)

# 3. Repeat for each feature
git checkout rc-1.1.0
git checkout -b feat/feature-2-clean

# 4. Abandon feat/massive after all features extracted
git branch -D feat/massive
```

## Quick Checklist

### Before Starting Work

- [ ] One sentence description of what I'm building
- [ ] Checked if this should be separate from current branch
- [ ] Created appropriately named branch from rc-1.1.0
- [ ] Estimated this will take <30 commits

### During Work

- [ ] Commit messages are clear and focused
- [ ] Not mixing unrelated changes in same commit
- [ ] Checking commit count every 5-10 commits
- [ ] Resisting "while I'm here" temptations

### Before Creating PR

- [ ] Branch has <30 commits (or justifiable if larger)
- [ ] All commits are related to the same feature
- [ ] Rebased on latest rc-1.1.0
- [ ] Can describe PR in 1-3 sentences
- [ ] Commit history is clean and logical

### Danger Signs (Stop and Split)

- [ ] ⚠️ More than 30 commits
- [ ] ⚠️ Changed more than 15 unrelated files
- [ ] ⚠️ Commit messages have "also", "and", "while here"
- [ ] ⚠️ Can't remember what early commits did
- [ ] ⚠️ PR description needs multiple unrelated bullet points

## Common Scenarios

### "I'm halfway through feature X, noticed bug Y"

**If bug blocks feature X:**
→ Fix in current branch

**If bug is unrelated:**
→ Stash current work, create `fix/bug-y`, merge it, resume feature X

### "I want to add feature B while working on feature A"

**If B is required for A:**
→ Continue current branch

**If B is independent:**
→ Finish A first, then branch for B

**If B is urgent and A is incomplete:**
→ Stash A, branch for B, merge B, resume A

### "My branch has 40 commits, should I split?"

**Yes.** Options:
1. Extract completed portions into separate PRs (cherry-pick)
2. Finish current branch as-is, vow to split next time
3. Start fresh with clean branches for each feature

### "I made formatting changes along with feature changes"

**Separate them:**
```bash
# Approach 1: Amend last commit to remove formatting
git reset HEAD~1
git add <feature files only>
git commit -m "feat: add feature"
git add <formatting files>
git commit -m "chore: format code"

# Approach 2: Split into two PRs
# - PR 1: Formatting only (refactor/format-cleanup)
# - PR 2: Feature only (feat/my-feature)
```

## References

- Recent monster branch: `feature/alt-crew-sheet` (100+ commits, multiple features)
- Good example: `refactor/scss-modules` (mechanical refactor, single purpose)
- Repository workflow: Fork (ImproperSubset) → PR → Upstream (justinross)
- Integration branch: `rc-1.1.0` → `master` (release)

## Lessons Learned

From developing the crew sheet and alternate character sheet:

### ✅ What Worked Well

- **SCSS refactor:** Single-purpose refactor branch, mechanical changes, clean history
- **Documentation skills:** Separate `docs/claude-skills` branch, focused commits
- **Bug fixes:** Small `fix/*` branches, quick merge cycle

### ❌ What Went Wrong

- **feature/alt-crew-sheet:** Started as crew sheet, grew to include smart fields, dockable sections, optimistic UI, ghost slots (100+ commits)
- **Consequence:** Difficult to review, hard to merge, couldn't ship features incrementally

### 🎯 Better Approach (Retrospective)

If we could redo the crew sheet development:

```
1. feat/crew-sheet-base (10 commits)
   - Basic sheet structure, getData, template
   - Merge ✓

2. feat/smart-field-system (15 commits)
   - Smart field Handlebars helper, click handler, dialogs
   - Merge ✓

3. feat/optimistic-ui-clock (8 commits)
   - Clock race condition fix with background-image pattern
   - Merge ✓

4. feat/dockable-sections (12 commits)
   - SortableJS integration, layout persistence
   - Merge ✓

5. feat/ghost-slots (6 commits)
   - Cross-playbook ability persistence
   - Merge ✓
```

**Result:** 5 reviewable PRs instead of 1 massive branch

---

**Remember:** When in doubt, split it out. Smaller PRs are easier to review, safer to merge, and faster to ship.
