# lib/ui/

## OVERVIEW

Interactive TUI + CLI orchestration (`AgentConfigTool`). Handles scope selection (global vs project), backups, and guided flows.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Main loop/menu | `menus.js` | `mainMenu()`, key handlers, scope header rendering |
| Project scope detection | `menus.js` | git root discovery, `.opencode/oh-my-opencode.json` loading |
| Secrets workflows | `menus.js` | `[V]/[Z]` migrations, `[H]` report, `[Y]` MCP credential editor |
| Model selection UI | `menus.js`, `prompts.js` | recommended list + search/filter fallback |
| Formatting helpers | `prompts.js` | `formatModel()` |

## CONVENTIONS

- Scope matters: in project mode, writes go to `.opencode/oh-my-opencode.json` and backups live under `.opencode/backups/`
- Never print secret values (only names/paths)

## ANTI-PATTERNS

- Don’t offer custom agent creation here (tool manages OmO built-ins)
- Don’t hard-fail when `opencode models` breaks; allow manual model-id entry for recovery