/**
 * MANYA UNIVERSAL ROUTER (v8.0)
 * Standardized registry for all subject engines.
 */
const ENGINE_REGISTRY = {
    // Math & Science
    "3D_SKELETON": "./js/engines/3D-skeleton-engine.js",
    "READER_STUDY": "./js/engines/reader-study-engine.js",
    "PROCEDURAL_CANVAS": "./js/engines/procedural-canvas-engine.js",
    "SET_THEORY": "./js/engines/math-engines/set-theory-engine.js",
    "GLOBE_TIME_ENGINE": "./js/engines/sst-engines/universal-globe-engine.js",

    // English Engines
    "CHAT": "./js/engines/english-engines/chat_engine.js",
    "SYNTAX_ENGINE": "./js/engines/english-engines/syntax-architect.js",
    "FUNCTIONAL_COMPOSER": "./js/engines/english-engines/functional_composer.js",
    "DEEP_READER": "./js/engines/english-engines/deep_reader.js",
    "ENGLISH_RULE_MASTER": "./js/engines/english-engines/english_rule_master.js",
    "HANGMAN_ENGINE": "./js/engines/english-engines/game-hangman.js",
    "WORDGRID_ENGINE": "./js/engines/english-engines/game-wordgrid.js",
    "JUNGLE_MAZE": "./js/engines/english-engines/game-grammar-maze.js",
    "SENTENCE_TRAIN": "./js/engines/english-engines/game-sentence-train.js",
    "HARVEST_GAME": "./js/engines/english-engines/game-harvest-engine.js",
    "MEMORY_MATCH": "./js/engines/english-engines/game-memory-match.js"
};

export const ManyaRouter = {
    loadInline: async (engineKey, data, mount) => {
        try {
            const enginePath = ENGINE_REGISTRY[engineKey];
            if (!enginePath) throw new Error(`Engine ${engineKey} not registered.`);

            // Dynamic Import with timestamp to prevent caching issues during development
            const module = await import(enginePath + "?v=" + Date.now());
            const engine = Object.values(module)[0]; 

            if (!engine) throw new Error(`Module at ${enginePath} does not export an engine.`);

            // Unified Render Logic
            if (engine.renderStudy && (data.mode === 'study' || engineKey.includes('READER') || engineKey === 'ENGLISH_RULE_MASTER')) {
                await engine.renderStudy(mount, data);
            } else if (engine.renderLabeling) {
                await engine.renderLabeling(mount, data);
            }
        } catch (err) {
            console.error("Manya Router Error:", err);
            mount.innerHTML = `<div style="color:red; padding:20px; text-align:center; font-weight:800;">
                <div style="font-size:2rem;">⚠️</div>
                ${engineKey} failed to load.<br>
                <small style="font-weight:400; opacity:0.7;">${err.message}</small>
            </div>`;
        }
    }
};