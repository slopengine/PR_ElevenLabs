/**
 * ElevenLabs Voiceover Plugin — Main Entry Point
 * Professional onboarding flow, persistent config, and polished UX.
 */

const { elevenLabsAPI } = require('./js/elevenlabs-api');
const { premiereBridge } = require('./js/premiere-bridge');
const fs = require('uxp').storage.localFileSystem;

// ─── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  API_KEY: 'elevenlabs_api_key',
  LAST_VOICE: 'elevenlabs_last_voice',
  LAST_MODEL: 'elevenlabs_last_model',
  STABILITY: 'elevenlabs_stability',
  CLARITY: 'elevenlabs_clarity',
  OUTPUT_FORMAT: 'elevenlabs_output_format',
  AUTO_INSERT: 'elevenlabs_auto_insert',
  AUDIO_TRACK: 'elevenlabs_audio_track',
  HISTORY: 'elevenlabs_history',
};

const CHAR_LIMIT = 5000;

// ─── State ──────────────────────────────────────────────────────────────────
let currentScreen = 'setup';
let lastAudioBuffer = null;
let lastAudioPath = null;
let history = [];
let voicesCache = [];
let isGenerating = false;
let settingsOpen = false;

// ─── DOM — Setup Screen ────────────────────────────────────────────────────
const setupScreen = document.getElementById('setupScreen');
const mainScreen = document.getElementById('mainScreen');
const setupApiKey = document.getElementById('setupApiKey');
const connectBtn = document.getElementById('connectBtn');
const setupFeedback = document.getElementById('setupFeedback');
const openElevenLabs = document.getElementById('openElevenLabs');

// ─── DOM — Main Screen ─────────────────────────────────────────────────────
const settingsBtn = document.getElementById('settingsBtn');
const settingsDropdown = document.getElementById('settingsDropdown');
const disconnectBtn = document.getElementById('disconnectBtn');
const refreshVoicesBtn = document.getElementById('refreshVoicesBtn');
const voiceSelect = document.getElementById('voiceSelect');
const previewVoiceBtn = document.getElementById('previewVoiceBtn');
const modelSelect = document.getElementById('modelSelect');
const stabilitySlider = document.getElementById('stability');
const stabilityValue = document.getElementById('stabilityValue');
const claritySlider = document.getElementById('clarity');
const clarityValue = document.getElementById('clarityValue');
const scriptText = document.getElementById('scriptText');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const generateBtnText = document.getElementById('generateBtnText');
const outputFormat = document.getElementById('outputFormat');
const autoInsert = document.getElementById('autoInsert');
const audioTrack = document.getElementById('audioTrack');
const statusBar = document.getElementById('statusBar');
const statusSpinner = document.getElementById('statusSpinner');
const statusText = document.getElementById('statusText');
const statusDismiss = document.getElementById('statusDismiss');
const audioPreview = document.getElementById('audioPreview');
const playBtn = document.getElementById('playBtn');
const insertBtn = document.getElementById('insertBtn');
const historyList = document.getElementById('historyList');


// ═══════════════════════════════════════════════════════════════════════════
// SCREEN TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════

function switchScreen(screenName) {
  currentScreen = screenName;
  setupScreen.classList.toggle('active', screenName === 'setup');
  mainScreen.classList.toggle('active', screenName === 'main');
}


// ═══════════════════════════════════════════════════════════════════════════
// SETUP SCREEN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

// Enable Connect button when key has sufficient length
setupApiKey.addEventListener('input', () => {
  const key = setupApiKey.value.trim();
  connectBtn.disabled = key.length < 10;
  // Clear previous feedback
  setupFeedback.textContent = '';
  setupFeedback.className = 'setup-feedback';
});

// Handle Enter key on input
setupApiKey.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !connectBtn.disabled) {
    connectBtn.click();
  }
});

