# Claude Code Development Workflow

**Purpose:** Establish efficient, high-quality development practices for the Blades in the Dark Alternate Sheets module using Claude Code agents and tools.

**Category:** Meta-Skill (Development Process)

---

## When to Use This Skill

This skill applies **throughout the entire development lifecycle**:

- Starting any new feature or bug fix
- Exploring unfamiliar code
- Making architectural decisions
- Committing changes
- Creating pull requests
- Reviewing code quality

**Triggers:**
- User requests a new feature
- User asks "where is..." or "how does..." questions
- You're about to implement without planning
- You're about to commit changes
- User asks for a PR

---

## Core Principle

**Use the right tool for the job.** Don't do manually what specialized agents can do better.

---

## Workflow 1: New Feature Development

### Triggers
- "Add...", "Build...", "Create...", "Implement [new thing]"
- User describes functionality that doesn't exist yet

### Decision Point: Should I use `/feature-dev`?

**Use `/feature-dev` if:**
- ✅ Feature requires multiple files
- ✅ Unclear how it should integrate with existing code
- ✅ Need to understand existing patterns first
- ✅ User hasn't specified exact implementation approach

**Skip `/feature-dev` if:**
- ❌ Trivial change (typo fix, single-line tweak)
- ❌ User provided extremely detailed implementation instructions
- ❌ Pure research/exploration task (use code-explorer instead)

### Workflow

**If using `/feature-dev`:**

```
1. Invoke Skill tool with skill="feature-dev:feature-dev"
2. Let the feature-dev workflow handle:
   - Codebase exploration
   - Clarifying questions
   - Architecture design
   - Implementation
   - Code review
3. Done - feature-dev handles end-to-end
```

**If NOT using `/feature-dev` (simple change):**

```
1. Read relevant files to understand current implementation
2. Ask clarifying questions if anything is ambiguous
3. Implement the change
4. Run build/lint/tests
5. Consider code-reviewer agent for non-trivial changes
```

**Anti-pattern:**
```
❌ User: "Add a new crew type selector"
   Assistant: *immediately starts writing code*

✅ User: "Add a new crew type selector"
   Assistant: "I'll use /feature-dev to explore the codebase,
              understand existing patterns, and design the implementation."
```

---

## Workflow 2: Code Exploration & Understanding

### Triggers
- "Where is...", "Explain how X works", "Map the project", "Find usage of..."
- Questions about code structure or flow

### Decision Point: Manual search vs code-explorer?

**Use code-explorer agent if:**
- ✅ Question requires understanding code flow across multiple files
- ✅ Need to trace execution paths
- ✅ "How does X work?" questions
- ✅ Finding all usages of a pattern

**Manual search (Glob/Grep) if:**
- ✅ Needle query - looking for specific file/class/function name
- ✅ You know exactly what to search for
- ✅ Single-file investigation

### Workflow

**For exploration (use code-explorer):**

```
1. Launch Task tool with subagent_type="Explore"
2. Provide clear question: "How does ability persistence work?"
3. Specify thoroughness: "medium" or "very thorough"
4. Read files identified by agent
5. Summarize findings
```

**For needle queries (manual search):**

```
1. Use Glob for file patterns: "**/*ability*.js"
2. Use Grep for code patterns: "getFlag.*abilityProgress"
3. Read matched files
4. Provide answer
```

**Anti-pattern:**
```
❌ User: "How does the smart field system work?"
   Assistant: *runs grep for "smart" and reads one file*

✅ User: "How does the smart field system work?"
   Assistant: *launches code-explorer to comprehensively trace
              the smart field implementation across all files*
```

---

## Workflow 3: Architecture & Planning

### Triggers
- "Plan...", "Design...", "Refactor strategy", "How should I structure..."
- Before implementing non-trivial features

### Decision Point: Should I enter plan mode?

