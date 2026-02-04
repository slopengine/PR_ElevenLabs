/**
 * ElevenLabs Voiceover — ExtendScript Host (Premiere Pro)
 *
 * Runs inside Premiere Pro's scripting engine.
 * Called from the CEP panel via CSInterface.evalScript().
 *
 * Functions:
 *   importFile(filePath)                    — Import audio into Voiceovers bin
 *   importAndInsert(filePath, trackIndex)   — Import + insert at playhead
 *   getAudioTracks()                        — List audio tracks in active sequence
 *   getProjectPath()                        — Get project directory path
 */

// ─── Bin Management ────────────────────────────────────────────────────────

/**
 * Find or create a "Voiceovers" bin in the project root.
 * @returns {Object} The Voiceovers bin (ProjectItem), or null
 */
function _getOrCreateVoiceoverBin() {
    var project = app.project;
    if (!project) return null;

    var rootItem = project.rootItem;
    var voiceoverBin = null;

    // Search for existing Voiceovers bin (type 2 = bin/folder)
    for (var i = 0; i < rootItem.children.numItems; i++) {
        if (rootItem.children[i].name === "Voiceovers" && rootItem.children[i].type === 2) {
            voiceoverBin = rootItem.children[i];
            break;
        }
    }

    // Create if not found
    if (!voiceoverBin) {
        voiceoverBin = rootItem.createBin("Voiceovers");
    }

    return voiceoverBin;
}


// ─── Import ────────────────────────────────────────────────────────────────

/**
 * Import a file into the project's Voiceovers bin.
 * @param {string} filePath — Absolute path to the audio file
 * @returns {string} JSON result: {success, name} or {error}
 */
function importFile(filePath) {
    try {
        var project = app.project;
        if (!project) return JSON.stringify({error: "No active project"});

        var voiceoverBin = _getOrCreateVoiceoverBin();
        if (!voiceoverBin) return JSON.stringify({error: "Could not create Voiceovers bin"});

        // Import the file into the bin
        var success = project.importFiles([filePath], false, voiceoverBin, false);
        if (!success) return JSON.stringify({error: "Import failed — check file path and format"});

        // Find the imported item (last item in bin)
        var importedItem = voiceoverBin.children[voiceoverBin.children.numItems - 1];
        if (!importedItem) return JSON.stringify({error: "Import succeeded but item not found in bin"});

        return JSON.stringify({success: true, name: importedItem.name});

    } catch (e) {
        return JSON.stringify({error: "Import error: " + e.toString()});
    }
}


// ─── Timeline Insertion ────────────────────────────────────────────────────

/**
 * Import a file and insert it into the active timeline at the playhead position.
 * @param {string} filePath — Absolute path to the audio file
 * @param {number|string} audioTrackIndex — Target audio track (0-based)
 * @returns {string} JSON result: {success, name} or {error}
 */
function importAndInsert(filePath, audioTrackIndex) {
    try {
        var project = app.project;
        if (!project) return JSON.stringify({error: "No active project"});

        var sequence = project.activeSequence;
        if (!sequence) return JSON.stringify({error: "No active sequence — open a sequence first"});

        // Import the file first
        var importResult = JSON.parse(importFile(filePath));
        if (importResult.error) return JSON.stringify(importResult);

        // Find the imported item in Voiceovers bin
        var voiceoverBin = _getOrCreateVoiceoverBin();
        if (!voiceoverBin) return JSON.stringify({error: "Voiceovers bin not found after import"});

        var projectItem = voiceoverBin.children[voiceoverBin.children.numItems - 1];
        if (!projectItem) return JSON.stringify({error: "Could not locate imported item"});

        // Get playhead position
        var time = sequence.getPlayerPosition();

        // Parse track index, default to 0
        var trackIdx = parseInt(audioTrackIndex, 10);
        if (isNaN(trackIdx) || trackIdx < 0) trackIdx = 0;

        // Clamp to available tracks
        var trackCount = sequence.audioTracks.numTracks;
        if (trackIdx >= trackCount) trackIdx = Math.max(trackCount - 1, 0);

        // Insert into timeline
        // videoTrackIndex = -1 means no video track (audio-only)
        sequence.insertClip(projectItem, time, -1, trackIdx);

        return JSON.stringify({success: true, name: projectItem.name});

    } catch (e) {
        return JSON.stringify({error: "Insert error: " + e.toString()});
    }
}


// ─── Audio Track Info ──────────────────────────────────────────────────────

/**
 * Get audio track information from the active sequence.
 * @returns {string} JSON array of {index, name} objects
 */
function getAudioTracks() {
    try {
        var project = app.project;
        if (!project) return JSON.stringify([]);

        var sequence = project.activeSequence;
        if (!sequence) return JSON.stringify([]);

        var tracks = [];
        for (var i = 0; i < sequence.audioTracks.numTracks; i++) {
            var track = sequence.audioTracks[i];
            tracks.push({
                index: i,
                name: track.name || ("Audio " + (i + 1))
            });
        }

        return JSON.stringify(tracks);

    } catch (e) {
        return JSON.stringify([]);
    }
}


// ─── Project Path ──────────────────────────────────────────────────────────

/**
 * Get the directory containing the active project file.
 * Used for saving audio files alongside the project.
 * @returns {string} Project directory path, or empty string
 */
function getProjectPath() {
    try {
        var project = app.project;
        if (!project) return "";

        var projectPath = project.path;
        if (!projectPath) return "";

        // Strip filename, keep directory
        return projectPath.replace(/[^\/\\]*$/, "");

    } catch (e) {
        return "";
    }
}
