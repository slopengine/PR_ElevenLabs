# PR_ElevenLabs — Premiere Pro Voiceover Extension (CEP)

Generate ElevenLabs voiceovers directly inside Adobe Premiere Pro and insert them straight into your timeline.

## Features

- 🎙 **Text-to-Speech** — Type your script, pick a voice, generate
- 📥 **Auto-Import** — Audio drops directly into your timeline at the playhead
- 🔐 **One-time Setup** — Enter your API key once, validated and saved securely
- 🎛 **Voice Controls** — Stability, clarity, model selection
- 🗂 **Grouped Voices** — Cloned, professional, premade — all organized
- 🔊 **Voice Preview** — Listen to voice samples before generating
- 📁 **Organized** — Files saved in a `Voiceovers` folder in your project
- 🕐 **History** — Re-insert previous generations with one click
- 💾 **Persistent Settings** — All preferences remembered between sessions

## Requirements

- **Adobe Premiere Pro 13.0+** (CC 2019 or later with CEP 12 support)
- **ElevenLabs API Key** — [Get one here](https://elevenlabs.io/app/settings/api-keys)

## Installation (Development)

### 1. Enable Debug Mode

CEP extensions require debug mode to be enabled during development.

**macOS:**
```bash
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

**Windows:**
Open Registry Editor and set:
```
HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.12\PlayerDebugMode = 1
```

> After setting this, restart Premiere Pro.

### 2. Install the Extension

Copy or symlink this folder to your CEP extensions directory:

**macOS:**
```bash
# Symlink (recommended for development)
ln -s /path/to/PR_ElevenLabs ~/Library/Application\ Support/Adobe/CEP/extensions/com.slopengine.elevenlabs

# Or copy
cp -r /path/to/PR_ElevenLabs ~/Library/Application\ Support/Adobe/CEP/extensions/com.slopengine.elevenlabs
```

**Windows:**
```cmd
:: Symlink (recommended for development)
mklink /D "%APPDATA%\Adobe\CEP\extensions\com.slopengine.elevenlabs" "C:\path\to\PR_ElevenLabs"

:: Or copy
xcopy /E /I "C:\path\to\PR_ElevenLabs" "%APPDATA%\Adobe\CEP\extensions\com.slopengine.elevenlabs"
```

### 3. Open in Premiere Pro

1. Restart Premiere Pro
2. Go to **Window → Extensions → ElevenLabs Voiceover**

### 4. Debugging

Open Chrome and navigate to `http://localhost:8088` to debug the panel using Chrome DevTools.

## Installation (Production — ZXP)

### Build the ZXP Package

ZXP files are signed ZIP files. Use [ZXPSignCmd](https://github.com/nicklassandell/zxp-sign-cmd) or Adobe's official tool.

```bash
# Create a self-signed certificate
ZXPSignCmd -selfSignedCert US CA "Slop Engine" "Slop Engine" password123 cert.p12

# Package the extension
ZXPSignCmd -sign PR_ElevenLabs elevenlabs-voiceover.zxp cert.p12 password123
```

### Install the ZXP

Use one of these tools:
- [Anastasiy's Extension Manager](https://install.anastasiy.com/) — Recommended
- [ZXP Installer](https://zxpinstaller.com/)
- Adobe Extension Manager (legacy)

Or for unsigned development, ZIP the folder and rename to `.zxp`.

## Usage

### First Time Setup
1. Open the plugin panel in Premiere Pro (**Window → Extensions → ElevenLabs Voiceover**)
2. Paste your ElevenLabs API key
3. Click **Connect** — the key is validated against the API
4. On success, you're taken to the main interface

### Generating Voiceovers
1. Select a voice from the grouped dropdown (cloned, professional, premade)
2. Optionally preview the voice with the play button
3. Choose your model (Multilingual v2, Turbo v2.5, etc.)
4. Adjust stability and clarity sliders
5. Type or paste your voiceover script
6. Click **Generate Voiceover**
7. Audio is generated, saved, and optionally inserted into your timeline at the playhead

### Settings
- Click the ⚙️ gear icon to disconnect your API key or refresh voices
- Output format, auto-insert, and track selection in collapsible Output Settings
- All preferences are saved automatically

## Project Structure

```
PR_ElevenLabs/
├── CSXS/
│   └── manifest.xml           # CEP extension manifest
├── client/
│   ├── index.html             # Panel UI (setup + main screens)
│   ├── index.js               # Main panel logic (CEP/CSInterface)
│   ├── css/
│   │   └── styles.css         # Premiere Pro dark theme
│   ├── js/
│   │   ├── elevenlabs-api.js  # ElevenLabs API client (fetch-based)
│   │   └── CSInterface.js     # Adobe CEP bridge library (v12)
│   └── icons/
│       └── icon.png           # Panel icon (48x48)
├── host/
│   └── index.jsx              # ExtendScript — Premiere Pro automation
├── .debug                     # Debug config (Chrome DevTools on port 8088)
└── README.md
```

## Architecture

### Panel (client/) — Chromium-based
- Runs in CEP's embedded Chromium browser
- Has access to Node.js (`require('fs')`, `require('path')`, etc.)
- Uses `fetch()` for ElevenLabs API calls
- Communicates with ExtendScript via `CSInterface.evalScript()`

### Host (host/index.jsx) — ExtendScript
- Runs inside Premiere Pro's scripting engine
- Has full access to Premiere Pro's DOM (`app.project`, `app.project.activeSequence`, etc.)
- Handles: importing files, creating bins, inserting clips into timeline
- Functions are called from the panel via CSInterface

### Communication Flow
```
Panel JS → csInterface.evalScript('importAndInsert("/path/to/audio.mp3", 0)') → ExtendScript
ExtendScript → JSON.stringify({success: true, name: "VO_voice_2024.mp3"}) → Panel JS callback
```

## Models

| Model | Speed | Quality | Languages |
|-------|-------|---------|-----------|
| Multilingual v2 | Normal | Best | 29 languages |
| Turbo v2.5 | Fast | Great | 32 languages |
| Turbo v2 | Fastest | Good | English |
| English v1 | Normal | Good | English only |

## API Key Security

Your API key is stored in the panel's `localStorage` (sandboxed per extension). It is only ever sent to `api.elevenlabs.io` — never to any other server.

## Troubleshooting

### Extension doesn't appear in Window → Extensions
- Make sure `PlayerDebugMode` is set (see Installation above)
- Verify the extension folder is in the correct CEP extensions directory
- Restart Premiere Pro completely

### "EvalScript error" when generating
- Make sure a project is open with an active sequence
- Check Chrome DevTools at `http://localhost:8088` for errors

### Audio imports but doesn't insert into timeline
- Ensure you have an active sequence (open a sequence in the timeline)
- Check that the target audio track exists

## License

MIT