**Use EnterPlanMode if ANY of:**
- ✅ New feature with multiple valid approaches
- ✅ Architectural decisions required
- ✅ Changes affect multiple files (3+)
- ✅ Unclear requirements need exploration first
- ✅ User preferences matter for implementation approach

**Skip plan mode if:**
- ❌ Single-line fix
- ❌ User provided very specific instructions
- ❌ Pure research task

### Workflow

```
1. Use EnterPlanMode tool
2. In plan mode:
   a. Explore codebase thoroughly
   b. Understand existing patterns
   c. Identify decision points
   d. Use AskUserQuestion for clarifications
   e. Design implementation approach
   f. Write plan to plan file
   g. Use ExitPlanMode
3. Wait for user approval
4. Implement according to approved plan
```

**Anti-pattern:**
```
❌ User: "Add user authentication"
   Assistant: *starts implementing without exploring auth patterns*

✅ User: "Add user authentication"
   Assistant: *uses EnterPlanMode to explore existing auth,
              identify approaches, get user preferences*
```

---

## Workflow 4: Code Quality & Review

### Triggers
- Completed non-trivial implementation
- Before creating PR
- User asks "review this"

### Decision Point: When to use code-reviewer?

**Use code-reviewer proactively when:**
- ✅ Just completed a feature (before user asks)
- ✅ Added >50 lines of new code
- ✅ Modified critical paths (update handlers, hooks, migrations)
- ✅ About to create PR
- ✅ Touched performance-sensitive code

**Workflow**

```
1. Complete implementation
2. Launch Task tool with subagent_type="pr-review-toolkit:code-reviewer"
3. Specify files to review (usually unstaged git diff)
4. Review agent findings
5. Fix high-priority issues
6. Commit changes
```

**Critical for this project:**
- ✅ Multi-client update safety (ownership guards, queueUpdate)
- ✅ Firefox flexbox checkbox bug (no flex containers for checkboxes)
- ✅ Design token usage (no hardcoded colors/spacing)
- ✅ Proper embedded document updates (updateEmbeddedDocuments, not delete+create)

**Anti-pattern:**
```
❌ Assistant: *writes 200 lines of new code*
   Assistant: "Done! The feature is complete."

✅ Assistant: *writes 200 lines of new code*
   Assistant: "Let me proactively review this code for issues."
   Assistant: *launches code-reviewer agent*
```

---

## Workflow 5: Version Control & Commits

### Triggers
- User asks to commit changes
- User asks to create PR
- Feature is complete and tested

### Git Discipline Rules

**NEVER:**
- ❌ Run raw `git commit` via Bash without crafted message
- ❌ Skip commit message template (must include Claude attribution)
- ❌ Commit without running git status + git diff first
- ❌ Commit files with secrets (.env, credentials)
- ❌ Use `--no-verify` to skip hooks (unless user explicitly requests)
- ❌ Force push to main/master
- ❌ Commit without testing (build, lint at minimum)

**ALWAYS:**
- ✅ Use Skill tool for commits: `skill="commit-commands:commit"`
- ✅ Run `git status` and `git diff` in parallel first
- ✅ Draft commit message based on actual changes (not assumptions)
- ✅ Follow commit message style from git log
- ✅ Include Claude Code attribution footer
- ✅ Verify no unintended files are staged

### Commit Workflow

```
1. Run in parallel:
   - git status (see untracked files)
   - git diff (see staged + unstaged changes)
   - git log -10 --oneline (see commit style)

2. Analyze changes and draft commit message:
   - Type: feat/fix/refactor/docs/chore/test
   - Summary: What changed and why (focus on "why", not "what")
   - Keep under 72 characters for summary line

3. Stage relevant files (git add)

4. Commit with attribution:
   git commit -m "$(cat <<'EOF'
   feat: Add crew type selector to crew sheet

   Enables selecting crew type from compendium using smart field system.
   Filters available crew types by current game setting.

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"

5. Run git status after commit to verify success
```

