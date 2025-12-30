#!/bin/bash

set -e

TOOL_NAME="opencode-agent-config"

INSTALL_DIR="$HOME/.config/opencode/bin"
LIB_DIR="$HOME/.config/opencode/lib"
BACKUP_DIR="$HOME/.config/opencode/backups"

USER_BIN_DIR="$HOME/.local/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================================================"
echo "OmO Agent Config - Installation"
echo "========================================================================"
echo ""

detect_shell() {
    case "${SHELL:-}" in
        */zsh)
            echo "zsh"
            ;;
        */bash)
            echo "bash"
            ;;
        */fish)
            echo "fish"
            ;;
        *)
            echo "shell"
            ;;
    esac
}

SHELL_NAME="$(detect_shell)"

if [ "$SHELL_NAME" = "zsh" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ "$SHELL_NAME" = "bash" ]; then
    if [ -f "$HOME/.bashrc" ] || [ ! -f "$HOME/.bash_profile" ]; then
        SHELL_RC="$HOME/.bashrc"
    else
        SHELL_RC="$HOME/.bash_profile"
    fi
elif [ "$SHELL_NAME" = "fish" ]; then
    SHELL_RC="$HOME/.config/fish/config.fish"
else
    SHELL_RC="$HOME/.profile"
fi

echo "Detected login shell: $SHELL_NAME"
echo "Shell RC file: $SHELL_RC"
echo ""

echo "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LIB_DIR/ui"
mkdir -p "$BACKUP_DIR"
mkdir -p "$USER_BIN_DIR"
echo "✓ Created $INSTALL_DIR"
echo "✓ Created $LIB_DIR"
echo "✓ Created $BACKUP_DIR"
echo "✓ Created $USER_BIN_DIR"
echo ""

echo "Installing modules..."
cp "$SCRIPT_DIR/lib/constants.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/config-manager.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/model-loader.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/validation.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/upstream.js" "$LIB_DIR/"
cp "$SCRIPT_DIR/lib/ui/prompts.js" "$LIB_DIR/ui/"
cp "$SCRIPT_DIR/lib/ui/menus.js" "$LIB_DIR/ui/"
echo "✓ Installed lib modules to $LIB_DIR"
echo ""

echo "Installing entry point..."
cp "$SCRIPT_DIR/bin/$TOOL_NAME" "$INSTALL_DIR/$TOOL_NAME"
chmod +x "$INSTALL_DIR/$TOOL_NAME"
echo "✓ Installed $TOOL_NAME to $INSTALL_DIR"

echo "Linking command into $USER_BIN_DIR..."
ln -sf "$INSTALL_DIR/$TOOL_NAME" "$USER_BIN_DIR/$TOOL_NAME"
echo "✓ Linked $TOOL_NAME to $USER_BIN_DIR"
echo ""

if [ "$SHELL_NAME" = "fish" ]; then
    if grep -q "\.local/bin" "$SHELL_RC" 2>/dev/null; then
        echo "✓ Tool path already in $SHELL_RC"
    else
        echo "Adding tool to PATH..."
        mkdir -p "$(dirname "$SHELL_RC")"
        echo "" >> "$SHELL_RC"
        echo "set -gx PATH \$HOME/.local/bin \$PATH" >> "$SHELL_RC"
        echo "✓ Added to $SHELL_RC"
    fi
else
    if grep -q "\.local/bin" "$SHELL_RC" 2>/dev/null; then
        echo "✓ Tool path already in $SHELL_RC"
    else
        echo "Adding tool to PATH..."
        echo "" >> "$SHELL_RC"
        echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$SHELL_RC"
        echo "✓ Added to $SHELL_RC"
    fi
fi

if [ -x "$USER_BIN_DIR/$TOOL_NAME" ]; then
    echo "✓ Command installed: $USER_BIN_DIR/$TOOL_NAME"
else
    echo "Warning: command not executable: $USER_BIN_DIR/$TOOL_NAME"
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
echo "  $USER_BIN_DIR/$TOOL_NAME"
echo ""
echo "Documentation:"
echo "  - README: $SCRIPT_DIR/README.md"
echo "  - Docs: $SCRIPT_DIR/docs/"
echo ""
