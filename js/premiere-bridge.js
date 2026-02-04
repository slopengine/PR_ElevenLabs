/**
 * Premiere Pro Bridge
 * Handles importing audio files into the project and inserting into the timeline.
 *
 * Uses the official Premiere Pro UXP API (v25.0+).
 *
 * Key API classes used:
 *   - Project:         getActiveProject, importFiles, getRootItem, getActiveSequence, executeTransaction
 *   - FolderItem:      createBinAction, getItems, cast
 *   - ProjectItem:     cast, getId, name
 *   - SequenceEditor:  getEditor, createInsertProjectItemAction, createOverwriteItemAction
 *   - Sequence:        getPlayerPosition, getAudioTrack, getAudioTrackCount
 *   - TickTime:        createWithSeconds
 *
 * Docs: https://developer.adobe.com/premiere-pro/uxp/ppro_reference/classes/
 */

const premierepro = require('premierepro');

class PremiereBridge {

  // ─── Bin Management ──────────────────────────────────────────────────────

  /**
   * Find a child bin (folder) by name inside a parent folder.
   * @param {FolderItem} parentFolder
   * @param {string} name
   * @returns {Promise<FolderItem|null>}
   */
  async _findBinByName(parentFolder, name) {
    const items = await parentFolder.getItems();
    for (const item of items) {
      if (item.name === name) {
        // Attempt to cast to FolderItem — will succeed only for bins
        try {
          const folder = premierepro.FolderItem.cast(item);
          if (folder) return folder;
        } catch {
          // Not a folder/bin, skip
        }
      }
    }
    return null;
  }

  /**
   * Find or create a "Voiceovers" bin in the project root.
   * The bin is created via an undoable transaction.
   * @returns {Promise<FolderItem|null>}
   */
  async getOrCreateVoiceoverBin() {
    const project = await premierepro.Project.getActiveProject();
    if (!project) {
      throw new Error('No active project found. Please open a project first.');
    }

    const rootItem = await project.getRootItem();

    // Check for existing bin
    let bin = await this._findBinByName(rootItem, 'Voiceovers');
    if (bin) return bin;

    // Create the bin inside an undoable transaction
    project.executeTransaction((compoundAction) => {
      const action = rootItem.createBinAction('Voiceovers', true);
      compoundAction.addAction(action);
    }, 'Create Voiceovers Bin');

    // Re-query to obtain a reference to the new bin
    bin = await this._findBinByName(rootItem, 'Voiceovers');
    return bin;
  }


  // ─── Import ──────────────────────────────────────────────────────────────

  /**
   * Import a media file into the project's "Voiceovers" bin.
   *
   * Because project.importFiles() returns only a boolean (not the imported items),
   * we diff the bin contents before/after to locate the new ProjectItem.
   *
   * @param {string} filePath — Absolute path to the audio file on disk
   * @returns {Promise<ProjectItem|null>} The newly imported ProjectItem, or null
   */
  async importFile(filePath) {
    const project = await premierepro.Project.getActiveProject();
    if (!project) {
      throw new Error('No active project found. Please open a project first.');
    }

    // Resolve target bin (Voiceovers folder, or root as fallback)
    let voiceoverBin = null;
    try {
      voiceoverBin = await this.getOrCreateVoiceoverBin();
    } catch (err) {
      console.warn('PremiereBridge: Could not create Voiceovers bin, importing to root.', err.message);
    }

    const searchFolder = voiceoverBin || (await project.getRootItem());
    const targetBinForImport = voiceoverBin
      ? premierepro.ProjectItem.cast(voiceoverBin)
      : undefined;

    // Snapshot existing items so we can diff after import
    const beforeItems = await searchFolder.getItems();
    const beforeIds = new Set();
    for (const item of beforeItems) {
      try { beforeIds.add(item.getId()); } catch { beforeIds.add(item.name + '_' + beforeItems.indexOf(item)); }
    }

    // Import — correct parameter order: (filePaths, suppressUI, targetBin, asNumberedStills)
    const success = await project.importFiles(
      [filePath],
      true,                  // suppressUI
      targetBinForImport,    // targetBin (undefined → root)
      false                  // asNumberedStills
    );

    if (!success) {
      throw new Error('Premiere Pro rejected the import. Check that the file exists and is a supported format.');
    }

    // Find the newly imported item by diffing IDs
    const afterItems = await searchFolder.getItems();

    for (const item of afterItems) {
      let id;
      try { id = item.getId(); } catch { id = null; }
      if (id && !beforeIds.has(id)) {
        return item;
      }
    }

    // Fallback: match by filename (Premiere strips the extension for the item name)
    const baseFilename = filePath.split(/[/\\]/).pop().replace(/\.\w+$/, '');
    for (const item of afterItems) {
      if (item.name === baseFilename) {
        return item;
      }
    }

    // Last resort: return the last item if count increased
    if (afterItems.length > beforeItems.length) {
      return afterItems[afterItems.length - 1];
    }

    return null;
  }


