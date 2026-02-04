#!/bin/bash
INSTALL_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/com.slopengine.elevenlabs"
if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo "✓ ElevenLabs Voiceover plugin removed."
    echo "  Restart Premiere Pro to complete uninstall."
else
    echo "Plugin not found — nothing to remove."
fi