// Connect button — validate key with API
connectBtn.addEventListener('click', async () => {
  const key = setupApiKey.value.trim();
  if (!key || key.length < 10) return;

  // Enter loading state
  connectBtn.classList.add('loading');
  connectBtn.disabled = true;
  setupFeedback.textContent = '';
  setupFeedback.className = 'setup-feedback';

  try {
    // Set key and validate by fetching user subscription
    elevenLabsAPI.setApiKey(key);
    const sub = await elevenLabsAPI.getSubscription();

    // Success — save key and transition
    saveToStorage(STORAGE_KEYS.API_KEY, key);
    setupFeedback.textContent = `✓ Connected as ${sub.tier || 'ElevenLabs user'}`;
    setupFeedback.className = 'setup-feedback success';

    // Brief pause to show success, then transition
    setTimeout(async () => {
      switchScreen('main');
      await initMainScreen();
    }, 600);

  } catch (err) {
    // Handle specific error types
    let message = 'Connection failed. Please check your API key.';
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      message = 'Invalid API key. Please double-check and try again.';
    } else if (err.message.includes('fetch') || err.message.includes('network')) {
      message = 'Network error. Check your internet connection.';
    } else if (err.message.includes('429')) {
      message = 'Rate limited. Please wait a moment and try again.';
    }
    setupFeedback.textContent = message;
    setupFeedback.className = 'setup-feedback error';
  } finally {
    connectBtn.classList.remove('loading');
    connectBtn.disabled = setupApiKey.value.trim().length < 10;
  }
});

// Open ElevenLabs website
openElevenLabs.addEventListener('click', () => {
  try {
    const { shell } = require('uxp');
    shell.openExternal('https://elevenlabs.io/app/settings/api-keys');
  } catch {
    // Fallback — just a hint
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN — SETTINGS DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════

settingsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsOpen = !settingsOpen;
  settingsDropdown.classList.toggle('visible', settingsOpen);
});

// Close dropdown on outside click
document.addEventListener('click', () => {
  if (settingsOpen) {
    settingsOpen = false;
    settingsDropdown.classList.remove('visible');
  }
});

settingsDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Disconnect
disconnectBtn.addEventListener('click', () => {
  settingsOpen = false;
  settingsDropdown.classList.remove('visible');

  // Clear stored key
  removeFromStorage(STORAGE_KEYS.API_KEY);
  elevenLabsAPI.setApiKey('');
  voicesCache = [];

  // Reset setup screen
  setupApiKey.value = '';
  connectBtn.disabled = true;
  setupFeedback.textContent = '';
  setupFeedback.className = 'setup-feedback';

  // Switch back to setup
  switchScreen('setup');
  hideStatus();
});

// Refresh Voices
refreshVoicesBtn.addEventListener('click', async () => {
  settingsOpen = false;
  settingsDropdown.classList.remove('visible');
  await loadVoices();
});


// ═══════════════════════════════════════════════════════════════════════════
// VOICE LOADING & SELECTION
// ═══════════════════════════════════════════════════════════════════════════

async function loadVoices() {
  voiceSelect.disabled = true;
  voiceSelect.innerHTML = '<option value="">Loading voices...</option>';
  voiceSelect.classList.add('loading');
  previewVoiceBtn.disabled = true;

  try {
    showStatus('Loading voices from your account...', 'info', true);
    const voices = await elevenLabsAPI.getVoices();
    voicesCache = voices;

    voiceSelect.innerHTML = '';
    voiceSelect.classList.remove('loading');

    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">No voices available</option>';
      hideStatus();
      return;
    }

    // Group by category
    const categoryOrder = ['cloned', 'professional', 'premade', 'generated', 'other'];
    const categoryLabels = {
      cloned: '🎤 Cloned Voices',
      professional: '⭐ Professional',
      premade: '📦 Premade',
      generated: '🔧 Generated',
      other: '📂 Other',
    };

    const grouped = {};
    voices.forEach(v => {
      const cat = v.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(v);
    });

    // Sort each group alphabetically
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    // Build dropdown with optgroups
    const orderedCats = categoryOrder.filter(c => grouped[c]);
    // Add any remaining categories not in our order
    Object.keys(grouped).forEach(c => {
      if (!orderedCats.includes(c)) orderedCats.push(c);
    });

    for (const cat of orderedCats) {
      const voiceList = grouped[cat];
      if (!voiceList || voiceList.length === 0) continue;

      const group = document.createElement('optgroup');
      group.label = categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);

      voiceList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voice_id;

        // Build display name with labels
        let displayName = v.name;
        if (v.labels) {
          const tags = Object.values(v.labels).filter(Boolean);
          if (tags.length > 0) {
            displayName += ` — ${tags.slice(0, 3).join(', ')}`;
          }
        }
        opt.textContent = displayName;
        opt.dataset.previewUrl = v.preview_url || '';
        group.appendChild(opt);
      });

      voiceSelect.appendChild(group);
    }

    voiceSelect.disabled = false;

    // Restore last-used voice
    const lastVoice = loadFromStorage(STORAGE_KEYS.LAST_VOICE);
    if (lastVoice) {
      const exists = Array.from(voiceSelect.options).some(o => o.value === lastVoice);
      if (exists) {
        voiceSelect.value = lastVoice;
      }
    }

    updatePreviewButton();
    hideStatus();
    updateGenerateButton();

  } catch (err) {
    voiceSelect.classList.remove('loading');
    voiceSelect.innerHTML = '<option value="">Failed to load voices</option>';

    let message = `Failed to load voices: ${err.message}`;
    if (err.message.includes('401')) {
      message = 'API key is invalid or expired. Please reconnect.';
    }
    showStatus(message, 'error');
  }
}

