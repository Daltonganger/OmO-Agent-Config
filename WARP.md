# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

OmO Agent Config is an interactive Node.js CLI tool for managing Oh My Opencode agent model assignments. It provides a user-friendly interface to configure agent models without manual JSON editing, including smart recommendations, automatic backups, and model search capabilities.

## Development Commands

### Installation
```bash
# Quick install (runs installer script)
./install.sh

# Manual installation
cp opencode-agent-config ~/.config/opencode/bin/
chmod +x ~/.config/opencode/bin/opencode-agent-config
mkdir -p ~/.config/opencode/backups
```

### Running the Tool
```bash
# Standard execution
opencode-agent-config

# Direct execution (without PATH)
./opencode-agent-config

# Run with Node directly
node opencode-agent-config
```

### Testing Changes
```bash
# Test the tool without installing
node opencode-agent-config

# After changes, reinstall
./install.sh
```

## Architecture

### Core Components

**AgentConfigTool Class** (`opencode-agent-config` lines 88-516)
- Main application controller managing the interactive CLI
- Uses Node.js `readline` for user interaction
- Loads and persists configuration via JSON files
- Fetches available models by executing `opencode models --verbose`

**Model Recommendation Engine** (lines 156-212)
- Scores models based on agent profiles using capability matching
- Considers: reasoning support, context window size, multimodal capabilities, speed characteristics
- Agent profiles define preferred model characteristics per agent type

**Configuration Management** (lines 98-243)
- Config file: `~/.config/opencode/oh-my-opencode.json`
- Automatic timestamped backups created before every change
- Backup location: `~/.config/opencode/backups/`
- Default configuration embedded in DEFAULTS constant (lines 19-52)

### Key Data Structures

**AGENT_PROFILES** (lines 55-86)
- Defines characteristics for each agent type
- Fields: `description`, `preferred` capabilities array, `minContext`
- Used by recommendation engine to score and rank models

**DEFAULTS** (lines 19-52)
- Contains default agent configurations and MCP settings
- Includes 6 predefined agents: oracle, sisyphus, librarian, frontend-ui-ux-engineer, document-writer, multimodal-looker
- Used for restore functionality

**Models Array**
- Parsed from `opencode models --verbose` output
- Structure: `{id, name, limit: {context}, capabilities: {reasoning, input: {image, pdf}, output: {text}}}`
- Loaded on startup via `loadModels()` method

**Providers Array**
- Dynamically extracted from model IDs (the prefix before `/`)
- Built by `extractProviders()` during model loading
- Used for provider filtering and preferred provider selection

### User Interface Flow

1. **Main Menu**: Lists all configured agents with current models
2. **Model Selection**: Shows recommended models ranked by suitability
3. **Model Search**: Text-based search by provider name or model name
4. **Provider Filtering**: Interactive multi-select provider filter
5. **Preferred Providers Management**: Set/clear preferred provider order
6. **Edit/Add/Delete**: CRUD operations for agent configurations
7. **Backup Viewing**: Lists recent configuration backups

### External Dependencies

**OpenCode CLI**
- Must be installed and accessible in PATH
- Used to fetch model catalog: `opencode models --verbose`
- Output is parsed to extract model IDs, names, capabilities, and context limits

**Configuration Files**
- Reads: `~/.config/opencode/oh-my-opencode.json`
- Creates backups in: `~/.config/opencode/backups/`
- Both paths are hardcoded relative to HOME directory

## Making Changes

### Adding New Agent Profiles
Edit the `AGENT_PROFILES` object (lines 55-86) to define new agent types with their preferred capabilities and minimum context requirements.

### Modifying Model Scoring
The `scoreModel()` method determines recommendation rankings. The scoring includes:
- Agent capability matching (reasoning, multimodal, etc.)
- Context window size
- Preferred provider bonus (+5 points per position in preference list)
Adjust scoring weights to change prioritization.

### Changing Default Configuration
Update the `DEFAULTS` object (lines 19-52) to modify the default agent configuration used by restore functionality.

### Updating Model Parser
If OpenCode CLI output format changes, modify `parseModels()` to correctly extract model data.

### Provider Filtering Features
- `extractProviders()`: Extracts unique provider names from model IDs
- `filterByProvider()`: Interactive multi-select provider filtering
- `setPreferredProviders()`: Manages preferred provider configuration
- Provider preferences are stored in config as `preferred_providers` array

## Important Constraints

- **Node.js Required**: Uses native Node.js modules (fs, path, readline, child_process)
- **Unix/Linux/macOS Only**: Paths and shell commands assume Unix-like environment
- **OpenCode Dependency**: Tool requires OpenCode CLI to be installed and functional
- **JSON Structure**: Config file must maintain specific structure for Oh My Opencode compatibility
- **No External NPM Dependencies**: Tool is self-contained with no package.json or external modules

## Configuration File Structure

```json
{
  "google_auth": false,
  "agents": {
    "agent-name": {
      "model": "provider/model-id"
    }
  },
  "preferred_providers": ["anthropic", "openai", "google"],
  "mcps": {
    "service-name": {
      "url": "https://...",
      "type": "remote",
      "enabled": true
    }
  }
}
```

The tool manages:
- `agents`: Agent model assignments
- `preferred_providers` (optional): Provider preference order for model recommendations

Preserved but not modified:
- `google_auth`: Authentication setting
- `mcps`: Model Context Protocol services

## Releases

### Version Management

Version is stored in the `VERSION` file. Follow semantic versioning:
- **Bugfix** (x.x.1): Bug fixes, performance improvements, documentation
- **Feature** (x.1.x): New features, new functionality
- **Major** (1.x.x): Only when explicitly requested, breaking changes

### Release Process

1. Update `VERSION` file with new version number
2. Update `CHANGELOG.md` with release notes
3. Commit: `git commit -m "Bump version to x.y.z"`
4. Tag: `git tag -a vx.y.z -m "Release vx.y.z"`
5. Push: `git push origin main && git push origin vx.y.z`
6. Create GitHub release from tag

See `RELEASES.md` for detailed instructions.
