/**
 * MANYA PREP HUB - UNIVERSAL ENGINE ROUTER
 * Maps JSON 'engineType' strings to their physical JS module files.
 */

export const ManyaRouter = {
    // THE ENGINE REGISTRY
    registry: {
        // --- 1. MATH ENGINES ---
        'SET_THEORY': './js/engines/math-engines/set-theory-engine.js',
        'MATH_STUDY': './js/engines/math-engines/set-study-engine.js',
        'VENN_PROB_ENGINE': './js/engines/math-engines/venn-prob-engine.js',
        'SUBSET_GAME': './js/engines/math-engines/subset-game-engine.js',
        'PIZZA_GAME': './js/engines/math-engines/pizza-game-engine.js',
        'BINARY_GAME': './js/engines/math-engines/binary-generator-engine.js',
        'VENN_SPOTLIGHT': './js/engines/math-engines/venn-spotlight-engine.js',
        'SET_CLASSIFIER': './js/engines/math-engines/set-classifier-engine.js',

        // --- 2. SCIENCE ENGINES ---
        '3D_SKELETON': './js/engines/3D-skeleton-engine.js',
        'PROCEDURAL_CANVAS': './js/engines/procedural-canvas-engine.js',
        'IMAGE_HOTSPOTS': './js/engines/image-hotspots-engine.js',
        'GALLERY_STUDY': './js/engines/gallery-study-engine.js',
        'READER_STUDY': './js/engines/reader-study-engine.js',
        'MCQ_STANDALONE': './js/engines/mcq-standalone.js',

        // --- 3. SST ENGINES ---
        'UNIVERSAL_GLOBE': './js/engines/sst-engines/universal-globe-engine.js',

        // --- 4. ENGLISH ENGINES ---
        'CHAT_ENGINE': './js/engines/english-engines/chat_engine.js',
        'RULE_MASTER': './js/engines/english-engines/english_rule_master.js',
        'SYNTAX_ARCHITECT': './js/engines/english-engines/syntax-architect.js',
        'HARVEST_GAME': './js/engines/english-engines/game-harvest-engine.js',
        'MEMORY_MATCH': './js/engines/english-engines/game-memory-match.js',
        'GRAMMAR_MAZE': './js/engines/english-engines/game-grammar-maze.js',
        'HANGMAN_GAME': './js/engines/english-engines/game-hangman.js',
        'SENTENCE_TRAIN': './js/engines/english-engines/game-sentence-train.js',
        'WORDGRID_GAME': './js/engines/english-engines/game-wordgrid.js',
        'MORPH_GAME': './js/engines/english-engines/morph_game.js',
        'DEEP_READER': './js/engines/english-engines/deep_reader.js',
        'FUNCTIONAL_COMPOSER': './js/engines/english-engines/functional_composer.js',
        
        // --- 5. FALLBACK for UNKNOWN/NULL ---
        'UNKNOWN': './js/engines/3D-skeleton-engine.js',
        'DEFAULT': './js/engines/3D-skeleton-engine.js'
    },

    /**
     * Get the correct path for an engine type, with fallback
     */
    getEnginePath(engineType) {
        // Handle null/undefined/unknown
        if (!engineType || engineType === 'UNKNOWN' || engineType === 'NULL') {
            console.log(`⚠️ Engine type ${engineType} not found, using DEFAULT (3D-skeleton-engine)`);
            return this.registry['DEFAULT'];
        }
        
        const path = this.registry[engineType];
        if (!path) {
            console.warn(`⚠️ Engine ${engineType} not registered, falling back to DEFAULT`);
            return this.registry['DEFAULT'];
        }
        
        return path;
    },

    /**
     * Dynamically imports and RENDERS the engine
     */
    async loadInline(engineType, data, container, mode = null) {
        const path = this.getEnginePath(engineType);
        const actualEngineType = !engineType || engineType === 'UNKNOWN' ? 'DEFAULT' : engineType;

        console.log(`🎮 Loading engine: ${actualEngineType} (mode: ${mode || 'auto'})`);

        try {
            // Import the module
            const module = await import(path);
            const Engine = module.default || Object.values(module)[0];

            if (!Engine) throw new Error(`Module loaded from ${path} but no object was exported.`);

            // Determine which render method to call
            let renderMethod = null;
            
            // If mode is explicitly provided, use that
            if (mode === 'labeling' && typeof Engine.renderLabeling === 'function') {
                renderMethod = Engine.renderLabeling;
            } else if (mode === 'study' && typeof Engine.renderStudy === 'function') {
                renderMethod = Engine.renderStudy;
            } else {
                // Auto-detect based on available methods
                if (typeof Engine.renderLabeling === 'function') {
                    renderMethod = Engine.renderLabeling;
                } else if (typeof Engine.renderStudy === 'function') {
                    renderMethod = Engine.renderStudy;
                } else if (typeof Engine.render === 'function') {
                    renderMethod = Engine.render;
                } else if (typeof Engine.init === 'function') {
                    renderMethod = Engine.init;
                }
            }

            if (!renderMethod) {
                console.error("❌ Engine loaded but has no known render method:", Engine);
                container.innerHTML = `<div style="padding:20px;">Technical Error: Engine ${actualEngineType} has no render method.</div>`;
                return;
            }

            // Create a wrapper function that accepts callbacks if needed
            const renderWithCallback = (container, data) => {
                // If data has an onComplete callback, pass it through
                if (data._onComplete && typeof renderMethod === 'function') {
                    return renderMethod(container, data, data._onComplete);
                }
                return renderMethod(container, data);
            };

            // Call the render method
            await renderWithCallback(container, data);
            
            console.log(`✅ Engine ${actualEngineType} rendered successfully`);

        } catch (err) {
            console.error(`🚨 Failed to load/render engine at ${path}`, err);
            container.innerHTML = `<div style="padding:20px; color:red;">Failed to load lesson module.<br><small>${err.message}</small></div>`;
        }
    },

    /**
     * Preload an engine (optional, for performance)
     */
    async preload(engineType) {
        const path = this.getEnginePath(engineType);
        try {
            await import(path);
            console.log(`✅ Preloaded engine: ${engineType}`);
            return true;
        } catch (err) {
            console.error(`❌ Failed to preload engine: ${engineType}`, err);
            return false;
        }
    }
};

// Make router globally available
window.ManyaRouter = ManyaRouter;
console.log('✅ ManyaRouter exported to window');