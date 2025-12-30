# lib/

## OVERVIEW

Core implementation (Node built-ins only). All user-facing behavior routes through `lib/ui/menus.js`.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Config paths/defaults | `constants.js` | `CONFIG_DIR`, `CONFIG_FILE`, `OPENCODE_CONFIG_FILE`, `SECRETS_DIR` |
| Named config profiles | `config-manager.js` | metadata envelope `{ name, description, created, modified, config }` |
| Model catalog parsing | `model-loader.js` | runs `opencode models --verbose`, brace-count JSON parse |
| Missing agent/MCP sync | `validation.js` | add missing agents/MCPs to match expected roster |
| Upstream schema caching | `upstream.js` | GitHub latest release → raw schema → `~/.config/opencode/cache/` |

## CONVENTIONS

- No npm deps; Node built-ins only
- Config writes always preceded by backup (handled in UI layer + config-manager)

## ANTI-PATTERNS

- Don’t add package.json/deps
- Don’t embed secrets in defaults (prefer `{env:...}` / `{file:...}` + `secrets/`)