// Voice change — save selection and update preview
voiceSelect.addEventListener('change', () => {
  saveToStorage(STORAGE_KEYS.LAST_VOICE, voiceSelect.value);
  updatePreviewButton();
  updateGenerateButton();
});

// Preview voice sample
previewVoiceBtn.addEventListener('click', async () => {
  const selected = voiceSelect.options[voiceSelect.selectedIndex];
  const previewUrl = selected?.dataset?.previewUrl;
  if (!previewUrl) return;

  try {
    previewVoiceBtn.disabled = true;
    showStatus('Playing voice preview...', 'info', true);

    // Fetch the preview audio
    const response = await fetch(previewUrl);
    if (!response.ok) throw new Error('Preview not available');

    const audioData = await response.arrayBuffer();

    // Save to temp and play via shell
    const tempFolder = await fs.getTemporaryFolder();
    const tempFile = await tempFolder.createFile('voice_preview.mp3', { overwrite: true });
    await tempFile.write(new Uint8Array(audioData), { format: 'binary' });

    const { shell } = require('uxp');
    await shell.openPath(tempFile.nativePath);
    hideStatus();
  } catch (err) {
    showStatus('Could not play preview', 'warning');
  } finally {
    previewVoiceBtn.disabled = false;
  }
});

function updatePreviewButton() {
  const selected = voiceSelect.options[voiceSelect.selectedIndex];
  const hasPreview = selected?.dataset?.previewUrl && selected.dataset.previewUrl !== '';
  previewVoiceBtn.disabled = !hasPreview;
}


// ═══════════════════════════════════════════════════════════════════════════
// MODEL & VOICE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

modelSelect.addEventListener('change', () => {
  saveToStorage(STORAGE_KEYS.LAST_MODEL, modelSelect.value);
});

stabilitySlider.addEventListener('input', () => {
  stabilityValue.textContent = `${stabilitySlider.value}%`;
  saveToStorage(STORAGE_KEYS.STABILITY, stabilitySlider.value);
});

claritySlider.addEventListener('input', () => {
  clarityValue.textContent = `${claritySlider.value}%`;
  saveToStorage(STORAGE_KEYS.CLARITY, claritySlider.value);
});

