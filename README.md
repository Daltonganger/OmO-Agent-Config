# OmO Agent Config

> Interactive CLI tool for managing [Oh My OpenCode (Oh My Opencode)](https://github.com/code-yeongyu/oh-my-opencode) agent model assignments

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

## Overview

OmO Agent Config is a user-friendly command-line tool that simplifies the process of configuring and managing agent model assignments in Oh My Opencode. No more manual JSON editing - use an interactive menu to browse, search, and assign models from a catalog of 200+ options.

### Key Features

- **Named Configuration Profiles** - Create and switch between multiple agent configurations for different workflows
- **CLI Quick Switch** - Fast config switching via command line: `opencode-agent-config -s work`
- **Smart Model Recommendations** - Intelligent model suggestions based on agent type and capabilities
- **Automatic Backups** - Every configuration change creates a timestamped backup
- **Extensive Model Catalog** - Browse 200+ models from OpenCode, Google, Anthropic, xAI, OpenRouter
- **Easy Restore** - One-click restore to default configuration
- **Search & Filter** - Quickly find models by provider, name, or capabilities
- **Agent Information** - View detailed information about Oh My Opencode's built-in agents

## Prerequisites

- [OpenCode](https://opencode.ai) installed and configured
- Node.js (v14 or higher)
- macOS, Linux, or WSL2

## Installation

### Quick Install

```bash
# Clone the repository
git clone git@github.com:ZeroState-IO/OmO-Agent-Config.git
cd OmO-Agent-Config

# Run the installer
./install.sh
```

The installer will:
1. Copy the tool to `~/.config/opencode/bin/`
2. Make it executable
3. Link it into `~/.local/bin/` (so it can be run from anywhere)
4. Ensure `~/.local/bin` is on your PATH (in your shell rc file)
5. Create the backup directory

### Manual Installation

```bash
# Copy the tool
mkdir -p ~/.config/opencode/bin
cp bin/opencode-agent-config ~/.config/opencode/bin/
chmod +x ~/.config/opencode/bin/opencode-agent-config

# Link into a common user bin dir
mkdir -p ~/.local/bin
ln -sf ~/.config/opencode/bin/opencode-agent-config ~/.local/bin/opencode-agent-config

# Ensure ~/.local/bin is on PATH (add to your shell rc file)
export PATH="$HOME/.local/bin:$PATH"

# Create backup directory
mkdir -p ~/.config/opencode/backups
```

## Usage

### Command Line Interface

Quickly manage configurations from the command line:

```bash
# Interactive mode (default)
opencode-agent-config

# Quick switch to a configuration
opencode-agent-config -s work-config
opencode-agent-config --switch omo-default

# List all configurations
opencode-agent-config -l
opencode-agent-config --list

# Show current active configuration
opencode-agent-config -c
opencode-agent-config --current

# Show help
opencode-agent-config -h
opencode-agent-config --help
```

### Main Menu

Global scope example:

```
======================================================================
Oh My Opencode - Agent Configuration
======================================================================

Scope: Global
Active Configuration: work-config
Description: Work setup
Modified: 12/23/2025

CURRENT AGENTS:

  1. oracle                    → opencode/gpt-5.2
  2. sisyphus                  → google/claude-opus-4-5-thinking
  3. librarian                 → google/claude-sonnet-4-5
  4. frontend-ui-ux-engineer   → google/gemini-3-pro-high
  5. document-writer           → google/gemini-3-flash
  6. multimodal-looker         → google/gemini-3-flash

ACTIONS:

  [E] Edit agent model
  [D] Delete agent
  [?] Show agent information
  [P] Set preferred providers
  [M] Manage configurations
  [R] Restore defaults
  [B] View backups
  [Q] Quit

Capabilities: [R]=Reasoning [I]=Image [P]=PDF
Managing OmO built-in agents only (see [?] for custom agents)
```

### Workflow Examples

#### Change an Agent's Model

1. Press `E` to edit
2. Enter the agent name (e.g., `oracle`)
3. View recommended models ranked by suitability
4. Select a model or press `S` to search all models
5. Confirm your selection

#### Show Agent Information

1. Press `?` to view agent info
2. See all Oh My Opencode built-in agents with:
   - Description and purpose
   - Preferred capabilities
   - Minimum context requirements
3. Note about custom agent creation (see `docs/CUSTOM-AGENTS.md`)

#### Restore Default Configuration

1. Press `R` to restore
2. Confirm with `yes`
3. All agents revert to default models

## Agent Profiles

The tool includes intelligent recommendations for different agent types:

| Agent | Purpose | Recommended Capabilities |
|-------|---------|-------------------------|
| **oracle** | Strategic reasoning & complex problem solving | Reasoning, Large context (128K+) |
| **sisyphus** | Extended thinking for multi-step tasks | Reasoning, Thinking models, Large context |
| **librarian** | Research & knowledge retrieval | Large context, Fast performance |
| **frontend-ui-ux-engineer** | UI/UX with visual understanding | Multimodal, Image input |
| **document-writer** | Fast text generation | Speed, Text output |
| **multimodal-looker** | Visual analysis & PDF understanding | Multimodal, Image/PDF input |

## Model Capabilities Legend

When browsing models, you'll see these capability indicators:

- **R** - Reasoning capable
- **I** - Image input support
- **P** - PDF input support
- **Context size** - Displayed as "128K", "200K", etc.

Example:
```
1. Claude Opus 4.5 Thinking (200K[R]) ⭐ (current)
2. Gemini 3 Pro High (1048K[RIP])
3. GPT-5.2 (200K[R])
```

## Project Mode (per-repo config)

If you run the tool inside a Git repository and a project config exists at:

```
<repo-root>/.opencode/oh-my-opencode.json
```

the tool will open it in **Project scope** and show:
- Repo name
- Repo root path
- The exact config file being edited

To create a project config from one of your saved global configurations:
- Main menu → **[M] Manage configurations** → **[C] Copy configuration into this project**

Note: `.opencode/oh-my-opencode.jsonc` has higher priority in Oh My OpenCode. This tool currently edits project configs only in `.json`.

## Configuration Files

### Tool Location

Primary install path:
```
~/.config/opencode/bin/opencode-agent-config
```

Convenience link (recommended in PATH):
```
~/.local/bin/opencode-agent-config
```

### Configuration File
```
~/.config/opencode/oh-my-opencode.json
```

This is the file Oh My Opencode reads for agent configuration.

### Backup Location
```
~/.config/opencode/backups/oh-my-opencode-YYYY-MM-DD-HHMMSS.json
```

Backups are automatically created before every configuration change.

## API Keys / Portability

This repo does **not** ship API keys.

If you enable the Exa MCP (`websearch_exa`), you have two portable options:

1) Environment variable:
```bash
export EXA_API_KEY="..."
```

2) File-based secret (recommended if you want to back up a single directory):
```
~/.config/opencode/secrets/exa_api_key
```

