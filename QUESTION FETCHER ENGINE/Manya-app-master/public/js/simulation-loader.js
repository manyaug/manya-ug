// public/js/simulation-loader.js
const ENGINE_NAME_MAP = {
    '3D_SKELETON': '3D-skeleton-engine',
    '3D_SKELETON_ENGINE': '3D-skeleton-engine',
    'GALLERY_STUDY': 'gallery-study-engine',
    'GALLERY_STUDY_ENGINE': 'gallery-study-engine',
    'IMAGE_HOTSPOTS': 'image-hotspots-engine',
    'IMAGE_HOTSPOTS_ENGINE': 'image-hotspots-engine',
    'MCQ': 'mcq-standalone',
    'MCQ_STANDALONE': 'mcq-standalone',
    'READER_STUDY': 'reader-study-engine',
    'READER_STUDY_ENGINE': 'reader-study-engine',
    'PROCEDURAL_CANVAS': 'procedural-canvas-engine',
    'BINARY_GENERATOR': 'math-engines/binary-generator-engine',
    'PIZZA_GAME': 'math-engines/pizza-game-engine',
    'SET_CLASSIFIER': 'math-engines/set-classifier-engine',
    'SET_STUDY': 'math-engines/set-study-engine',
    'SET_THEORY': 'math-engines/set-theory-engine',
    'SUBSET_GAME': 'math-engines/subset-game-engine',
    'VENN_PROB': 'math-engines/venn-prob-engine',
    'VENN_SPOTLIGHT': 'math-engines/venn-spotlight-engine',
    'CHAT_ENGINE': 'english-engines/chat_engine',
    'DEEP_READER': 'english-engines/deep_reader',
    'ENGLISH_RULE_MASTER': 'english-engines/english_rule_master',
    'FUNCTIONAL_COMPOSER': 'english-engines/functional_composer',
    'GRAMMAR_MAZE': 'english-engines/game-grammar-maze',
    'HANGMAN': 'english-engines/game-hangman',
    'HARVEST_ENGINE': 'english-engines/game-harvest-engine',
    'MEMORY_MATCH': 'english-engines/game-memory-match',
    'SENTENCE_TRAIN': 'english-engines/game-sentence-train',
    'WORDGRID': 'english-engines/game-wordgrid',
    'MORPH_GAME': 'english-engines/morph_game',
    'SYNTAX_ARCHITECT': 'english-engines/syntax-architect',
    'UNIVERSAL_GLOBE': 'sst-engines/universal-globe-engine',
    'UNKNOWN': '3D-skeleton-engine',
    'NULL': '3D-skeleton-engine'
};

