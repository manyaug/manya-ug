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
        '2D_HOTSPOT': './js/engines/image-hotspots-engine.js',
        'GALLERY_STUDY': './js/engines/gallery-study-engine.js',
        'READER_STUDY': './js/engines/reader-study-engine.js',
        'MCQ_STANDALONE': './js/engines/mcq-standalone.js',

        // --- 3. SST ENGINES ---
        'GLOBE_TIME_ENGINE': './js/engines/sst-engines/universal-globe-engine.js',

        // --- 4. ENGLISH ENGINES ---
        'CHAT': './js/engines/english-engines/chat_engine.js',
        'ENGLISH_RULE_MASTER': './js/engines/english-engines/english_rule_master.js',
        'SYNTAX_ARCHITECT': './js/engines/english-engines/syntax-architect.js',
        'HARVEST_GAME': './js/engines/english-engines/game-harvest-engine.js',
        'MEMORY_MATCH': './js/engines/english-engines/game-memory-match.js',
        'GRAMMAR_MAZE': './js/engines/english-engines/game-grammar-maze.js',
        'HANGMAN_GAME': './js/engines/english-engines/game-hangman.js',
        'SENTENCE_TRAIN': './js/engines/english-engines/game-sentence-train.js',
        'WORDGRID_ENGINE': './js/engines/english-engines/game-wordgrid.js',
        'MORPH_GAME': './js/engines/english-engines/morph_game.js',
        'DEEP_READER': './js/engines/english-engines/deep_reader.js',
        'FUNCTIONAL_COMPOSER': './js/engines/english-engines/functional_composer.js',
        'HANGMAN_ENGINE': './js/engines/english-engines/game-hangman.js'
    },

    /**
     * Dynamically imports and RENDERS the engine
     */
    /**
     * MANYA ROUTER v3.0 - STRICT MODE ROUTING
     */
    async loadInline(engineType, data, container) {
        const path = this.registry[engineType];

        if (!path) {
            console.error(`🚨 Manya Router Error: Engine ${engineType} not registered.`);
            container.innerHTML = `<div style="padding:20px; color:red;">Error: Engine ${engineType} not found.</div>`;
            return;
        }

        try {
            const module = await import(path);
            const Engine = module.default || Object.values(module)[0];

            if (!Engine) throw new Error(`Module at ${path} is empty.`);

            // --- THE STRICT LOGIC START ---
            
            // 1. Define exactly what constitutes a "Quiz/Labeling/Puzzle" task
            const isQuiz = (
                data.mode === 'labeling' || 
                data.mode === 'quiz' || 
                data.mode === 'puzzle' ||
                !!data.wordBank || 
                !!data.interaction
            );

            // 2. Define exactly what constitutes a "Study/Simulation" task
            const isStudy = (data.mode === 'study' || data.mode === 'simulation');

            // 3. Route based on the findings
            if (isStudy && typeof Engine.renderStudy === 'function') {
                console.log(`📖 [ROUTER] Route to: renderStudy (${engineType})`);
                await Engine.renderStudy(container, data);
            } 
            else if (isQuiz && typeof Engine.renderLabeling === 'function') {
                console.log(`🚀 [ROUTER] Route to: renderLabeling (${engineType})`);
                await Engine.renderLabeling(container, data);
            } 
            else {
                // Fallback: If the JSON is missing a mode, try to find ANY working method
                console.warn(`⚠️ [ROUTER] No strict mode match for ${engineType}. Using fallback.`);
                if (typeof Engine.renderStudy === 'function') {
                    await Engine.renderStudy(container, data);
                } else if (typeof Engine.renderLabeling === 'function') {
                    await Engine.renderLabeling(container, data);
                }
            }
            // --- THE STRICT LOGIC END ---

        } catch (err) {
            console.error(`🚨 Failed to render engine at ${path}`, err);
            container.innerHTML = `<div style="padding:20px; color:red;">Failed to load module.</div>`;
        }
    }
};