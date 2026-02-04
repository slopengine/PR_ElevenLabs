# ElevenLabs Voiceover for Premiere Pro

Generate AI voiceovers directly inside Adobe Premiere Pro using [ElevenLabs](https://elevenlabs.io). Select a voice, type your script, and insert the audio straight into your timeline — no switching apps.

![ElevenLabs Voiceover Panel](https://img.shields.io/badge/Premiere_Pro-Plugin-9999FF?style=for-the-badge&logo=adobepremierepro&logoColor=white)

## Features

- 🎙️ **Text-to-Speech** — Generate voiceovers from any ElevenLabs voice
- 🎭 **All Your Voices** — Premade, cloned, professional, and generated voices grouped by category
- ⚡ **One-Click Insert** — Audio drops right into your timeline at the playhead
- 🔊 **Voice Preview** — Listen to voice samples before generating
- ⚙️ **Full Control** — Stability, clarity, model selection, output format
- 📁 **Auto-Organized** — Audio files saved to a `Voiceovers/` folder next to your project
- 📜 **Generation History** — Re-insert previous generations with one click
- 🔐 **Private** — API key stored locally, only sent to ElevenLabs servers

## Requirements

- **Adobe Premiere Pro** CC 2019 or later (CEP 10+)
- **ElevenLabs API Key** — [Get one free](https://elevenlabs.io/app/settings/api-keys)

## Installation

### Quick Install (Recommended)

1. **Download** the [latest release](https://github.com/slopengine/PR_ElevenLabs/releases/latest)
2. **Unzip** the downloaded file
3. **Run the installer:**
   - **Mac:** Double-click `install-mac.sh` (or run `bash install-mac.sh` in Terminal)
   - **Windows:** Double-click `install-win.bat`
4. **Restart** Premiere Pro
5. Go to **Window → Extensions → ElevenLabs Voiceover**

### Manual Install

<details>
<summary>Click to expand manual installation steps</summary>

**Mac:**
```bash
# Enable unsigned extensions
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1

# Copy plugin files
cp -R PR_ElevenLabs ~/Library/Application\ Support/Adobe/CEP/extensions/com.slopengine.elevenlabs
```

**Windows:**
```cmd
:: Enable unsigned extensions
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f

:: Copy plugin files
xcopy PR_ElevenLabs "%APPDATA%\Adobe\CEP\extensions\com.slopengine.elevenlabs\" /E /I /Y
```

</details>

## Usage

1. Open the panel: **Window → Extensions → ElevenLabs Voiceover**
2. Enter your ElevenLabs API key and click **Connect**
3. Select a **voice** and **model**
4. Type your script in the text area
5. Click **Generate Voiceover**
6. Audio is automatically saved and inserted into your timeline

### Output Settings

- **Format:** MP3 (128/192 kbps) or WAV (PCM 24/44.1 kHz)
- **Auto-Insert:** Toggle automatic timeline insertion on/off
- **Audio Track:** Choose which track to insert on

### Where Are Files Saved?

Audio files are saved to a `Voiceovers/` folder next to your Premiere project file. If no project is open, they save to your Desktop.

## Uninstall

- **Mac:** Run `bash uninstall-mac.sh` or delete `~/Library/Application Support/Adobe/CEP/extensions/com.slopengine.elevenlabs`
- **Windows:** Run `uninstall-win.bat` or delete `%APPDATA%\Adobe\CEP\extensions\com.slopengine.elevenlabs`

## ElevenLabs API Key Permissions

The plugin works with **any** API key permission level. For full features, enable:
- `text_to_speech` — Required for generating audio
- `voices_read` — Required for listing available voices
- `user_read` — Optional, shows subscription tier on connect

## Troubleshooting

**Plugin doesn't show in Window → Extensions:**
- Make sure you ran the installer (enables debug mode for unsigned extensions)
- Restart Premiere Pro completely (quit and reopen)
- Check the extension folder exists at the install path

**"Invalid API key" error:**
- Verify your key at [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
- Make sure the key has `text_to_speech` and `voices_read` permissions

**Audio not inserting into timeline:**
- Make sure you have a **sequence open** in the timeline
- Check that the target audio track exists

## License

MIT

## Credits

Built by [SlopEngine](https://github.com/slopengine) 🚀
Powered by [ElevenLabs](https://elevenlabs.io)
