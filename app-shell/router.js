/**
 * MANYA PREP HUB - UNIVERSAL ENGINE ROUTER
 * Maps JSON 'engineType' strings to their physical JS module files.
 */

export const ManyaRouter = {
    // THE ENGINE REGISTRY
    registry: {
        // --- 1. MATH ENGINES ---
        'SET_THEORY': './js/engines/math-engines/set-theory-engine.js',
        'MATH_STUDY': './js/engines/math-engines/set-study-engine.js', // Fixes the MATH_STUDY crash
        'VENN_PROB_ENGINE': './js/engines/math-engines/venn-prob-engine.js', // Fixes the VENN crash
        'SUBSET_GAME': './js/engines/math-engines/subset-game-engine.js',
        'PIZZA_GAME': './js/engines/math-engines/pizza-game-engine.js',
        'BINARY_GAME': './js/engines/math-engines/binary-generator-engine.js',
        'VENN_SPOTLIGHT': './js/engines/math-engines/venn-spotlight-engine.js',
        'SET_CLASSIFIER': './js/engines/math-engines/set-classifier-engine.js',

        // --- 2. SCIENCE ENGINES (Based on your tree structure) ---
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
        'FUNCTIONAL_COMPOSER': './js/engines/english-engines/functional_composer.js'
    },

    /**
     * Dynamically imports and RENDERS the engine
     */
    async loadInline(engineType, data, container) {
        const path = this.registry[engineType];

        if (!path) {
            console.error(`🚨 Manya Router Error: Engine ${engineType} not registered.`);
            container.innerHTML = `<div style="padding:20px; color:red; font-weight:bold;">Error: Engine ${engineType} not found in Registry.</div>`;
            return;
        }

        try {
            // 1. Import
            const module = await import(path);
            const Engine = module.default || Object.values(module)[0];

            if (!Engine) throw new Error(`Module loaded from ${path} but no object was exported.`);

            // 2. SMART AUTO-RENDER (RELAXED LOGIC)
            // We check if the function exists on the engine, regardless of JSON "mode" tags.
            
            if (typeof Engine.renderLabeling === 'function') {
                console.log(`🚀 Launching ${engineType} (Labeling/Interactive)`);
                Engine.renderLabeling(container, data);
            } 
            else if (typeof Engine.renderStudy === 'function') {
                console.log(`📖 Launching ${engineType} (Study/Reading)`);
                Engine.renderStudy(container, data);
            } 
            else if (typeof Engine.render === 'function') {
                Engine.render(container, data);
            } 
            else if (typeof Engine.init === 'function') {
                Engine.init(container, data);
            } 
            else {
                console.error("❌ Engine loaded but has no known render method (renderLabeling, renderStudy, render, or init):", Engine);
                container.innerHTML = `<div style="padding:20px;">Technical Error: Engine ${engineType} has no render method.</div>`;
            }

        } catch (err) {
            console.error(`🚨 Failed to load/render engine at ${path}`, err);
            container.innerHTML = `<div style="padding:20px; color:red;">Failed to load lesson module.<br><small>${err.message}</small></div>`;
        }
    }
};