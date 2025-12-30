# Troubleshooting

Common issues and solutions for OmO Agent Config.

## Installation Issues

### Tool won't execute

**Problem**: `Permission denied` error when running the tool

**Solution**:
```bash
chmod +x ~/.config/opencode/bin/opencode-agent-config
```

### Command not found

**Problem**: `command not found: opencode-agent-config`

**Solution 1** - Add to PATH:
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Solution 2** - Run with full path:
```bash
~/.local/bin/opencode-agent-config
```

## Runtime Issues

### Can't load models

**Problem**: Error message "Error loading models" (or OpenCode fails when running `opencode models --verbose`)

**Possible causes**:
1. OpenCode not installed
2. OpenCode not in PATH
3. OpenCode failed to start due to a configuration/plugin error (common: `ProviderModelNotFoundError`)

**Solutions**:

Check if OpenCode is installed:
```bash
which opencode
```

Test OpenCode models command:
```bash
opencode models
```

If OpenCode isn't found, reinstall or add to PATH.

#### ProviderModelNotFoundError

**What it means**: Your config references a model id that OpenCode can't resolve under your current provider/plugin setup.
This often happens after enabling/disabling a provider, changing auth plugins, or switching configurations.

**How to recover**:
1. Identify the missing model id from the error output.
2. Run this tool and re-select valid models for the affected agent(s).
   - If the model catalog can't load, use manual model-id entry.
3. If you want to keep that model, re-enable the provider that supplies it (and verify `opencode models` lists it).

**Data to collect when reporting**:
```bash
opencode --version
opencode models --verbose
```
And the `agents` section from:
- `~/.config/opencode/oh-my-opencode.json`
- and/or `.opencode/oh-my-opencode.json`

### Configuration file not found

**Problem**: "Error loading config: ENOENT: no such file or directory"

**Cause**: No Oh My Opencode configuration exists

**Solution**:

Create a minimal configuration:
```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/oh-my-opencode.json << 'EOF'
{
  "google_auth": false,
  "agents": {},
  "mcps": {}
}
EOF
```

Then run the tool and use "Restore defaults" to populate with standard agents.

### Node.js not found

**Problem**: `/usr/bin/env: 'node': No such file or directory`

**Cause**: Node.js not installed or not in PATH

**Solution**:

Install Node.js:
```bash
# macOS with Homebrew
brew install node

# Linux (Ubuntu/Debian)
sudo apt install nodejs npm

# Linux (Fedora)
sudo dnf install nodejs npm
```

Verify installation:
```bash
node --version
```

## Usage Issues

### Models not showing recommendations

**Problem**: All models have zero scores in recommendations

**Cause**: Model metadata may be incomplete or agent profile doesn't match any capabilities

**Solution**:
- Use search (press `S`) to browse all models
- Select models manually based on provider and name
- Check that `opencode models --verbose` returns proper JSON with capabilities

### Backup directory full

**Problem**: Too many backup files

**Solution**:

Clean old backups (keeping last 50):
```bash
cd ~/.config/opencode/backups
ls -t oh-my-opencode-*.json | tail -n +51 | xargs rm -f
```

Or keep last 30 days:
```bash
find ~/.config/opencode/backups -name "oh-my-opencode-*.json" -mtime +30 -delete
```

### Configuration changes not taking effect

**Problem**: Oh My Opencode not using new model assignments

**Possible causes**:
1. Need to restart OpenCode
2. Session already started with old configuration
3. Configuration file corruption

**Solutions**:

Restart OpenCode session:
```bash
# Exit current OpenCode session and start a new one
```

Verify configuration file:
```bash
cat ~/.config/opencode/oh-my-opencode.json | jq .
```

If file is corrupted, restore from backup:
```bash
cp ~/.config/opencode/backups/oh-my-opencode-YYYY-MM-DD-HHMMSS.json \
   ~/.config/opencode/oh-my-opencode.json
```

### Can't delete default agents

**Problem**: Want to remove built-in agents like "oracle"

**Solution**:

This is allowed! The tool's defaults are only used for the "Restore defaults" feature. You can delete any agent, including default ones. They can be restored later with `R`.

## Performance Issues

### Tool slow to start

**Problem**: Takes a long time to load models

**Cause**: `opencode models --verbose` returns large dataset (200+ models with metadata)

**This is normal** - The tool needs to:
1. Query OpenCode for all available models
2. Parse model metadata
3. Calculate recommendation scores

