# Usage Guide

Complete guide for using OmO Agent Config.

## Table of Contents

- [Getting Started](#getting-started)
- [Main Menu](#main-menu)
- [Managing Agents](#managing-agents)
- [Model Selection](#model-selection)
- [Backups and Restore](#backups-and-restore)
- [Advanced Usage](#advanced-usage)

## Getting Started

### First Run

After installation, start the tool:

```bash
opencode-agent-config
```

The tool will:
1. Load your current Oh My Opencode configuration
2. Query OpenCode for available models (this may take a few seconds)
3. Display the main menu

### Navigation

- Use letter keys (E, A, D, R, B, Q) for menu actions
- Enter numbers to select items from lists
- Type agent names when prompted
- Press Ctrl+C to cancel at any time

## Main Menu

The main menu shows your current agent configuration and available actions:

```
======================================================================
Oh My Opencode - Agent Configuration
======================================================================

CURRENT AGENTS:

  1. oracle                    → opencode/gpt-5.2
  2. Sisyphus                  → google/claude-opus-4-5-thinking
  3. librarian                 → google/claude-sonnet-4-5
  4. frontend-ui-ux-engineer   → google/gemini-3-pro-high
  5. document-writer           → google/gemini-3-flash
  6. multimodal-looker         → google/gemini-3-flash

ACTIONS:

  [E] Edit agent model
  [D] Delete agent
  [R] Restore defaults
  [B] View backups
  [Q] Quit
```

## Managing Agents

### Edit an Existing Agent

1. Press `E` from the main menu
2. Enter the agent name (e.g., "oracle")
3. View recommended models
4. Select a model by number or press `S` to search
5. Confirm your selection

The tool automatically creates a backup before saving.

### Add a New Agent

This tool manages **Oh My OpenCode's built-in agents** and focuses on model assignment.
Custom agent creation is not supported here.

### Delete an Agent

1. Press `D` from the main menu
2. Enter the agent name to delete
3. Confirm with `yes`
4. The agent is removed and a backup is created

**Warning**: This action cannot be undone (except by restoring from backup).

## Model Selection

### Recommended Models

When selecting a model, you'll first see recommended models scored by suitability:

```
Select Model for: oracle
Description: Strategic reasoning and complex problem solving
Current: opencode/gpt-5.2

RECOMMENDED MODELS:

  1. OpenAI GPT-5.2 (200K[R]) ⭐ (current)
  2. Claude Opus 4.5 Thinking (200K[R])
  3. Claude Sonnet 4.5 (200K[R])
  4. Gemini 3 Pro High (1048K[RIP])
  5. Claude Haiku 4.5 (200K[R])
  6. GPT-5.1 Codex (200K[R])
  7. Grok 4 (131K[R])
  8. Kimi K2 Thinking (200K[R])

[S] Search all models
[C] Cancel
```

### Capability Indicators

- **R** - Reasoning capable (extended thinking)
- **I** - Image input support
- **P** - PDF input support
- **Context size** - In kilobytes (K), e.g., 200K = 200,000 tokens

### Search All Models

Press `S` to search through all available models:

1. Enter a search term (provider name, model name, or leave blank for all)
2. Browse paginated results (15 per page)
3. Use `N` for next page, `P` for previous page
4. Enter a number to select a model
5. Press `C` to return to recommended models

Example searches:
- `claude` - Find all Claude models
- `anthropic` - Find direct Anthropic models
- `gemini` - Find Gemini models
- `thinking` - Find models with thinking capability
- (blank) - Show all models

## Backups and Restore

### Automatic Backups

Every configuration change automatically creates a timestamped backup:

```
~/.config/opencode/backups/oh-my-opencode-2025-12-24-123045.json
```

### View Backups

Press `B` from the main menu to see the 10 most recent backups:

```
--- Configuration Backups ---

  1. oh-my-opencode-2025-12-24-143020.json (1234 bytes)
  2. oh-my-opencode-2025-12-24-142010.json (1234 bytes)
  3. oh-my-opencode-2025-12-24-140530.json (1234 bytes)
  ...
```

### Restore from Backup

To manually restore a backup:

```bash
cp ~/.config/opencode/backups/oh-my-opencode-2025-12-24-123045.json \
   ~/.config/opencode/oh-my-opencode.json
```

### Restore Defaults

Press `R` from the main menu to restore all agents to defaults:

- oracle → opencode/gpt-5.2
- Sisyphus → google/claude-opus-4-5-thinking
- librarian → google/claude-sonnet-4-5
- frontend-ui-ux-engineer → google/gemini-3-pro-high
- document-writer → google/gemini-3-flash
- multimodal-looker → google/gemini-3-flash

A backup is created before restoring.

## Advanced Usage

### Agent Profiles

The tool has built-in profiles for common agent types:

#### oracle
- **Purpose**: Strategic reasoning and complex problem solving
- **Recommended**: High reasoning capability, large context window (128K+)
- **Best for**: Architecture decisions, complex refactoring, strategic planning

#### Sisyphus
- **Purpose**: Extended thinking for multi-step tasks
- **Recommended**: Thinking models, reasoning, large context
- **Best for**: Complex implementations, debugging difficult issues

#### librarian
- **Purpose**: Research and knowledge retrieval
- **Recommended**: Large context, fast performance
- **Best for**: Documentation lookup, codebase analysis

#### frontend-ui-ux-engineer
- **Purpose**: UI/UX work with visual understanding
- **Recommended**: Multimodal, image input
- **Best for**: Visual design, CSS work, component styling

#### document-writer
- **Purpose**: Fast text generation
- **Recommended**: Speed, efficiency
- **Best for**: README files, documentation, comments

#### multimodal-looker
- **Purpose**: Visual analysis
- **Recommended**: Image/PDF input
- **Best for**: Screenshot analysis, diagram interpretation

### Custom Agent Profiles

When adding a custom agent, the tool uses generic scoring. For best results:

1. Choose models based on your agent's primary task
2. Consider context window size for large codebases
3. Use reasoning models for complex logic
4. Use fast models for simple, repetitive tasks

### Configuration File Structure

The tool modifies `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "google_auth": false,
  "agents": {
    "agent-name": {
      "model": "provider/model-name"
    }
  },
  "mcps": {
    ...
  }
}
```

The tool preserves your MCP configuration and other settings.

## Tips and Best Practices

1. **Experiment with models** - Try different models for different agents
2. **Use backups** - Don't worry about breaking things, backups are automatic
3. **Match capabilities to tasks** - Use multimodal models for visual work
4. **Consider costs** - Some models may have different pricing
5. **Check context limits** - Large context windows for large codebases
6. **Test after changes** - Verify your agents work with new models

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.
