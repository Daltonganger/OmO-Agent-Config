# Release 0.3.1 - Option 1 Implementation

**Release Date:** December 24, 2025  
**Type:** Bug fix / Scope clarification  
**Priority:** Important - prevents user confusion

## Summary

This release removes the "Add agent" functionality and clarifies that the tool manages model assignments for Oh My Opencode's **built-in agents only**. User-added agents without system prompts don't work in the OpenCode/OmO ecosystem.

## Why This Change?

### The Problem

When users added a custom agent via the tool (v0.3.0 and earlier), it created:
```json
{
  "agents": {
    "my-custom-agent": {
      "model": "opencode/gpt-5.2"
    }
  }
}
```

**This agent doesn't work** because OpenCode requires:
- `description` field (required)
- `prompt` field pointing to system prompt markdown file
- Agent behavior settings (temperature, tools, etc.)

Without these, OpenCode doesn't know what the agent does or when to invoke it.

### The Solution (Option 1)

**Remove the "Add agent" feature** and be honest about tool scope:
- Tool manages **model assignments** for OmO's 6 curated agents
- OmO agents have complete definitions (prompts, tools, descriptions) in the plugin
- Users can't create functional agents without system prompts
- Clear path to full custom agent support documented for future release

## Changes Made

### Code Changes

1. **Replaced `addAgent()` with `showAgentInfo()`**
   - File: `opencode-agent-config` line 693
   - New function displays all OmO agents with descriptions, capabilities, and context requirements
   - Points users to `docs/CUSTOM-AGENTS.md` for custom agent information

2. **Updated Main Menu**
   - Removed: `[A] Add new agent`
   - Added: `[?] Show agent information`
   - Added footer: "Managing OmO built-in agents only (see [?] for custom agents)"

3. **Updated Agent Config Menu**
   - Removed: `[A] Add new agent`
   - Added: `[?] Show agent information`
   - Same functionality in both menus

### Documentation Changes

1. **Created `docs/CUSTOM-AGENTS.md`**
   - Complete specification for Option 2 (future full custom agent support)
   - Requirements, UI flows, implementation tasks
   - Templates and examples
   - Testing checklist
   - Target: v0.4.0 or v0.5.0

2. **Updated `README.md`**
   - Replaced "Add a New Agent" section with "Show Agent Information"
   - Updated main menu example
   - Changed feature list to reflect agent info vs agent management

3. **Updated `TODO.md`**
   - Moved completed items to "Completed Improvements (v0.3.0)"
   - Added "Current Release (v0.3.1)" section with rationale
   - Documented Option 2 in "Future Enhancements"
   - Deferred TUI upgrade as unnecessary

4. **Updated `CHANGELOG.md` and `VERSION`**
   - Version bumped from 0.3.0 → 0.3.1 (bug fix increment)
   - Documented removed, added, changed, and improved items

## What Users See

### Before (v0.3.0)
```
ACTIONS:
  [E] Edit agent model
  [A] Add new agent          ← Creates non-functional agents
  [D] Delete agent
  ...
```

### After (v0.3.1)
```
ACTIONS:
  [E] Edit agent model
  [D] Delete agent
  [?] Show agent information  ← New: Shows OmO agent details
  ...

Capabilities: [R]=Reasoning [I]=Image [P]=PDF
Managing OmO built-in agents only (see [?] for custom agents)
```

### Agent Information Screen

Pressing `[?]` shows:
```
======================================================================
Oh My Opencode Built-in Agents
======================================================================

This tool manages model assignments for Oh My Opencode's curated agents.

AVAILABLE AGENTS:

oracle
  Strategic reasoning and complex problem solving
  Preferred: reasoning, large_context
  Min context: 128,000 tokens

Sisyphus
  Extended thinking for complex multi-step tasks
  Preferred: reasoning, thinking, large_context
  Min context: 128,000 tokens

[... other agents ...]

Note: To create custom agents with system prompts, see:
      docs/CUSTOM-AGENTS.md
```

## Breaking Changes

**⚠️ The `[A] Add new agent` option has been removed.**

If you previously added custom agents via this tool:
- Those agent entries still exist in your configuration
- **They won't work** (OpenCode won't recognize them)
- You can safely delete them via `[D] Delete agent`
- See `docs/CUSTOM-AGENTS.md` for proper custom agent creation in future releases

## Migration Path

No action required for most users. If you added custom agents in v0.3.0:

1. Check your agents: `opencode-agent-config`
2. Delete any agents that aren't OmO defaults:
   - oracle
   - Sisyphus
   - librarian
   - frontend-ui-ux-engineer
   - document-writer
   - multimodal-looker
3. These agents won't work without system prompts anyway

## Future: Option 2 (Custom Agent Support)

Full custom agent creation **will be added in a future release** (v0.4.0+).

This will include:
- System prompt editor/templates
- Agent description configuration
- Tool configuration
- Temperature and behavior settings
- Markdown file generation in `~/.config/opencode/agent/custom/`

See `docs/CUSTOM-AGENTS.md` for complete specification.

## OmO Built-in Agents

The 6 agents managed by this tool:

| Agent | Purpose | Capabilities |
|-------|---------|-------------|
| **oracle** | Strategic reasoning & problem solving | Reasoning, large context (128K+) |
| **Sisyphus** | Extended thinking for multi-step tasks | Reasoning, thinking, large context |
| **librarian** | Research & knowledge retrieval | Large context, fast |
| **frontend-ui-ux-engineer** | UI/UX with visual understanding | Multimodal, image input |
| **document-writer** | Fast text generation | Speed, text output |
| **multimodal-looker** | Visual analysis & PDF understanding | Multimodal, image/PDF input |

These agents are defined in Oh My Opencode plugin with complete system prompts, tool configs, and behavior settings.

## Testing

Tested functionality:
- ✓ `--help` displays correctly
- ✓ Main menu shows new UI
- ✓ `[?]` shows agent information screen
- ✓ Agent Config Menu updated correctly
- ✓ Delete agent still works
- ✓ Edit agent still works
- ✓ No syntax errors
- ✓ All documentation updated

## Files Changed

### Modified
- `opencode-agent-config` - Main script (removed addAgent, added showAgentInfo)
- `README.md` - Updated examples and feature list
- `TODO.md` - Moved items, added v0.3.1 section
- `CHANGELOG.md` - Added v0.3.1 entry
- `VERSION` - Bumped to 0.3.1

### Created
- `docs/CUSTOM-AGENTS.md` - Complete Option 2 specification
- `docs/RELEASE-0.3.1.md` - This file

## Acknowledgments

This change makes the tool honest about its capabilities and prevents user frustration from creating non-functional agents. Full custom agent support is documented and will be implemented based on user feedback and demand.

---

**Co-Authored-By: Warp <agent@warp.dev>**
