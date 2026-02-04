/**
 * ElevenLabs Voiceover Plugin - Main Entry Point
 * Connects the UI, ElevenLabs API, and Premiere Pro bridge.
 */

const { elevenLabsAPI } = require('./js/elevenlabs-api');
const { premiereBridge } = require('./js/premiere-bridge');
const fs = require('uxp').storage.localFileSystem;

// ─── State ──────────────────────────────────────────────────────────────────
let lastAudioBuffer = null;
let lastAudioPath = null;
let history = [];

// ─── DOM Elements ───────────────────────────────────────────────────────────
const apiKeyInput = document.getElementById('apiKey');
const toggleKeyBtn = document.getElementById('toggleKeyVisibility');
const voiceSelect = document.getElementById('voiceSelect');
const modelSelect = document.getElementById('modelSelect');
const stabilitySlider = document.getElementById('stability');
const stabilityValue = document.getElementById('stabilityValue');
const claritySlider = document.getElementById('clarity');
const clarityValue = document.getElementById('clarityValue');
const outputFormat = document.getElementById('outputFormat');
const autoInsert = document.getElementById('autoInsert');
const audioTrack = document.getElementById('audioTrack');
const scriptText = document.getElementById('scriptText');
const charCount = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const statusBar = document.getElementById('statusBar');
const statusSpinner = document.getElementById('statusSpinner');
const statusText = document.getElementById('statusText');
const audioPreview = document.getElementById('audioPreview');
const playBtn = document.getElementById('playBtn');
const insertBtn = document.getElementById('insertBtn');
const historyList = document.getElementById('historyList');

// ─── Status Helpers ─────────────────────────────────────────────────────────
function showStatus(message, type = 'info', showSpinner = false) {
  statusBar.className = `status-bar visible ${type}`;
  statusText.textContent = message;
  statusSpinner.style.display = showSpinner ? 'block' : 'none';
}

function hideStatus() {
  statusBar.className = 'status-bar';
}

function updateGenerateButton() {
  const hasKey = apiKeyInput.value.trim().length > 0;
  const hasVoice = voiceSelect.value !== '';
  const hasText = scriptText.value.trim().length > 0;
  generateBtn.disabled = !(hasKey && hasVoice && hasText);
}

// ─── API Key ────────────────────────────────────────────────────────────────
let keyVisible = false;
toggleKeyBtn.addEventListener('click', () => {
  keyVisible = !keyVisible;
  apiKeyInput.type = keyVisible ? 'text' : 'password';
  toggleKeyBtn.textContent = keyVisible ? '🔒' : '👁';
});

// Load voices when API key is entered
let keyDebounce = null;
apiKeyInput.addEventListener('input', () => {
  clearTimeout(keyDebounce);
  keyDebounce = setTimeout(async () => {
    const key = apiKeyInput.value.trim();
    if (key.length < 10) return;

    elevenLabsAPI.setApiKey(key);
    await loadVoices();

    // Persist API key (simple localStorage)
    try {
      localStorage.setItem('elevenlabs_api_key', key);
    } catch (e) {
      // ignore storage errors
    }
  }, 500);
});

async function loadVoices() {
  try {
    showStatus('Loading voices...', 'info', true);
    const voices = await elevenLabsAPI.getVoices();

    voiceSelect.innerHTML = '';
    voiceSelect.disabled = false;

    // Group by category
    const categories = {};
    voices.forEach(v => {
      const cat = v.category || 'other';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(v);
    });

    // Add grouped options
    for (const [cat, voiceList] of Object.entries(categories)) {
      const group = document.createElement('optgroup');
      group.label = cat.charAt(0).toUpperCase() + cat.slice(1);
      voiceList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voice_id;
        opt.textContent = v.name;
        if (v.labels) {
          const tags = Object.values(v.labels).filter(Boolean).join(', ');
          if (tags) opt.textContent += ` (${tags})`;
        }
        group.appendChild(opt);
      });
      voiceSelect.appendChild(group);
    }

    hideStatus();
    updateGenerateButton();
  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    voiceSelect.innerHTML = '<option value="">Failed to load voices</option>';
    voiceSelect.disabled = true;
  }
}

// ─── Voice Settings ─────────────────────────────────────────────────────────
stabilitySlider.addEventListener('input', () => {
  stabilityValue.textContent = `${stabilitySlider.value}%`;
});

claritySlider.addEventListener('input', () => {
  clarityValue.textContent = `${claritySlider.value}%`;
});

// ─── Script Text ────────────────────────────────────────────────────────────
scriptText.addEventListener('input', () => {
  const len = scriptText.value.length;
  charCount.textContent = `${len} char${len !== 1 ? 's' : ''}`;
  updateGenerateButton();
});