Typical load time: 3-10 seconds depending on system and model count.

**Workarounds**:
- None needed - this only happens once per session
- The delay is unavoidable as we need fresh model data

### High memory usage

**Problem**: Tool uses significant memory

**Cause**: Storing 200+ model objects with full metadata

**Solution**:

This is expected behavior. The tool:
- Loads all models once at startup
- Keeps them in memory for fast searching
- Memory usage typically 50-100MB

If this is a problem, close and restart the tool when done.

## Data Issues

### Lost configuration

**Problem**: Accidentally deleted agents or made bad changes

**Solution**:

Restore from automatic backup:
```bash
# List recent backups
ls -lt ~/.config/opencode/backups/

# Restore specific backup
cp ~/.config/opencode/backups/oh-my-opencode-YYYY-MM-DD-HHMMSS.json \
   ~/.config/opencode/oh-my-opencode.json
```

Or use the tool's restore defaults:
1. Run the tool
2. Press `R`
3. Confirm with `yes`

### Migrating MCP secrets into files

If you want a one-directory backup, you can migrate inline secrets into `~/.config/opencode/secrets/*` and replace them with `{file:...}` placeholders.

- For OpenCode MCP servers (`~/.config/opencode/opencode.json`): main menu → **[Z] Migrate OpenCode MCP secrets to files**
- For Oh My OpenCode MCP URLs (`~/.config/opencode/oh-my-opencode.json` or project `.opencode/oh-my-opencode.json`): main menu → **[V] Migrate OmO MCP URL secrets to files**

### Exa MCP not working

**Problem**: `websearch_exa` MCP fails to connect / returns auth errors

**Cause**: Missing Exa API key.

**Solution**: Set your key in the environment where you run OpenCode:

```bash
export EXA_API_KEY="..."
```

This tool writes the Exa MCP URL using `{env:EXA_API_KEY}` so configs stay portable.

### MCP configuration lost

**Problem**: MCP servers disappeared from configuration

**Cause**: Tool shouldn't modify MCPs, but if corrupted:

**Solution**:

Restore from backup or manually add MCPs back to the configuration file. The tool preserves the `mcps` section when saving.

If you need to manually edit:
```bash
nano ~/.config/opencode/oh-my-opencode.json
```

The tool never removes or modifies the `mcps` section.

## Platform-Specific Issues

### macOS: xcrun error

**Problem**: `xcrun: error: invalid active developer path`

**Cause**: Xcode command line tools not installed

**Solution**:
```bash
xcode-select --install
```

### Linux: Node permissions

**Problem**: Permission errors when running Node.js

**Solution**:

Don't use `sudo` with the tool. If Node was installed with sudo, reinstall using a version manager:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node
nvm install node
nvm use node
```

### WSL2: PATH not persisting

**Problem**: PATH changes don't persist after closing terminal

**Solution**:

Ensure you're editing the correct rc file:
```bash
# For bash
echo 'export PATH="$HOME/.config/opencode/bin:$PATH"' >> ~/.bashrc

# For zsh
echo 'export PATH="$HOME/.config/opencode/bin:$PATH"' >> ~/.zshrc
```

## Getting Help

If you encounter an issue not covered here:

1. **Check GitHub Issues**: [github.com/ZeroState-IO/OmO-Agent-Config/issues](https://github.com/ZeroState-IO/OmO-Agent-Config/issues)

2. **Open a new issue** with:
   - OS and version
   - Node.js version (`node --version`)
   - OpenCode version (`opencode --version`)
   - Error message (full output)
   - Steps to reproduce

3. **Enable debug mode** (if requested):
   ```bash
   # Add debug logging to see what's happening
   # (Feature to be added in future version)
   ```

## Emergency Recovery

If the tool is completely broken:

### 1. Backup current state
```bash
cp ~/.config/opencode/oh-my-opencode.json ~/oh-my-opencode-emergency.json
```

### 2. Manually edit configuration
```bash
nano ~/.config/opencode/oh-my-opencode.json
```

### 3. Or create fresh minimal config
```bash
cat > ~/.config/opencode/oh-my-opencode.json << 'EOF'
{
  "google_auth": false,
  "agents": {
    "oracle": {
      "model": "opencode/gpt-5.2"
    }
  },
  "mcps": {}
}
EOF
```

### 4. Reinstall tool
```bash
cd ~/path/to/OmO-Agent-Config
./install.sh
```