### PR Workflow

```
1. Run in parallel:
   - git status (check remote tracking)
   - git diff main...HEAD (see all changes for PR)
   - git log main..HEAD (see all commits for PR)

2. Analyze full diff and commit history (ALL commits, not just latest!)

3. Draft PR summary:
   ## Summary
   - 1-3 bullet points of what changed

   ## Test plan
   - [ ] Run npm run build:css
   - [ ] Run npm run lint:css
   - [ ] Test in Foundry VTT
   - [ ] Verify multi-client behavior

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

4. Push to remote (if needed)

5. Create PR using:
   gh pr create --title "..." --body "$(cat <<'EOF'
   [PR description]
   EOF
   )"
```

**Anti-pattern:**
```
❌ Assistant: *runs* `git commit -m "fix stuff"`

✅ Assistant: *uses commit skill, drafts proper message,
              includes attribution, verifies changes*
```

---

## Workflow 6: External Knowledge & Research

### Triggers
- Uncertain about API usage
- Need current information (library versions, recent changes)
- User asks about external tools/libraries

### Decision Point: Search vs Assume

**ALWAYS search (don't assume) for:**
- ✅ Foundry VTT API usage (changes between versions)
- ✅ Recent library features (Handlebars, SCSS, SortableJS)
- ✅ Browser compatibility issues
- ✅ Security best practices (XSS, injection vulnerabilities)
- ✅ Anything you're unsure about

**Safe to assume (from training):**
- ✅ JavaScript/ES6 syntax
- ✅ General web development patterns
- ✅ Git fundamentals
- ✅ Common npm commands

### Workflow

```
1. Identify knowledge gap
2. Use WebSearch or mcp__docs__query-docs:
   - "Foundry VTT V13 ActorSheet API"
   - "Handlebars 4.x custom helpers"
   - "Firefox flexbox checkbox width bug"
3. Cite sources in response
4. Apply findings to implementation
```

**Anti-pattern:**
```
❌ Assistant: "I'll use the Foundry API method actor.getData()"
   *Method doesn't exist in V13*

✅ Assistant: "Let me search for the current Foundry V13 Actor API..."
   *Finds correct method is actor.prepareData()*
```

---

## Workflow 7: Testing & Verification

### Triggers
- After implementing any feature
- Before committing
- Before creating PR

### Testing Checklist

**Minimum (ALWAYS):**
```
1. Build: npm run build:css (if SCSS changes)
2. Lint: npm run lint:css (if SCSS changes)
3. Visual check: Describe what to test in Foundry
```

**For update handlers (CRITICAL):**
```
1. Multi-client safety check:
   - Does this fire on all clients? → Ownership guard?
   - Multiple field updates? → Batched into one update()?
   - High-frequency? → Debounced or early exit?
   - State actually changing? → No-op check?

2. Manual test in Foundry:
   - Open in two browser windows
   - Make concurrent edits
   - Verify no update storms (check console)
   - Verify no UI flicker
```

**For CSS changes:**
```
1. Firefox test (checkbox layouts specifically)
2. Responsive breakpoints (mini/full modes)
3. Design token compliance (no hardcoded values)
```

**For migrations:**
```
1. Backup test world
2. Run migration
3. Verify data preserved
4. Verify migration runs only once
```

### Workflow

```
1. Implement feature
2. Run build/lint commands
3. Describe manual testing steps:
   "To test this feature:
   - Open character sheet in Foundry
   - Click the new crew type selector
   - Verify available types are filtered by setting
   - Select a type and verify it saves to actor"
4. If update handlers involved:
   - Review multi-client safety checklist
   - Recommend two-browser test
```

**Anti-pattern:**
```
❌ Assistant: *completes feature* "Done!"

✅ Assistant: *completes feature*
   Assistant: "Let me run the build and lint..."
   Assistant: "Here's how to test this in Foundry..."
```

---

## Decision Trees

### "Should I use an agent?"

```
Feature request
├─ Trivial (1-5 lines)? → Implement directly
├─ Exploration needed? → code-explorer
├─ Architecture decision? → feature-dev (includes exploration + planning)
├─ Just planning? → EnterPlanMode
└─ Implementation done? → code-reviewer (proactive)

Code question
├─ Needle query (know what to find)? → Glob/Grep
├─ "How does X work?" → code-explorer
└─ "Where is X?" → code-explorer

Commit/PR
├─ Ready to commit? → Use commit skill (never raw git)
├─ Ready for PR? → Analyze full diff, draft description
└─ Unsure if ready? → code-reviewer first
```

### "Should I search or assume?"

```
Knowledge question
├─ Foundry API? → SEARCH (changes between versions)
├─ Recent library features? → SEARCH
├─ Security concern? → SEARCH
├─ Browser compatibility? → SEARCH
├─ Basic JavaScript? → Assume (from training)
└─ Git basics? → Assume
```

---

## Common Patterns

### Pattern: Feature Development

```javascript
// ✅ Good: Use feature-dev for comprehensive exploration
User: "Add ability to import characters from JSON"
Assistant: *invokes /feature-dev skill*
// Feature-dev handles: exploration → questions → design → implement → review

// ❌ Bad: Jump straight to implementation
User: "Add ability to import characters from JSON"
Assistant: *starts writing import code without understanding existing patterns*
```

### Pattern: Code Exploration

```javascript
// ✅ Good: Use code-explorer for comprehensive understanding
User: "How does the dockable sections system work?"
Assistant: *launches code-explorer with thorough tracing*

// ❌ Bad: Manual grep and single file read
User: "How does the dockable sections system work?"
Assistant: *greps for "dockable", reads one file, provides incomplete answer*
```

### Pattern: Proactive Quality

```javascript
// ✅ Good: Review code before declaring done
Assistant: *finishes implementing feature*
Assistant: "Let me review this code for issues before we commit."
Assistant: *launches code-reviewer*

// ❌ Bad: Wait for user to ask for review
Assistant: *finishes implementing feature*
Assistant: "The feature is complete!"
// User finds bugs later
```

---

## Anti-Patterns to Avoid

### 1. Skipping Exploration

**Problem:** Implementing without understanding existing patterns

```
❌ User: "Add a new smart field for faction selection"
   Assistant: *immediately writes new code from scratch*

✅ User: "Add a new smart field for faction selection"
   Assistant: *uses code-explorer to understand smart field system first*
   Assistant: *follows existing pattern for new field*
```

### 2. Manual Work Over Agents

**Problem:** Doing manually what agents do better

```
❌ User: "Where are errors handled?"
   Assistant: *manually greps for "error", reads 3 files*

✅ User: "Where are errors handled?"
   Assistant: *launches code-explorer to trace error handling comprehensively*
```

### 3. Assuming Knowledge

**Problem:** Using outdated or incorrect API information

```
❌ Assistant: "I'll use actor.data.data.stress (V9 pattern)"
   // Deprecated in V10+

✅ Assistant: "Let me verify the current Foundry data access pattern..."
   // Finds actor.system.stress (V10+ pattern)
```

### 4. Sloppy Commits

**Problem:** Raw git commands, poor messages, no attribution

```
❌ Assistant: *runs bash* `git commit -m "fix"`

✅ Assistant: *uses commit skill*
   Assistant: *analyzes changes, drafts message, includes attribution*
```

### 5. No Testing Guidance

**Problem:** Declaring done without verification steps

```
❌ Assistant: "Feature complete!"

✅ Assistant: "Feature complete. To test:
   1. Run npm run build:css
   2. Open crew sheet in Foundry
   3. Verify new selector appears
   4. Test multi-client safety (two browsers)"
```

### 6. Skipping Plan Mode

**Problem:** Implementing complex features without design

```
❌ User: "Add dark mode toggle"
   Assistant: *starts writing CSS variables immediately*

✅ User: "Add dark mode toggle"
   Assistant: *uses EnterPlanMode to explore, design approach, get user input*
```

---

## Quick Reference Checklist

### Starting Work
- [ ] Is this a feature? → Consider `/feature-dev`
- [ ] Is this exploration? → Use `code-explorer`
- [ ] Is this complex? → Use `EnterPlanMode`
- [ ] Do I need external knowledge? → Search first

### During Implementation
- [ ] Reading existing code before modifying
- [ ] Following existing patterns
- [ ] Using design tokens (no hardcoded values)
- [ ] Multi-client safety (ownership guards, queueUpdate)
- [ ] Avoiding Firefox flexbox checkbox bug

### Before Committing
- [ ] Run `npm run build:css` (if SCSS changed)
- [ ] Run `npm run lint:css` (if SCSS changed)
- [ ] Proactive code review (if non-trivial)
- [ ] Git status + git diff reviewed
- [ ] Commit message drafted with attribution
- [ ] Testing guidance provided

### Creating PR
- [ ] Analyzed FULL diff (not just latest commit)
- [ ] PR description drafted with test plan
- [ ] Multi-client safety verified
- [ ] Build and lint passing

---

## Project-Specific Reminders

### Foundry VTT Multi-Client Development

**Every update handler MUST have:**
1. Ownership guard (`if (!this.actor.isOwner) return;`)
2. No-op check (skip if value unchanged)
3. Batched updates (single `update()` call)
4. queueUpdate wrapper (prevent concurrent updates)

**See:** `foundry-vtt-performance-safe-updates` skill for full patterns

### CSS Development

**Every style change MUST:**
1. Use design tokens from `_tokens.scss`
2. Avoid `display: flex` for checkbox containers (Firefox bug)
3. Keep selector nesting ≤ 3 levels
4. Use `inline-block` + `white-space: nowrap` for checkbox layouts

**See:** `foundry-bitd-alt-css-authoring` skill for full patterns

### Git Workflow

**This project uses:**
- Feature branches → `rc-1.1.0` → `master`
- Fork: ImproperSubset/foundry-bitd-alternate-sheets
- Upstream: justinross/foundry-bitd-alternate-sheets

**See:** `git-branching-strategy` skill for branch management

---

## Integration with Other Skills

This workflow skill **coordinates** the other skills:

| Scenario | This Skill Says | Then Use |
|----------|----------------|----------|
| New feature | "Use /feature-dev" | `feature-dev:feature-dev` skill |
| Update handler | "Check multi-client safety" | `foundry-vtt-performance-safe-updates` |
| CSS change | "Use design tokens, avoid flex for checkboxes" | `foundry-bitd-alt-css-authoring` |
| Data migration | "Use schema version system" | `foundry-vtt-data-migrations` |
| Git commit | "Analyze changes, craft message" | `git-branching-strategy` |
| Documentation | "Apply Link Test" | `documentation-management` |
| Dialog creation | "Use inline styles for V2 Shadow DOM" | `foundry-vtt-dialog-compat` |
| API usage | "Use compat wrappers for V12/V13" | `foundry-vtt-version-compat` |

---

## Success Criteria

You're following this workflow correctly when:

- ✅ Features are explored before implementing
- ✅ Code is reviewed proactively (before user asks)
- ✅ Commits are clean with proper messages
- ✅ PRs include comprehensive descriptions
- ✅ Testing guidance is always provided
- ✅ External knowledge is verified, not assumed
- ✅ Specialized agents are used appropriately

---

## References

- **Source:** `CLAUDE.md` (Agent Routing Protocols, Commit Guidelines)
- **Related Skills:** All 11 project skills
- **External:** Claude Code documentation on agents and tools

---

**Last Updated:** 2025-12-31
**Status:** Active - use throughout development lifecycle