voiceSelect.addEventListener('change', updateGenerateButton);

// ─── Generate ───────────────────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  const text = scriptText.value.trim();
  const voiceId = voiceSelect.value;

  if (!text || !voiceId) return;

  generateBtn.disabled = true;
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
    const voiceName = voiceSelect.options[voiceSelect.selectedIndex]?.text?.split(' (')[0] || 'voice';
    const fileName = `VO_${voiceName}_${timestamp}.${ext}`;

    // Save to project directory or temp
    let savePath;
    try {
      const projectPath = await premiereBridge.getProjectPath();
      if (projectPath) {
        const voDir = `${projectPath}/Voiceovers`;
        // Ensure directory exists
        try {
          const folder = await fs.getEntryForUrl(`file://${voDir}`);
          savePath = `${voDir}/${fileName}`;
        } catch {
          // Create the directory
          const projectFolder = await fs.getEntryForUrl(`file://${projectPath}`);
          await projectFolder.createFolder('Voiceovers');
          savePath = `${voDir}/${fileName}`;
        }
      }
    } catch {
      // Fallback: ask user for save location
      const file = await fs.getFileForSaving(fileName, {
        types: [ext === 'mp3' ? 'audio/mpeg' : 'audio/wav'],
      });
      if (file) {
        savePath = file.nativePath;
      }
    }

    if (!savePath) {
      throw new Error('No save location available');
    }

    // Write the audio data
    const fileEntry = await fs.getEntryForUrl(`file://${savePath}`);
    await fileEntry.write(new Uint8Array(audioBuffer), { format: 'binary' });
    lastAudioPath = savePath;

    // Step 3: Import into Premiere
    if (autoInsert.checked) {
      showStatus('Importing to timeline...', 'info', true);
      const trackIndex = parseInt(audioTrack.value, 10);
      await premiereBridge.importAndInsert(savePath, trackIndex);
      showStatus('✓ Voiceover added to timeline!', 'success');
    } else {
      showStatus('✓ Audio saved! Click "Insert" to add to timeline.', 'success');
    }

    // Show preview controls
    audioPreview.classList.add('visible');

    // Add to history
    addToHistory(text, voiceName, savePath);

  } catch (err) {
    showStatus(`Error: ${err.message}`, 'error');
    console.error('Generation error:', err);
  } finally {
    updateGenerateButton();
  }
});

// ─── Audio Preview ──────────────────────────────────────────────────────────
playBtn.addEventListener('click', async () => {
  if (!lastAudioPath) return;
  try {
    // UXP doesn't have Audio API - open in system player
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
    showStatus('✓ Inserted into timeline!', 'success');
  } catch (err) {
    showStatus(`Insert error: ${err.message}`, 'error');
  }
});

// ─── History ────────────────────────────────────────────────────────────────
function addToHistory(text, voiceName, filePath) {
  const entry = {
    text: text.length > 50 ? text.slice(0, 50) + '...' : text,
    voice: voiceName,
    path: filePath,
    time: new Date().toLocaleTimeString(),
  };

  history.unshift(entry);
  if (history.length > 20) history.pop();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = `
      <div class="history-item" style="color: var(--text-placeholder); cursor: default;">
        No generations yet
      </div>`;
    return;
  }

  historyList.innerHTML = history.map((item, i) => `
    <div class="history-item" data-index="${i}" title="${item.path}">
      <span class="text-preview">🎙 ${item.text}</span>
      <span class="duration">${item.voice} · ${item.time}</span>
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
        showStatus('✓ Inserted into timeline!', 'success');
      } catch (err) {
        showStatus(`Error: ${err.message}`, 'error');
      }
    });
  });
}

// ─── Load Audio Tracks ──────────────────────────────────────────────────────
async function loadAudioTracks() {
  try {
    const tracks = await premiereBridge.getAudioTracks();
    if (tracks.length > 0) {
      audioTrack.innerHTML = tracks.map(t =>
        `<option value="${t.index}">${t.name}</option>`
      ).join('');
    }
  } catch {
    // Use defaults
  }
}

// ─── Init ───────────────────────────────────────────────────────────────────
async function init() {
  // Restore API key
  try {
    const savedKey = localStorage.getItem('elevenlabs_api_key');
    if (savedKey) {
      apiKeyInput.value = savedKey;
      elevenLabsAPI.setApiKey(savedKey);
      await loadVoices();
    }
  } catch {
    // ignore
  }

  // Load audio tracks
  await loadAudioTracks();
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
