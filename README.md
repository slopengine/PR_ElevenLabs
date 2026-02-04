# PR_ElevenLabs — Premiere Pro Voiceover Plugin

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

- **Adobe Premiere Pro 25.6+** (UXP support required)
- **ElevenLabs API Key** — [Get one here](https://elevenlabs.io/app/settings/api-keys)
- **UXP Developer Tool (UDT)** — For loading during development

## Installation (Development)

1. Install the [UXP Developer Tool](https://developer.adobe.com/premiere-pro/uxp/introduction/) from Creative Cloud
2. Open UDT → **Add Plugin** → Select this folder
3. Click **Load** to install in Premiere Pro
4. Find the panel: **Window → Extensions → ElevenLabs Voiceover**

## Installation (Production)

Package as a `.ccx` file for distribution:

```bash
uxp package ./PR_ElevenLabs -o elevenlabs-voiceover.ccx
```

## Usage

### First Time Setup
1. Open the plugin panel in Premiere Pro
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
7. Audio is generated, saved, and optionally inserted into your timeline

### Settings
- Click the ⚙️ gear icon to disconnect your API key or refresh voices
- Output format, auto-insert, and track selection in collapsible Output Settings
- All preferences are saved automatically

## Project Structure

```
PR_ElevenLabs/
├── manifest.json          # UXP plugin manifest (v5)
├── index.html             # Panel UI with setup/main screens
├── index.js               # Main logic, onboarding, state management
├── css/
│   └── styles.css         # Premiere Pro dark theme, transitions
├── js/
│   ├── elevenlabs-api.js  # ElevenLabs API client
│   └── premiere-bridge.js # Premiere Pro timeline integration
├── icons/
│   └── icon.png           # Panel icon (24x24)
└── README.md
```

## Models

| Model | Speed | Quality | Languages |
|-------|-------|---------|-----------|
| Multilingual v2 | Normal | Best | 29 languages |
| Turbo v2.5 | Fast | Great | 32 languages |
| Turbo v2 | Fastest | Good | English |
| English v1 | Normal | Good | English only |

## API Key Security

Your API key is stored in the plugin's localStorage (same sandboxed storage as browser localStorage in UXP). It is only ever sent to `api.elevenlabs.io` — never to any other server.

## License

MIT