This tool can set either placeholder in the MCP URL (`{env:EXA_API_KEY}` or `{file:...}`), depending on your preference.

For OpenCode MCP servers defined in `~/.config/opencode/opencode.json`, this tool also supports migrating inline `mcp.*.environment` secrets into `~/.config/opencode/secrets/*` and replacing them with `{file:...}` placeholders (one-dir backup friendly).

## Default Agent Configuration

The tool includes these defaults for easy restoration:

```json
{
  "agents": {
    "oracle": {
      "model": "opencode/gpt-5.2"
    },
    "sisyphus": {
      "model": "google/claude-opus-4-5-thinking"
    },
    "librarian": {
      "model": "google/claude-sonnet-4-5"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/gemini-3-pro-high"
    },
    "document-writer": {
      "model": "google/gemini-3-flash"
    },
    "multimodal-looker": {
      "model": "google/gemini-3-flash"
    }
  }
}
```

## Troubleshooting

### Tool won't start

Ensure it's executable:
```bash
chmod +x ~/.config/opencode/bin/opencode-agent-config
```

### Can't find models

Verify OpenCode is installed:
```bash
opencode models
```

### Command not found

Add to your PATH manually:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

Or run directly:
```bash
~/.local/bin/opencode-agent-config
```

### Restore a backup manually

```bash
cp ~/.config/opencode/backups/oh-my-opencode-2025-12-24-123000.json \
   ~/.config/opencode/oh-my-opencode.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Oh My Opencode](https://github.com/opencode-ai/oh-my-opencode) - The agent framework this tool configures
- [OpenCode](https://opencode.ai) - The AI coding assistant

## Support

If you encounter issues or have questions:

- Open an issue on [GitHub](https://github.com/ZeroState-IO/OmO-Agent-Config/issues)
- Check the [documentation](docs/)

---

Made with ❤️ for the Oh My Opencode community