  // ─── Timeline Insertion ──────────────────────────────────────────────────

  /**
   * Insert a ProjectItem into the active sequence at the current playhead position.
   *
   * Uses SequenceEditor.createInsertProjectItemAction(), executed inside
   * an undoable transaction so the user can Ctrl+Z to undo.
   *
   * @param {ProjectItem} projectItem — The item to insert
   * @param {number} [audioTrackIndex=0] — Target audio track (0-based)
   */
  async insertIntoTimeline(projectItem, audioTrackIndex = 0) {
    const project = await premierepro.Project.getActiveProject();
    if (!project) {
      throw new Error('No active project found.');
    }

    const sequence = await project.getActiveSequence();
    if (!sequence) {
      throw new Error('No active sequence. Please open a sequence in the timeline first.');
    }

    // Clamp track index to a valid range
    const trackCount = await sequence.getAudioTrackCount();
    const safeTrackIndex = Math.min(audioTrackIndex, Math.max(trackCount - 1, 0));

    // Current playhead position
    const playerPosition = await sequence.getPlayerPosition();

    // Build the insert action via SequenceEditor
    const editor = premierepro.SequenceEditor.getEditor(sequence);
    const insertAction = editor.createInsertProjectItemAction(
      projectItem,
      playerPosition,
      0,               // videoTrackIndex (irrelevant for audio-only media)
      safeTrackIndex,   // audioTrackIndex
      false             // limitShift — allow existing clips to shift
    );

    // Execute as an undoable transaction
    project.executeTransaction((compoundAction) => {
      compoundAction.addAction(insertAction);
    }, 'Insert Voiceover');
  }


  // ─── Combined Convenience ────────────────────────────────────────────────

  /**
   * Import a file into the project and insert it into the timeline.
   * @param {string} filePath — Absolute path to the audio file
   * @param {number} [audioTrackIndex=0] — Target audio track
   * @returns {Promise<ProjectItem>} The imported ProjectItem
   */
  async importAndInsert(filePath, audioTrackIndex = 0) {
    const projectItem = await this.importFile(filePath);
    if (!projectItem) {
      throw new Error(
        'File was imported but could not be located in the project panel. ' +
        'Look for it in the Voiceovers bin.'
      );
    }
    await this.insertIntoTimeline(projectItem, audioTrackIndex);
    return projectItem;
  }


  // ─── Audio Track Info ────────────────────────────────────────────────────

  /**
   * List audio tracks in the active sequence.
   * @returns {Promise<Array<{index: number, name: string}>>}
   */
  async getAudioTracks() {
    try {
      const project = await premierepro.Project.getActiveProject();
      if (!project) return [];

      const sequence = await project.getActiveSequence();
      if (!sequence) return [];

      const trackCount = await sequence.getAudioTrackCount();
      const tracks = [];
      for (let i = 0; i < trackCount; i++) {
        const track = await sequence.getAudioTrack(i);
        tracks.push({
          index: i,
          name: track.name || `Audio ${i + 1}`,
        });
      }
      return tracks;
    } catch (err) {
      console.warn('PremiereBridge: Could not list audio tracks.', err.message);
      return [];
    }
  }


  // ─── Project Path ────────────────────────────────────────────────────────

  /**
   * Get the directory containing the active project file.
   * Used for saving generated audio alongside the project.
   * @returns {Promise<string|null>}
   */
  async getProjectPath() {
    try {
      const project = await premierepro.Project.getActiveProject();
      if (!project) return null;

      const projectPath = project.path;
      if (!projectPath) return null;

      const lastSlash = Math.max(
        projectPath.lastIndexOf('/'),
        projectPath.lastIndexOf('\\')
      );
      return lastSlash > 0 ? projectPath.substring(0, lastSlash) : null;
    } catch {
      return null;
    }
  }
}

const premiereBridge = new PremiereBridge();
module.exports = { premiereBridge, PremiereBridge };