const SimulationLoader = {
    engines: {},
    modelViewerLoaded: false,
    basePath: '/js/simulations/app-shell/js/engines/',
    routerLoaded: false,
    lastSimulationResult: null,
    
    async init() {
        console.log('🔧 Initializing SimulationLoader...');
        
        if (!document.querySelector('script[src*="model-viewer"]')) {
            await this.loadModelViewer();
        }
        
        if (window.ManyaRouter) {
            this.routerLoaded = true;
        } else {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (window.ManyaRouter) {
                this.routerLoaded = true;
            } else {
                window.ManyaRouter = this.createFallbackRouter();
                this.routerLoaded = true;
            }
        }
        
        return this;
    },
    
    createFallbackRouter() {
        return {
            registry: ENGINE_NAME_MAP,
            
            getEnginePath(engineType) {
                const mappedName = ENGINE_NAME_MAP[engineType] || '3D-skeleton-engine';
                return `/js/simulations/app-shell/js/engines/${mappedName}.js`;
            },
            
            async loadInline(engineType, data, container, mode) {
                try {
                    const path = this.getEnginePath(engineType);
                    const module = await import(path);
                    const Engine = module.default || Object.values(module)[0];
                    
                    if (!Engine) throw new Error('No engine found');
                    
                    // ===== LABELING MODE (QUESTIONS) =====
                    if (mode === 'labeling') {
                        console.log('🔍 Loading labeling question');
                        
                        container.style.height = '600px';
                        
                        // Call the engine's renderLabeling
                        Engine.renderLabeling(container, data);
                        
                        // INTERCEPT the submitAnswers function
                        setTimeout(() => {
                            // Store the original submitAnswers if it exists
                            const originalSubmit = window.submitAnswers;
                            
                            // Replace with our intercepted version
                            window.submitAnswers = function() {
                                console.log('🎯 Submit Answers clicked - intercepting');
                                
                                // Calculate results
                                let allCorrect = true;
                                let correctCount = 0;
                                const hotspots = data.hotspots || [];
                                
                                // This assumes the engine stores selections in window.userSelections
                                // You may need to adjust based on how your engine stores data
                                const selections = window.userSelections || {};
                                
                                hotspots.forEach(h => {
                                    if (selections[h.id] === h.label) {
                                        correctCount++;
                                    } else {
                                        allCorrect = false;
                                    }
                                });
                                
                                const isCorrect = allCorrect;
                                const pointsEarned = isCorrect ? 3 : 0;
                                
                                // Store result
                                window.SimulationLoader.lastSimulationResult = {
                                    correct: correctCount,
                                    total: hotspots.length,
                                    pointsEarned: pointsEarned,
                                    isCorrect: isCorrect,
                                    message: isCorrect ? '✅ Correct!' : '❌ Not quite right'
                                };
                                
                                console.log('✅ Result captured:', window.SimulationLoader.lastSimulationResult);
                                
                                // Call original if needed (to update UI)
                                if (originalSubmit) {
                                    originalSubmit();
                                } else {
                                    // If no original, update UI manually
                                    const statusEl = container.querySelector('#q-status');
                                    if (statusEl) {
                                        if (isCorrect) {
                                            statusEl.innerHTML = `<span style="color:#16a34a; font-size:1.3em;">✅ Completed correctly! Perfect score!</span>`;
                                        } else {
                                            statusEl.innerHTML = `<span style="color:#dc2626; font-size:1.2em;">Completed – but incorrect (${correctCount}/${hotspots.length} correct).</span>`;
                                        }
                                    }
                                }
                                
                                // Auto-advance after delay
                                setTimeout(() => {
                                    if (window.QuestScreen) {
                                        window.QuestScreen.continueAfterSimulation();
                                    }
                                }, 1500);
                            };
                        }, 500); // Wait for engine to set up its functions
                        
                        return;
                    }
                    
                    // ===== STUDY MODE (RECAP) =====
                    if (mode === 'study') {
                        container.style.height = '500px';
                        
                        if (Engine.renderStudy) {
                            Engine.renderStudy(container, data);
                        } else {
                            container.innerHTML = `
                                <div style="width:100%; height:100%; position:relative;">
                                    <model-viewer 
                                        src="${data.modelUrl || data.glb || ''}"
                                        auto-rotate
                                        camera-controls
                                        style="width:100%; height:100%; background-color:#111827;">
                                    </model-viewer>
                                </div>
                            `;
                        }
                        return;
                    }
                    
                } catch (err) {
                    console.error('Router error:', err);
                    this.renderFallback(container, data);
                }
            },
            
            renderFallback(container, data) {
                container.innerHTML = `
                    <model-viewer 
                        src="${data.modelUrl || data.glb || 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'}"
                        auto-rotate
                        camera-controls
                        style="width:100%; height:100%; background-color:#111827;">
                    </model-viewer>
                `;
            }
        };
    },
    
    loadModelViewer() {
        return new Promise((resolve) => {
            if (document.querySelector('script[src*="model-viewer"]')) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    },
    
    getLastSimulationResult() {
        const result = this.lastSimulationResult;
        this.lastSimulationResult = null;
        return result;
    },
    
    async loadSimulation(question) {
        if (!question) return this.createErrorDisplay('No data');
        
        if (!this.routerLoaded) await this.init();
        
        const mode = question.mode_sim || 'study';
        
        if (mode === 'labeling') this.lastSimulationResult = null;
        
        try {
            let simData = { ...question };
            if (question.id) {
                try {
                    const data = await this.loadSimulationData(question.id);
                    simData = { ...simData, ...data };
                } catch (e) {}
            }
            
            const container = document.createElement('div');
            container.className = 'simulation-container';
            container.style.width = '100%';
            container.style.height = '500px';
            
            await window.ManyaRouter.loadInline(
                question.engine_type_sim || '3D_SKELETON', 
                simData, 
                container, 
                mode
            );
            
            return container;
            
        } catch (err) {
            return this.createErrorDisplay(err.message);
        }
    },
    
    async loadSimulationData(questionId) {
        const response = await fetch(`/api/simulation/data/${questionId}`);
        return await response.json();
    },
    
    createErrorDisplay(message) {
        const div = document.createElement('div');
        div.innerHTML = `<p>❌ ${message}</p>`;
        return div;
    }
};

window.SimulationLoader = SimulationLoader;