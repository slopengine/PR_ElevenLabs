@echo off
set INSTALL_DIR=%APPDATA%\Adobe\CEP\extensions\com.slopengine.elevenlabs
if exist "%INSTALL_DIR%" (
    rmdir /s /q "%INSTALL_DIR%"
    echo ✓ ElevenLabs Voiceover plugin removed.
    echo   Restart Premiere Pro to complete uninstall.
) else (
    echo Plugin not found — nothing to remove.
)
pause