outputFormat.addEventListener('change', () => {
  saveToStorage(STORAGE_KEYS.OUTPUT_FORMAT, outputFormat.value);
});

autoInsert.addEventListener('change', () => {
  saveToStorage(STORAGE_KEYS.AUTO_INSERT, autoInsert.checked ? '1' : '0');
  document.getElementById('trackRow').style.display = autoInsert.checked ? 'flex' : 'none';
});

audioTrack.addEventListener('change', () => {
  saveToStorage(STORAGE_KEYS.AUDIO_TRACK, audioTrack.value);
});


// ═══════════════════════════════════════════════════════════════════════════
// SCRIPT TEXT & CHARACTER COUNT
// ═══════════════════════════════════════════════════════════════════════════

scriptText.addEventListener('input', () => {
  const len = scriptText.value.length;
  charCount.textContent = `${len.toLocaleString()} / ${CHAR_LIMIT.toLocaleString()}`;

  // Color coding
  if (len >= CHAR_LIMIT) {
    charCount.className = 'char-count limit';
  } else if (len >= CHAR_LIMIT * 0.9) {
    charCount.className = 'char-count warn';
  } else {
    charCount.className = 'char-count';
  }

  updateGenerateButton();
});


// ═══════════════════════════════════════════════════════════════════════════
// GENERATE BUTTON
// ═══════════════════════════════════════════════════════════════════════════

function updateGenerateButton() {
  const hasVoice = voiceSelect.value !== '';
  const hasText = scriptText.value.trim().length > 0;
  generateBtn.disabled = !(hasVoice && hasText) || isGenerating;
}

