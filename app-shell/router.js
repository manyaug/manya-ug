/**
 * MANYA UNIVERSAL ROUTER
 */
const ENGINE_REGISTRY = {
    // Relative to router.js (inside app-shell)
    "3D_SKELETON": "./js/engines/3D-skeleton-engine.js",
    "2D_HOTSPOT":  "./js/engines/image-hotspots-engine.js",
    "GALLERY_STUDY": "./js/engines/gallery-study-engine.js",
    "PROCEDURAL_CANVAS": "./js/engines/procedural-canvas-engine.js",
    "SKELETON_PUPPET": "./js/engines/skeleton-puppet-engine.js",
    "SET_THEORY": "./js/engines/math-engines/set-theory-engine.js",
    "SET_CLASSIFIER": "./js/engines/math-engines/set-classifier-engine.js",
    "SUBSET_GAME": "./js/engines/math-engines/subset-game-engine.js",
    "BINARY_GENERATOR": "./js/engines/math-engines/binary-generator-engine.js",
    "PIZZA_GAME": "./js/engines/math-engines/pizza-game-engine.js",
    "VENN_SPOTLIGHT": "./js/engines/math-engines/venn-spotlight-engine.js",
    "VENN_PROB_ENGINE": "./js/engines/math-engines/venn-prob-engine.js",
    "GLOBE_TIME_ENGINE": "./js/engines/sst-engines/universal-globe-engine.js",
    "MATH_STUDY": "./js/engines/math-engines/set-study-engine.js",
    "READER_STUDY": "./js/engines/reader-study-engine.js",
    "SYNTAX_ENGINE": "./js/engines/english-engines/syntax-architect.js",
    "FUNCTIONAL_COMPOSER": "./js/engines/english-engines/functional_composer.js",
    "DEEP_READER": "./js/engines/english-engines/deep_reader.js",
    "ENGLISH_RULE_MASTER": "./js/engines/english-engines/english_rule_master.js",
    "CHAT": "./js/engines/english-engines/chat_engine.js",
    "QUEST_RUNNER": "./js/engines/english-engines/quest_runner.js",
    "MORPH_SPEECH": "./js/engines/english-engines/morph_game.js",
    "CHAT-STANDALONE": "./js/engines/chat-engine.js",
    "MCQ_STANDALONE": "./js/engines/mcq-standalone.js"
};

export const ManyaRouter = {
    load: async (categoryPath, folder, variant, btn) => {
        const mount = document.getElementById('view-mount');
        const titleEl = document.getElementById('app-title'); 

        // UI Updates
        if(btn) {
            document.querySelectorAll('.res-chip').forEach(b => b.style.opacity = '0.6');
            btn.style.opacity = '1';
        }
        
        // Loading Spinner
        mount.innerHTML = `
            <div class="manya-loader" style="height:80vh; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div style="width:30px; height:30px; border:4px solid #e2e8f0; border-top-color:#7c3aed; border-radius:50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top:15px; font-weight:700; color:#7c3aed">Loading Engine...</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        try {
            // 1. CONSTRUCT PATH (Handle special characters)
            // encodeURIComponent fixes spaces and '&' symbols in folder names
            const cleanCategory = categoryPath.split('/').map(encodeURIComponent).join('/');
            const cleanFolder = encodeURIComponent(folder);
            const cleanVariant = encodeURIComponent(variant);

            // "content/" works because index.html is at the root
            const path = `content/${cleanCategory}/${cleanFolder}/${cleanVariant}.json`;
            
            console.log("Attempting to fetch:", path); // CHECK CONSOLE IF 404

            // 2. FETCH DATA
            const res = await fetch(path);
            
            if(!res.ok) {
                // Throw specific error with the path for easier debugging
                throw new Error(`404 Not Found: ${path}`);
            }
            const data = await res.json();

            // 3. GET ENGINE
            const engineKey = data.engineType || "3D_SKELETON";
            // IMPORTANT: imports in router.js are relative to router.js location
            const enginePath = ENGINE_REGISTRY[engineKey]; 
            
            if (!enginePath) throw new Error(`Engine type '${engineKey}' is not registered.`);

            // 4. UPDATE UI
            if(titleEl) titleEl.innerText = data.topic || data.variantTitle;
            
            // 5. LOAD ENGINE
            const module = await import(enginePath);
            const engine = Object.values(module)[0]; 

            // Clear spinner & layout fixes
            mount.innerHTML = '';
            mount.classList.remove('engine-mode');
            
            // Apply Game Mode CSS if it's not a reading text engine
            const scrollingEngines = ['READER_STUDY', 'GALLERY_STUDY', 'MATH_STUDY'];
            if (!scrollingEngines.includes(data.engineType)) {
                mount.classList.add('engine-mode');
            }

            // 6. RENDER
            if (data.mode === 'study') {
                if(engine.renderStudy) engine.renderStudy(mount, data);
                else mount.innerHTML = "Error: Engine missing renderStudy";
            } else {
                if(engine.renderLabeling) engine.renderLabeling(mount, data);
                else mount.innerHTML = "Error: Engine missing renderLabeling";
            }

            mount.scrollTop = 0;

        } catch (err) {
            console.error("Router Error:", err);
            mount.classList.remove('engine-mode');
            mount.innerHTML = `
                <div style="padding:40px; text-align:center; color:#ef4444;">
                    <h3 style="margin:0">Failed to launch</h3>
                    <div style="background:#fee2e2; padding:15px; border-radius:12px; margin:20px 0; font-family:monospace; font-size:11px; word-break:break-all; color:#b91c1c; text-align:left;">
                        ${err.message}
                    </div>
                    <button onclick="ViewManager.show('library')" style="padding:12px 24px; border:none; background:#1e293b; color:white; border-radius:12px; font-weight:bold; cursor:pointer;">Back to Library</button>
                </div>`;
        }
    },

    /**
     * loadInline: For use by the QuestRunner
     * Loads an engine into a specific sub-container
     */
    loadInline: async (engineKey, data, targetContainer) => {
        const enginePath = ENGINE_REGISTRY[engineKey];
        if (!enginePath) {
            targetContainer.innerHTML = `<p style="color:red">Engine ${engineKey} not registered</p>`;
            return;
        }

        try {
            const module = await import(enginePath);
            
            // FIX: Find the first exported object that contains our functions
            const engine = Object.values(module).find(obj => 
                typeof obj === 'object' && (obj.renderLabeling || obj.renderStudy)
            );

            if (!engine) {
                throw new Error(`Exported engine object in ${engineKey} is missing render functions.`);
            }

            if (data.mode === 'study' && engine.renderStudy) {
                engine.renderStudy(targetContainer, data);
            } else if (engine.renderLabeling) {
                engine.renderLabeling(targetContainer, data);
            } else {
                // Fallback if mode doesn't match
                engine.renderStudy ? engine.renderStudy(targetContainer, data) : engine.renderLabeling(targetContainer, data);
            }

        } catch (err) {
            console.error("Inline Load Error:", err);
            targetContainer.innerHTML = `<div style="color:red; padding:20px;">Failed to load step: ${engineKey}<br><small>${err.message}</small></div>`;
        }
    }
};