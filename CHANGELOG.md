# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-03

### Breaking Changes
- Migrated from agent-only configuration to category-based system
- Existing configs will be automatically migrated on first run
- Pre-migration backups are created automatically

### Added
- **Category System** - 19 intelligent task categories (ultrabrain, visual-engineering, quick, etc.)
- **Five-Tier Model Resolution** - UI Override → User Config → Category Default → Fallback Chain → System Default
- **Fallback Chain Support** - Automatic provider-based fallback for agents and categories
  - Provider priority: anthropic → github-copilot → opencode → zai-coding-plan
  - Fuzzy model matching (e.g., "claude-opus-4-5" matches "claude-opus-4-5-preview")
  - Variant propagation from fallback chains (max, high, medium, xhigh)
- **Variant Support** - Configure reasoning effort variants per agent/category
- **Upstream Schema Fetching** - Automatic fetch and cache of Oh My Opencode schema
  - 24-hour TTL for cached schema
  - Graceful fallback to hardcoded constants
- **Config Migration** - Automatic one-time migration from agent-only to category-based
- **New CLI Commands:**
  - `--validate` - Validate configuration and check model availability
  - `--resolve <agent|category>` - Non-interactive model resolution
- **Model Requirements Validation** - `requiresModel` field enforces model availability

### Changed
- Complete architecture refactor to support Oh My OpenCode's new category-based model selection
- Agent model resolution now uses fallback chains instead of direct assignment
- Configuration format now supports both `agents` and `categories` sections

## [0.5.0] - 2025-12-30

### Added
- Project scope support via `.opencode/oh-my-opencode.json` (git root) with clear scope/repo/path display
- Project opt-in prompt (interactive only) with per-repo "don't ask again" cache
- Copy a saved profile into a project config
- Save current global/project config back into a named profile
- Startup check for latest Oh My OpenCode schema release (cached under `~/.config/opencode/cache/`)
- Provider preference policies by model family prefix (e.g. `claude-`, `gpt-`, `grok-`) and an interactive editor
- MCP portability tooling:
  - Exa key helper
  - Migrate OpenCode `opencode.json` MCP `environment` secrets into `~/.config/opencode/secrets/*` with `{file:...}` placeholders
  - Migrate Oh My OpenCode MCP URL query secrets into `~/.config/opencode/secrets/*` with `{file:...}` placeholders
  - Secrets report (inline vs env vs file + missing/orphan secret files)

### Changed
- Installer now links command into `~/.local/bin` and ensures PATH points there
- Tool can continue when model catalog fails to load (manual model-id entry fallback)

### Fixed
- ProviderModelNotFoundError due to bare model ids: normalize agent model ids to fully-qualified `provider/model`
- Model catalog parsing bug where JSON `id` overwrote the qualified `provider/model` id
- Snapshot profile creation on schema update now uses valid config names (no dots)
- Repo-root `./opencode-agent-config` now forwards to `./bin/opencode-agent-config` to avoid running legacy script

## [0.4.0] - 2025-12-29

### Added
- **Bulk Agent Operations** - New options in Agent Config Menu:
  - [A] Auto-optimize all - Apply top recommended model to each agent based on profile
  - [L] Bulk edit - Apply same model to multiple selected agents at once
- **Persistent Provider Filters** - Search/filter now shows preferred providers option:
  - [P] Use preferred providers only in search
  - ★ markers show preferred providers in provider lists
- **Model Comparison** - [K] Compare up to 4 models side-by-side:
  - Shows provider, context size, capabilities (reasoning, thinking, image, PDF)
  - Cost comparison (input/output pricing)
  - Fast model indicator
- **Model Bookmarks** - [*] Save frequently-used models for quick access:
  - Add/remove bookmarks from any model selection
  - Quick select from bookmarks when assigning models
- **Agent Reordering** - [O] Customize agent display order:
  - Swap agent positions with simple "# #" command
  - Order persists across sessions (JS object insertion order)
- **Reload Models** - [L] Refresh model list without restarting tool:
  - Useful when providers add new models
  - Shows count of loaded models and providers

### Changed
- **Modular Architecture** - Codebase split into `lib/` structure:
  - `lib/constants.js` - Colors, paths, defaults, agent profiles
  - `lib/config-manager.js` - ConfigurationManager class
  - `lib/model-loader.js` - Model parsing, scoring, recommendations
  - `lib/validation.js` - Config validation, sync logic
  - `lib/ui/menus.js` - Main AgentConfigTool class, TUI menus
  - `lib/ui/prompts.js` - Input helpers, formatModel
- Entry point moved to `bin/opencode-agent-config`
- `install.sh` updated to copy modular structure

### Improved
- Better workflow for power users managing multiple agents
- Faster model selection with bookmarks and persistent filters
- Easier comparison when choosing between similar models

## [0.3.1] - 2025-12-24

### Removed
- **"Add agent" functionality** - Removed non-functional agent creation feature
- User-added agents without system prompts don't work in OpenCode/OmO ecosystem

### Added
- **Agent information screen** - [?] option shows all OmO built-in agents with:
  - Agent name and description
  - Preferred model capabilities
  - Minimum context requirements
- `docs/CUSTOM-AGENTS.md` - Complete specification for future custom agent support
- UI messaging indicating tool manages OmO built-in agents only

