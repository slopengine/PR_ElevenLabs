/**
 * Premiere Pro Bridge
 * Handles importing audio files into the project and inserting into the timeline.
 */

const premierepro = require('premierepro');

class PremiereBridge {
  /**
   * Import a media file into the active project.
   * @param {string} filePath - Full path to the audio file
   * @returns {Promise<Object>} The imported project item
   */
  async importFile(filePath) {
    const project = await premierepro.Project.getActiveProject();
    if (!project) {
      throw new Error('No active project found. Please open a project first.');
    }

    const rootItem = await project.getRootItem();
    
    // Check if a "Voiceovers" bin exists, create if not
    let voiceoverBin = null;
    const children = await rootItem.getItems();
    for (const child of children) {
      if (child.name === 'Voiceovers' && child.type === 2 /* bin */) {
        voiceoverBin = child;
        break;
      }
    }

    if (!voiceoverBin) {
      voiceoverBin = await project.createBin('Voiceovers');
    }

    // Import the file
    const importResult = await project.importFiles(
      [filePath],
      voiceoverBin,
      false // suppressUI
    );

    if (!importResult || importResult.length === 0) {
      throw new Error('Failed to import file into project');
    }

    return importResult[0];
  }

  /**
   * Insert a project item into the active sequence at the playhead.
   * @param {Object} projectItem - The project item to insert
   * @param {number} [audioTrackIndex=0] - Audio track index (0-based)
   * @returns {Promise<void>}
   */
  async insertIntoTimeline(projectItem, audioTrackIndex = 0) {
    const project = await premierepro.Project.getActiveProject();
    const sequence = await project.getActiveSequence();

    if (!sequence) {
      throw new Error('No active sequence. Please open a sequence first.');
    }

    // Get the current playhead position
    const playerPosition = sequence.getPlayerPosition();

    // Get the audio tracks
    const audioTracks = await sequence.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) {
      throw new Error('No audio tracks available in the sequence');
    }

    const targetTrack = audioTracks[Math.min(audioTrackIndex, audioTracks.length - 1)];

    // Insert the clip at the playhead position
    await targetTrack.insertClip(projectItem, playerPosition);
  }

  /**
   * Import and insert audio file in one step.
   * @param {string} filePath - Full path to the audio file
   * @param {number} [audioTrackIndex=0] - Audio track index
   * @returns {Promise<Object>} The imported project item
   */
  async importAndInsert(filePath, audioTrackIndex = 0) {
    const projectItem = await this.importFile(filePath);
    await this.insertIntoTimeline(projectItem, audioTrackIndex);
    return projectItem;
  }

  /**
   * Get available audio track names and indices.
   * @returns {Promise<Array<{index: number, name: string}>>}
   */
  async getAudioTracks() {
    const project = await premierepro.Project.getActiveProject();
    if (!project) return [];

    const sequence = await project.getActiveSequence();
    if (!sequence) return [];

    const audioTracks = await sequence.getAudioTracks();
    return audioTracks.map((track, index) => ({
      index,
      name: track.name || `Audio ${index + 1}`,
    }));
  }

  /**
   * Get the active project's location for saving audio files.
   * @returns {Promise<string>} Path to save audio files
   */
  async getProjectPath() {
    const project = await premierepro.Project.getActiveProject();
    if (!project) return null;

    const projectPath = project.path;
    // Return the directory containing the project file
    const lastSlash = Math.max(projectPath.lastIndexOf('/'), projectPath.lastIndexOf('\\'));
    return projectPath.substring(0, lastSlash);
  }
}

const premiereBridge = new PremiereBridge();
module.exports = { premiereBridge, PremiereBridge };