generateBtn.addEventListener('click', async () => {
  const text = scriptText.value.trim();
  const voiceId = voiceSelect.value;
  if (!text || !voiceId || isGenerating) return;

  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.classList.add('generating');
  generateBtnText.textContent = 'Generating...';
  audioPreview.classList.remove('visible');

  try {
    // Step 1: Generate speech
    showStatus('Generating speech...', 'info', true);

    const audioBuffer = await elevenLabsAPI.generateSpeech({
      text,
      voiceId,
      modelId: modelSelect.value,
      stability: stabilitySlider.value / 100,
      similarityBoost: claritySlider.value / 100,
      outputFormat: outputFormat.value,
    });

    lastAudioBuffer = audioBuffer;

    // Step 2: Save to file
    showStatus('Saving audio file...', 'info', true);

    const ext = outputFormat.value.startsWith('pcm') ? 'wav' : 'mp3';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const voiceName = (voiceSelect.options[voiceSelect.selectedIndex]?.text || 'voice').split(' — ')[0].trim();
    const fileName = `VO_${sanitizeFilename(voiceName)}_${timestamp}.${ext}`;

    let savePath = null;

    try {
      const projectPath = await premiereBridge.getProjectPath();
      if (projectPath) {
        const voDir = `${projectPath}/Voiceovers`;
        try {
          await fs.getEntryForUrl(`file://${voDir}`);
        } catch {
          const projectFolder = await fs.getEntryForUrl(`file://${projectPath}`);
          await projectFolder.createFolder('Voiceovers');
        }
        savePath = `${voDir}/${fileName}`;
      }
    } catch {
      // Fallback: ask user for save location
      try {
        const file = await fs.getFileForSaving(fileName, {
          types: [ext === 'mp3' ? 'audio/mpeg' : 'audio/wav'],
        });
        if (file) savePath = file.nativePath;
      } catch {
        // Ignore
      }
    }

    if (!savePath) {
      throw new Error('No save location available. Please open a Premiere Pro project.');
    }

    // Write audio data
    const fileEntry = await fs.getEntryForUrl(`file://${savePath}`);
    await fileEntry.write(new Uint8Array(audioBuffer), { format: 'binary' });
    lastAudioPath = savePath;

    // Step 3: Import into timeline
    if (autoInsert.checked) {
      showStatus('Importing to timeline...', 'info', true);
      const trackIndex = parseInt(audioTrack.value, 10);
      await premiereBridge.importAndInsert(savePath, trackIndex);
      showStatus('✓ Voiceover added to timeline', 'success');
    } else {
      showStatus('✓ Audio saved successfully', 'success');
    }

    // Show preview controls
    audioPreview.classList.add('visible');

    // Add to history
    addToHistory(text, voiceName, savePath);

    // Auto-dismiss success after 4s
    setTimeout(() => {
      if (statusBar.classList.contains('success')) hideStatus();
    }, 4000);

  } catch (err) {
    let message = err.message;
    if (message.includes('quota') || message.includes('limit')) {
      message = 'Character quota exceeded. Check your ElevenLabs plan.';
    } else if (message.includes('401')) {
      message = 'API key expired or invalid. Please reconnect.';
    } else if (message.includes('429')) {
      message = 'Rate limited by ElevenLabs. Wait a moment and retry.';
    }
    showStatus(`Error: ${message}`, 'error');
    console.error('Generation error:', err);
  } finally {
    isGenerating = false;
    generateBtn.classList.remove('generating');
    generateBtnText.textContent = 'Generate Voiceover';
    updateGenerateButton();
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// AUDIO PREVIEW
// ═══════════════════════════════════════════════════════════════════════════

playBtn.addEventListener('click', async () => {
  if (!lastAudioPath) return;
  try {
    const { shell } = require('uxp');
    await shell.openPath(lastAudioPath);
  } catch (err) {
    showStatus(`Playback error: ${err.message}`, 'error');
  }
});

insertBtn.addEventListener('click', async () => {
  if (!lastAudioPath) return;
  try {
    showStatus('Inserting into timeline...', 'info', true);
    const trackIndex = parseInt(audioTrack.value, 10);
    await premiereBridge.importAndInsert(lastAudioPath, trackIndex);
    showStatus('✓ Inserted into timeline', 'success');
    setTimeout(() => {
      if (statusBar.classList.contains('success')) hideStatus();
    }, 3000);
  } catch (err) {
    showStatus(`Insert error: ${err.message}`, 'error');
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// STATUS BAR
// ═══════════════════════════════════════════════════════════════════════════

function showStatus(message, type = 'info', showSpinner = false) {
  statusBar.className = `status-bar visible ${type}`;
  statusText.textContent = message;
  statusSpinner.style.display = showSpinner ? 'block' : 'none';
  statusDismiss.style.display = showSpinner ? 'none' : 'block';
}

function hideStatus() {
  statusBar.className = 'status-bar';
}

statusDismiss.addEventListener('click', hideStatus);


// ═══════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════

function addToHistory(text, voiceName, filePath) {
  const entry = {
    text: text.length > 60 ? text.slice(0, 60) + '…' : text,
    voice: voiceName,
    path: filePath,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  history.unshift(entry);
  if (history.length > 20) history.pop();

  // Persist history
  try {
    saveToStorage(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch { /* ignore */ }

  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No generations yet</div>';
    return;
  }

  historyList.innerHTML = history.map((item, i) => `
    <div class="history-item" data-index="${i}" title="${item.voice} — ${item.time}\n${item.path || ''}">
      <span class="text-preview">🎙 ${escapeHtml(item.text)}</span>
      <span class="history-meta">${escapeHtml(item.voice)}<br/>${item.time}</span>
    </div>
  `).join('');

  // Click to re-insert
  historyList.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', async () => {
      const idx = parseInt(el.dataset.index, 10);
      const item = history[idx];
      if (!item?.path) return;

      try {
        showStatus('Inserting into timeline...', 'info', true);
        const trackIndex = parseInt(audioTrack.value, 10);
        await premiereBridge.importAndInsert(item.path, trackIndex);
        showStatus('✓ Inserted into timeline', 'success');
        setTimeout(() => {
          if (statusBar.classList.contains('success')) hideStatus();
        }, 3000);
      } catch (err) {
        showStatus(`Error: ${err.message}`, 'error');
      }
    });
  });
}


// ═══════════════════════════════════════════════════════════════════════════
// AUDIO TRACKS
// ═══════════════════════════════════════════════════════════════════════════

async function loadAudioTracks() {
  try {
    const tracks = await premiereBridge.getAudioTracks();
    if (tracks.length > 0) {
      audioTrack.innerHTML = tracks.map(t =>
        `<option value="${t.index}">${escapeHtml(t.name)}</option>`
      ).join('');
    }
  } catch {
    // Use defaults
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function saveToStorage(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function loadFromStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function removeFromStorage(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}


// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 30);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ═══════════════════════════════════════════════════════════════════════════
// RESTORE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

function restoreSettings() {
  // Model
  const savedModel = loadFromStorage(STORAGE_KEYS.LAST_MODEL);
  if (savedModel) {
    const exists = Array.from(modelSelect.options).some(o => o.value === savedModel);
    if (exists) modelSelect.value = savedModel;
  }

  // Stability
  const savedStability = loadFromStorage(STORAGE_KEYS.STABILITY);
  if (savedStability !== null) {
    stabilitySlider.value = savedStability;
    stabilityValue.textContent = `${savedStability}%`;
  }

  // Clarity
  const savedClarity = loadFromStorage(STORAGE_KEYS.CLARITY);
  if (savedClarity !== null) {
    claritySlider.value = savedClarity;
    clarityValue.textContent = `${savedClarity}%`;
  }

  // Output format
  const savedFormat = loadFromStorage(STORAGE_KEYS.OUTPUT_FORMAT);
  if (savedFormat) {
    const exists = Array.from(outputFormat.options).some(o => o.value === savedFormat);
    if (exists) outputFormat.value = savedFormat;
  }

  // Auto-insert
  const savedAutoInsert = loadFromStorage(STORAGE_KEYS.AUTO_INSERT);
  if (savedAutoInsert !== null) {
    autoInsert.checked = savedAutoInsert === '1';
    document.getElementById('trackRow').style.display = autoInsert.checked ? 'flex' : 'none';
  }

  // Audio track
  const savedTrack = loadFromStorage(STORAGE_KEYS.AUDIO_TRACK);
  if (savedTrack !== null) {
    const exists = Array.from(audioTrack.options).some(o => o.value === savedTrack);
    if (exists) audioTrack.value = savedTrack;
  }

  // History
  try {
    const savedHistory = loadFromStorage(STORAGE_KEYS.HISTORY);
    if (savedHistory) {
      history = JSON.parse(savedHistory);
      renderHistory();
    }
  } catch { /* ignore */ }
}


// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function initMainScreen() {
  restoreSettings();
  await Promise.all([
    loadVoices(),
    loadAudioTracks(),
  ]);
}

async function init() {
  // Check for saved API key
  const savedKey = loadFromStorage(STORAGE_KEYS.API_KEY);

  if (savedKey && savedKey.length >= 10) {
    // We have a saved key — validate it silently
    elevenLabsAPI.setApiKey(savedKey);

    try {
      // Quick validation
      await elevenLabsAPI.getSubscription();
      // Key is valid — go straight to main screen
      switchScreen('main');
      await initMainScreen();
    } catch {
      // Key is no longer valid — clear it and show setup
      removeFromStorage(STORAGE_KEYS.API_KEY);
      switchScreen('setup');
    }
  } else {
    // No saved key — show setup
    switchScreen('setup');
  }
}

// Panel lifecycle hooks for UXP
const entrypoints = require('uxp').entrypoints;
entrypoints.setup({
  panels: {
    elevenLabsPanel: {
      show() {
        init();
      },
      hide() {
        // Cleanup if needed
      },
    },
  },
});
