# TODO - Future Enhancements

## LMstudio Model Support

**Issue**: LMstudio plugin initializes but models don't appear in `opencode models` output

**Details**:
- LMstudio is running with models loaded (confirmed via http://localhost:1234/v1/models)
- Plugin shows `[opencode-lmstudio] LM Studio plugin initialized` 
- However, no lmstudio-prefixed models appear in the model list
- Available LMstudio models include: nvidia/nemotron-3-nano, openai/gpt-oss-120b, qwen2.5-14b-instruct-1m, meta-llama-3.1-8b-instruct, mistralai/mistral-7b-instruct-v0.3

**Possible Solutions**:
1. Investigate if opencode-lmstudio plugin needs additional configuration
2. Check if there's a different command to query plugin-provided models
3. Add manual LMstudio model support (allow users to manually add models visible in LMstudio)
4. Work with OpenCode team to fix plugin integration

**Priority**: Medium - Users can still use LMstudio models if they manually type the model ID, but they won't appear in the recommended/searchable list

---

## Prioritized UX Improvements

### High Priority (Next Release)

#### 1. Stay in Agent Config After Edits
**Status:** Planned
**Effort:** Low
**Impact:** High - Reduces menu navigation when configuring multiple agents
**Details:** After editing/adding an agent, stay in Agent Config Menu instead of returning to Main Menu

#### 2. Show Agent Count in Configuration Lists
**Status:** Planned
**Effort:** Low
**Impact:** Low - Quick visual indicator of config size
**Details:** Display agent count next to config name: `work-config (6 agents)`

#### 3. Add Backup Restore from UI
**Status:** Planned
**Effort:** Medium
**Impact:** High - Complete the backup feature
**Details:** Allow restoring from backup directly in UI, show diff preview, confirm before restore

### Medium Priority

- **Bulk Agent Operations:** Update multiple agents at once
- **Edit Configuration Description:** Update description without export/import
- **Persistent Provider Filters:** Default to preferred providers in search

### Low Priority / Future

- **Model Comparison:** Side-by-side comparison of multiple models
- **Model Bookmarks:** Save frequently-used models
- **Agent Reordering:** Custom order for agents in list
- **Reload Models Command:** Refresh model list without restart

---

## TUI Framework Upgrade

**Consideration:** Migrate from readline-based CLI to full TUI (like OpenCode)

**Potential Frameworks:**
- **blessed** (npm) - Full-featured TUI framework for Node.js
- **ink** (npm) - React-based TUI components
- **prompts** (npm) - Better interactive prompts

**Benefits:**
- Better visual hierarchy
- Mouse support
- More intuitive navigation
- Richer formatting options
- Progress indicators

**Effort:** High (major refactor)
**Impact:** Medium-High (better UX, but current CLI works well)

**Decision:** Defer until after quick wins are implemented

---

## Other Future Enhancements

Add additional enhancement ideas here as they come up.
