#!/bin/bash
# ─────────────────────────────────────────────────────────
# ElevenLabs Voiceover — Premiere Pro Plugin Installer (Mac)
# ─────────────────────────────────────────────────────────

EXTENSION_ID="com.slopengine.elevenlabs"
INSTALL_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXTENSION_ID"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ElevenLabs Voiceover — Premiere Pro Plugin     ║"
echo "║   Installer for macOS                            ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Step 1: Enable unsigned CEP extensions (required for non-ZXP installs)
echo "→ Enabling CEP debug mode (required for unsigned extensions)..."
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
defaults write com.adobe.CSXS.10 PlayerDebugMode 1
echo "  ✓ Debug mode enabled"
echo ""

# Step 2: Remove old version if exists
if [ -d "$INSTALL_DIR" ]; then
    echo "→ Removing previous installation..."
    rm -rf "$INSTALL_DIR"
    echo "  ✓ Old version removed"
fi

# Step 3: Copy extension files
echo "→ Installing extension..."
mkdir -p "$INSTALL_DIR"
cp -R "$SCRIPT_DIR/CSXS" "$INSTALL_DIR/"
cp -R "$SCRIPT_DIR/client" "$INSTALL_DIR/"
cp -R "$SCRIPT_DIR/host" "$INSTALL_DIR/"
[ -d "$SCRIPT_DIR/icons" ] && cp -R "$SCRIPT_DIR/icons" "$INSTALL_DIR/"
echo "  ✓ Files copied to: $INSTALL_DIR"
echo ""

# Done
echo "═══════════════════════════════════════════════════"
echo "  ✅ Installation complete!"
echo ""
echo "  Next steps:"
echo "  1. Restart Premiere Pro (if running)"
echo "  2. Go to Window → Extensions → ElevenLabs Voiceover"
echo "  3. Enter your ElevenLabs API key to get started"
echo ""
echo "  Get an API key at: https://elevenlabs.io/app/settings/api-keys"
echo "═══════════════════════════════════════════════════"
echo ""