### Changed
- Main menu now shows "[?] Show agent information" instead of "[A] Add new agent"
- Agent Config Menu updated with info option, removed add option
- UI footer shows "Managing OmO built-in agents only (see [?] for custom agents)"
- Tool scope clarified: model assignment for Oh My Opencode's curated agents

### Improved
- Tool is now honest about its functionality and limitations
- Prevents users from creating non-functional agent entries
- Clear path to full custom agent creation in future release (Option 2)

## [0.3.0] - 2025-12-24

### Added
- **Backup restore from UI** - Full restore functionality with preview and confirmation
- **Agent count display** - Show number of agents in all configuration lists
- Backup preview showing agents and models before restore
- Warning prompt with safety backup before restore
- Scope selection (current config or all backups) for restore

### Changed
- **Stay in Agent Config Menu after edits** - No longer returns to main menu after each operation
- Agent operations (add/edit/delete) stay in context when called from Agent Config Menu
- Reduced navigation friction when configuring multiple agents
- Configuration lists show agent counts: `config-name (6 agents)`

### Improved
- Workflow efficiency for multi-agent configuration
- Backup management now complete with restore capability
- Better visual indication of configuration size

## [0.2.1] - 2025-12-24

### Added
- Direct agent configuration menu after creating new configuration
- Capability legend displayed on main menu: [R]=Reasoning [I]=Image [P]=PDF
- Provider names shown in cyan color when listing models
- Agent selection by number in addition to name
- Dedicated agent configuration menu for batch editing

### Changed
- Edit/Delete agent prompts now accept either number (1-6) or agent name
- Model display now includes colored provider name for better visibility
- After creating config, users are prompted to configure agents immediately
- Improved workflow for setting up new configurations

### Improved
- Better visual distinction between model information components
- More intuitive agent selection process
- Streamlined configuration creation experience

## [0.2.0] - 2025-12-24

### Added
- **CLI argument support** - Fast configuration switching from command line
- `--switch` / `-s` - Quick switch to a configuration without interactive menu
- `--list` / `-l` - List all available configurations
- `--current` / `-c` - Show currently active configuration
- `--help` / `-h` - Display usage information
- Error handling for invalid configuration names with helpful suggestions

### Changed
- Tool now supports both interactive and CLI modes
- Non-interactive commands exit immediately after execution
- Updated README with CLI usage examples

## [0.1.1] - 2025-12-24

### Added
- Ability to copy from any existing configuration when creating a new one
- "Copy from another configuration" option in create config menu
- Shows source configuration name when creating from a copy

### Changed
- Reordered create configuration options for better UX
- Option [2] is now "Copy from another configuration" with interactive selection
- Option [3] is now "Copy current configuration" 
- Option [4] is now "Minimal configuration (no agents)"

### Fixed
- Previously could only copy from omo-default or current config, now can copy from any config

## [0.1.0] - 2025-12-24

### Added
- **Named configuration profiles** - Create, save, and switch between multiple agent configurations
- Configuration management menu with full CRUD operations (create, rename, delete, switch)
- Built-in "omo-default" configuration with Oh My Opencode defaults
- Automatic migration of existing configuration to "user-config" on first run
- Configuration metadata tracking (name, description, created/modified timestamps)
- Configuration export/import functionality for sharing and backup
- Config-specific backup naming for better organization
- Active configuration display in main menu with metadata
- Configuration-filtered backup viewer with option to view all backups
- ConfigurationManager class for centralized config operations
- Smart configuration creation with recommended defaults (copy omo-default)
- Context-aware tips after creating/switching configurations
- Warning when creating minimal configs without agents

### Changed
- Main menu now displays active configuration info at top
- "Restore defaults" now switches to "omo-default" configuration instead of overwriting
- Backup files now named with config name prefix (e.g., `user-config-2025-12-24T12-00-00.json`)
- Configuration structure now includes metadata wrapper with name, description, timestamps

### Technical
- New directory structure: `~/.config/opencode/configs/` for storing named configurations
- Active config tracked in `~/.config/opencode/active-config.json`
- All configuration operations go through ConfigurationManager for consistency
- Configuration names validated (alphanumeric, hyphens, underscores only)

## [0.0.2] - 2025-12-24

### Added
- Provider filtering feature - filter models by provider(s)
- Preferred providers configuration - set provider preference order
- Model recommendations now boost preferred providers in scoring
- Multi-select provider filter menu
- WARP.md documentation for repository guidance
- Dynamic provider extraction from available models

### Fixed
- Fixed JSON parser to handle nested braces using brace counting
- Updated regex to match model IDs with multiple slashes (e.g. openrouter/openai/model)
- Use providerID field from model data instead of splitting ID string
- Suppress stderr to prevent plugin messages from corrupting JSON parsing
- Now correctly loads 200+ models from all 6 providers (anthropic, cerebras, google, opencode, openrouter, xai)

## [0.0.1] - 2025-12-23

### Added
- Initial release
- Interactive CLI for managing Oh My Opencode agent model assignments
- Smart model recommendations based on agent profiles
- Automatic configuration backups
- Model search functionality
- Agent management (add, edit, delete)
- Restore defaults functionality
- Support for 200+ models from multiple providers
