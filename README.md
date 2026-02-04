# PR_ElevenLabs - Premiere Pro Voiceover Plugin

Generate ElevenLabs voiceovers directly inside Adobe Premiere Pro and import them straight into your timeline.

## Features

- 🎙 **Text-to-Speech** — Type your script, pick a voice, generate
- 📥 **Auto-Import** — Audio drops directly into your timeline at the playhead
- 🎛 **Voice Controls** — Stability, clarity, model selection
- 📁 **Organized** — Files saved in a `Voiceovers` folder in your project directory
- 🕐 **History** — Re-insert previous generations with one click

## Requirements

- **Adobe Premiere Pro 25.6+** (UXP support required)
- **ElevenLabs API Key** — [Get one here](https://elevenlabs.io)
- **UXP Developer Tool (UDT)** — For loading during development

## Installation (Development)

1. Install the [UXP Developer Tool](https://developer.adobe.com/premiere-pro/uxp/introduction/) from Creative Cloud
2. Open UDT → **Add Plugin** → Select this folder
3. Click **Load** to install in Premiere Pro
4. Find the panel: **Window → Extensions → ElevenLabs Voiceover**

## Installation (Production)

Package as a `.ccx` file for distribution:
```bash
# Using UXP Packager CLI
uxp package ./PR_ElevenLabs -o elevenlabs-voiceover.ccx
```

## Usage

1. Enter your ElevenLabs API key (saved locally, never sent anywhere except ElevenLabs)
2. Select a voice from the dropdown (loads automatically)
3. Choose your model and voice settings
4. Type your voiceover script
5. Click **Generate Voiceover**
6. Audio is generated, saved, and inserted into your timeline

## Project Structure

```
PR_ElevenLabs/
├── manifest.json          # UXP plugin manifest
├── index.html             # Panel UI
├── index.js               # Main logic & event handlers
├── css/
│   └── styles.css         # Premiere-native dark theme
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

Your API key is stored in the plugin's local storage (same as browser localStorage). It is only ever sent to `api.elevenlabs.io` — never to any other server.

## License

MIT
