#!/bin/bash

set -e

TOOL_NAME="opencode-agent-config"
INSTALL_DIR="$HOME/.config/opencode/bin"
LIB_DIR="$HOME/.config/opencode/lib"
BACKUP_DIR="$HOME/.config/opencode/backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================================================"
echo "OmO Agent Config - Installation"
echo "========================================================================"
echo ""

if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    SHELL_RC="$HOME/.profile"
    SHELL_NAME="shell"
fi

echo "Detected shell: $SHELL_NAME"
echo "Shell RC file: $SHELL_RC"
echo ""

echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LIB_DIR/ui"
mkdir -p "$BACKUP_DIR"
echo "✓ Created $INSTALL_DIR"
echo "✓ Created $LIB_DIR"
echo "✓ Created $BACKUP_DIR"
echo ""

echo "Installing modules..."
cp "$SCRIPT_DIR/lib/constants.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/config-manager.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/model-loader.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/validation.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/ui/prompts.js" "$LIB_DIR/ui/"
cp "$SCRIPT_DIR/lib/ui/menus.js" "$LIB_DIR/ui/"
echo "✓ Installed lib modules to $LIB_DIR"
echo ""

echo "Installing entry point..."
cp "$SCRIPT_DIR/bin/$TOOL_NAME" "$INSTALL_DIR/$TOOL_NAME"
chmod +x "$INSTALL_DIR/$TOOL_NAME"
echo "✓ Installed $TOOL_NAME to $INSTALL_DIR"
echo ""

if grep -q "opencode/bin" "$SHELL_RC" 2>/dev/null; then
    echo "✓ Tool path already in $SHELL_RC"
else
    echo "Adding tool to PATH..."
    echo "" >> "$SHELL_RC"
    echo "# OmO Agent Config - OpenCode agent configuration tool" >> "$SHELL_RC"
    echo "export PATH=\"\$HOME/.config/opencode/bin:\$PATH\"" >> "$SHELL_RC"
    echo "✓ Added to $SHELL_RC"
fi

echo ""
echo "========================================================================"
echo "Installation Complete!"
echo "========================================================================"
echo ""
echo "To start using the tool:"
echo ""
echo "  1. Reload your shell:"
echo "     source $SHELL_RC"
echo ""
echo "  2. Run the tool:"
echo "     $TOOL_NAME"
echo ""
echo "Or run directly without reloading:"
echo "  $INSTALL_DIR/$TOOL_NAME"
echo ""
echo "Documentation:"
echo "  - README: $SCRIPT_DIR/README.md"
echo "  - Docs: $SCRIPT_DIR/docs/"
echo ""
