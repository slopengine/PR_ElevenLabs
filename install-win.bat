@echo off
REM ─────────────────────────────────────────────────────────
REM ElevenLabs Voiceover — Premiere Pro Plugin Installer (Win)
REM ─────────────────────────────────────────────────────────

setlocal
set EXTENSION_ID=com.slopengine.elevenlabs
set INSTALL_DIR=%APPDATA%\Adobe\CEP\extensions\%EXTENSION_ID%
set SCRIPT_DIR=%~dp0

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║   ElevenLabs Voiceover — Premiere Pro Plugin     ║
echo ║   Installer for Windows                          ║
echo ╚══════════════════════════════════════════════════╝
echo.

REM Step 1: Enable unsigned CEP extensions
echo → Enabling CEP debug mode (required for unsigned extensions)...
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
echo   ✓ Debug mode enabled
echo.

REM Step 2: Remove old version
if exist "%INSTALL_DIR%" (
    echo → Removing previous installation...
    rmdir /s /q "%INSTALL_DIR%"
    echo   ✓ Old version removed
)

REM Step 3: Copy extension files
echo → Installing extension...
mkdir "%INSTALL_DIR%" >nul 2>&1
xcopy "%SCRIPT_DIR%CSXS" "%INSTALL_DIR%\CSXS\" /E /I /Y /Q >nul
xcopy "%SCRIPT_DIR%client" "%INSTALL_DIR%\client\" /E /I /Y /Q >nul
xcopy "%SCRIPT_DIR%host" "%INSTALL_DIR%\host\" /E /I /Y /Q >nul
if exist "%SCRIPT_DIR%icons" xcopy "%SCRIPT_DIR%icons" "%INSTALL_DIR%\icons\" /E /I /Y /Q >nul
echo   ✓ Files copied to: %INSTALL_DIR%
echo.

REM Done
echo ═══════════════════════════════════════════════════
echo   ✅ Installation complete!
echo.
echo   Next steps:
echo   1. Restart Premiere Pro (if running)
echo   2. Go to Window → Extensions → ElevenLabs Voiceover
echo   3. Enter your ElevenLabs API key to get started
echo.
echo   Get an API key at: https://elevenlabs.io/app/settings/api-keys
echo ═══════════════════════════════════════════════════
echo.
pause
