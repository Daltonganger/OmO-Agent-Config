# TODO - Future Enhancements

## Big Features (v0.5.0+)

### Custom Agent Creation
**Status:** Documented, not planned for immediate implementation
**Priority:** Medium
**Effort:** High (2-3 weeks)

Full custom agent support with system prompts, templates, and validation.
See `docs/CUSTOM-AGENTS.md` for complete specification.

### LMstudio Model Support
**Status:** Blocked - requires OpenCode plugin investigation
**Priority:** Medium
**Effort:** Medium

**Issue**: LMstudio plugin initializes but models don't appear in `opencode models` output

**Details**:
- LMstudio is running with models loaded (confirmed via http://localhost:1234/v1/models)
- Plugin shows `[opencode-lmstudio] LM Studio plugin initialized` 
- However, no lmstudio-prefixed models appear in the model list

**Possible Solutions**:
1. Investigate if opencode-lmstudio plugin needs additional configuration
2. Check if there's a different command to query plugin-provided models
3. Add manual LMstudio model support (allow users to manually add models)
4. Work with OpenCode team to fix plugin integration

### TUI Framework Upgrade
**Status:** Deferred - current readline UI is sufficient
**Decision:** Not needed; tool scope is narrow and workflow-focused

---

## Completed Releases

### v0.4.0 (Phase 3 - Quality of Life)
- [x] **Bulk Agent Operations** - Auto-optimize all agents, bulk edit multiple agents
- [x] **Persistent Provider Filters** - Default to preferred providers in search, ★ markers
- [x] **Model Comparison** - Side-by-side comparison of up to 4 models
- [x] **Model Bookmarks** - Save and select frequently-used models
- [x] **Agent Reordering** - Custom display order for agents in list
- [x] **Reload Models** - Refresh model list without restart
- [x] **Modular Codebase** - Split into lib/ structure for maintainability

### v0.3.1
- Removed "Add agent" functionality (non-functional without system prompts)
- Added agent information screen [?]
- Created `docs/CUSTOM-AGENTS.md`

### v0.3.0
- Backup restore from UI with preview
- Agent count display in configuration lists
- Stay in Agent Config Menu after edits

### v0.2.x
- CLI argument support (-s, -l, -c, -h)
- Copy from any configuration
- Provider filtering and preferences

### v0.1.0
- Named configuration profiles
- Configuration management (CRUD)
- Export/import functionality
