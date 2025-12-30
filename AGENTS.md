# PROJECT KNOWLEDGE BASE

**Generated:** 2025-12-30
**Commit:** 9c875b9
**Branch:** main

## OVERVIEW

Interactive CLI for managing Oh My Opencode agent model assignments. Modular Node.js application (~2100 lines) with TUI menus, 200+ model catalog, named config profiles, automatic backups.

## STRUCTURE

```
OmO-Agent-Config/
├── bin/
│   └── opencode-agent-config   # Entry point (thin wrapper)
├── lib/
│   ├── constants.js            # Colors, paths, DEFAULTS, AGENT_PROFILES
│   ├── config-manager.js       # ConfigurationManager class
│   ├── model-loader.js         # Model parsing, scoring, recommendations
│   ├── validation.js           # Config validation, sync logic
│   └── ui/
│       ├── menus.js            # Main menu, agent config menu
│       ├── config-menus.js     # Configuration management menus
│       └── prompts.js          # Input helpers, formatModel
├── install.sh                  # Copies bin/ and lib/ to ~/.config/opencode/
├── docs/                       # User documentation
├── VERSION                     # Manual version tracking
└── CHANGELOG.md                # Release history
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add/modify features | `lib/` modules | Organized by responsibility |
| Agent profiles/scoring | `lib/constants.js` | `AGENT_PROFILES` object |
| Model recommendation logic | `lib/model-loader.js` | `scoreModel()`, capability detection |
| Configuration management | `lib/config-manager.js` | CRUD for named configs |
| Config validation/sync | `lib/validation.js` | Missing agent detection |
| CLI argument handling | `bin/opencode-agent-config` | Entry point |
| Main interactive loop | `lib/ui/menus.js` | TUI navigation |
| Backup/restore | `lib/config-manager.js` | Automatic timestamped backups |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `AgentConfigTool` | Class | `lib/ui/menus.js` | Main application class - TUI orchestration |
| `ConfigurationManager` | Class | `lib/config-manager.js` | Named config profiles CRUD, migration |
| `AGENT_PROFILES` | Object | `lib/constants.js` | 7 built-in agent definitions with scoring |
| `DEFAULTS` | Object | `lib/constants.js` | Default agent-to-model mappings |
| `scoreModel()` | Function | `lib/model-loader.js` | Ranks models by agent capability match |
| `validateConfig()` | Function | `lib/validation.js` | Detects missing agents/MCPs |

### Key Paths

```
~/.config/opencode/
├── oh-my-opencode.json      # Active config (what OmO reads)
├── active-config.json       # Tracks which named config is active
├── configs/                 # Named configuration profiles
│   ├── omo-default.json
│   └── user-config.json
├── backups/                 # Timestamped backups
├── cache/                   # Cached upstream schema (Oh My OpenCode)
├── secrets/                 # Local secret files for {file:...} placeholders
└── bin/                     # Installed tool
    ├── opencode-agent-config
    └── lib/                 # Copied lib/ directory
```

## CONVENTIONS

- **No package.json**: Uses only Node.js built-ins (fs, path, readline, child_process)
- **Modular architecture**: Split into logical modules under `lib/`
- **Relative requires**: Modules use relative paths, no npm dependencies
- **Manual versioning**: Update `VERSION` file + `CHANGELOG.md` for releases
- **Config validation**: Names must match `/^[a-z0-9-_]+$/i`
- **install.sh deploys**: Copies entire bin/ and lib/ structure

## ANTI-PATTERNS (THIS PROJECT)

- **Don't add package.json**: Intentionally zero npm dependencies, Node.js built-ins only
- **Don't create agents without system prompts**: Tool manages OmO built-in agents only - user-created agents without prompts won't work (see `docs/CUSTOM-AGENTS.md`)

## UNIQUE STYLES

- **Source-as-binary**: JS file with shebang, distributed as executable
- **Shell-based installation**: No npm/brew; `install.sh` copies into `~/.config/opencode/` and links into `~/.local/bin`
- **Metadata wrapping**: Configs stored with `{ name, description, created, modified, config }` envelope
- **Provider preference scoring**: `preferred_providers` array boosts model scores

## COMMANDS

```bash
# Install
./install.sh

# Interactive mode
opencode-agent-config

# CLI quick operations
opencode-agent-config -s <config-name>  # Switch config
opencode-agent-config -l                # List configs
opencode-agent-config -c                # Show current
opencode-agent-config -h                # Help
```

## NOTES

- **Model loading**: Runs `opencode models --verbose`, parses nested JSON with brace counting; surfaces stderr on failure
- **Global vs project scope**: edits global `~/.config/opencode/oh-my-opencode.json` or project `.opencode/oh-my-opencode.json` (git root)
- **Upstream sync**: fetches Oh My OpenCode schema at startup (latest release tag) into `~/.config/opencode/cache/`
- **Secrets portability**: supports `{env:...}` and `{file:...}` placeholders; can migrate MCP secrets into `~/.config/opencode/secrets/`
- **Built-in agents managed**: oracle, Sisyphus, librarian, explore, frontend-ui-ux-engineer, document-writer, multimodal-looker
- **First-run migration**: Auto-creates `omo-default` and migrates existing config to `user-config`
- **Backup before every save**: Creates timestamped backup in `~/.config/opencode/backups/`
- **No tests**: Manual testing only, no automated test suite
- **Future**: Custom agent support planned for v0.4.0+ (see `docs/CUSTOM-AGENTS.md`)
