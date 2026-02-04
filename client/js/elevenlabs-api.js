/**
 * ElevenLabs API Client (CEP version)
 * Handles voice listing, text-to-speech generation, and subscription info.
 *
 * No module.exports — this is loaded via <script> tag in the CEP panel.
 * Uses standard fetch() API available in CEP's Chromium runtime.
 */

const API_BASE = 'https://api.elevenlabs.io/v1';

class ElevenLabsAPI {
  constructor() {
    this.apiKey = '';
    this.voices = [];
  }

  setApiKey(key) {
    this.apiKey = key;
  }

  _headers() {
    return {
      'xi-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch available voices from the API.
   * @returns {Promise<Array>} List of voice objects
   */
  async getVoices() {
    const response = await fetch(`${API_BASE}/voices`, {
      method: 'GET',
      headers: this._headers(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail?.message || `Failed to fetch voices (${response.status})`);
    }

    const data = await response.json();
    this.voices = data.voices || [];
    return this.voices;
  }

  /**
   * Get available models from the API.
   * @returns {Promise<Array>} List of model objects
   */
  async getModels() {
    const response = await fetch(`${API_BASE}/models`, {
      method: 'GET',
      headers: this._headers(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models (${response.status})`);
    }

    const models = await response.json();
    return models.filter(m => m.can_do_text_to_speech);
  }

  /**
   * Generate speech from text.
   * @param {Object} options
   * @param {string} options.text - Text to convert to speech
   * @param {string} options.voiceId - Voice ID to use
   * @param {string} [options.modelId='eleven_multilingual_v2'] - Model ID
   * @param {number} [options.stability=0.5] - Voice stability (0-1)
   * @param {number} [options.similarityBoost=0.75] - Similarity boost (0-1)
   * @param {string} [options.outputFormat='mp3_44100_128'] - Output format
   * @returns {Promise<ArrayBuffer>} Audio data as ArrayBuffer
   */
  async generateSpeech({
    text,
    voiceId,
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    outputFormat = 'mp3_44100_128',
  }) {
    if (!text || !text.trim()) {
      throw new Error('Text is required');
    }
    if (!voiceId) {
      throw new Error('Voice is required');
    }

    const response = await fetch(
      `${API_BASE}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: this._headers(),
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.detail?.message || `Speech generation failed (${response.status})`
      );
    }

    return await response.arrayBuffer();
  }

  /**
   * Get user subscription info (for quota checking and key validation).
   * @returns {Promise<Object>} Subscription info
   */
  async getSubscription() {
    const response = await fetch(`${API_BASE}/user/subscription`, {
      method: 'GET',
      headers: this._headers(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized — invalid API key (401)');
      }
      throw new Error(`Failed to fetch subscription (${response.status})`);
    }

    return await response.json();
  }

  /**
   * Validate API key by fetching voices (works with any permission level).
   * Falls back from /user/subscription to /voices if subscription requires higher perms.
   * @returns {Promise<Object>} { tier, voiceCount }
   */
  async validateKey() {
    // Try subscription endpoint first (gives us tier info)
    try {
      const sub = await this.getSubscription();
      return { tier: sub.tier || 'ElevenLabs user', voiceCount: null };
    } catch (subErr) {
      // If it's a permissions issue (not an auth issue), try voices instead
      if (subErr.message.includes('401') || subErr.message.includes('Unauthorized')) {
        // Could be truly invalid OR just missing user_read permission
        // Try voices endpoint to confirm key validity
        try {
          const voices = await this.getVoices();
          return { tier: 'ElevenLabs user', voiceCount: voices.length };
        } catch (voicesErr) {
          // If voices also fails with 401, key is truly invalid
          throw new Error('Unauthorized — invalid API key (401)');
        }
      }
      throw subErr;
    }
  }
}

// Global singleton
const elevenLabsAPI = new ElevenLabsAPI();
