// app-shell/js/engines/antagonistic-muscles-engine.js

export const AntagonisticMusclesEngine = {
    state: {
        flexion: 0, // 0 (Extended) to 1 (Flexed)
        targetFlexion: 0,
        animationFrameId: null,
        hitRegions: [], // Stores clickable areas {path, id}
        partData: {}, // Loaded from cartridge
        canvas: null,
        ctx: null,
        width: 0,
        height: 0
    },

    // --- Entry Point for Learning Mode ---
    renderStudy: (container, data) => {
        AntagonisticMusclesEngine.injectStyles();
        AntagonisticMusclesEngine.state.partData = data.parts;

        container.innerHTML = `
            <div class="manya-engine-container">
                <!-- Header -->
                <header class="manya-header">
                    <div class="flex items-center gap-3">
                        <div class="bg-rose-600 p-2 rounded-lg text-white">
                            <i data-lucide="activity" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h1 class="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Antagonistic <span class="text-rose-600">Muscles</span></h1>
                            <p class="text-xs text-slate-500 font-medium">Biceps (Flexor) & Triceps (Extensor)</p>
                        </div>
                    </div>
                    <div class="hidden md:block text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                        Interactive Biology
                    </div>
                </header>

                <main class="manya-main-content">
                    <!-- Left: Simulation Canvas -->
                    <div class="manya-canvas-section">
                        <div class="relative w-full aspect-[4/3] bg-white rounded-3xl shadow-xl border-4 border-slate-200 overflow-hidden group">
                            <canvas id="simCanvas" class="w-full h-full"></canvas>
                            
                            <!-- Hint Overlay -->
                            <div class="absolute top-4 left-4 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                                <span class="bg-slate-800 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <i data-lucide="mouse-pointer-2" class="w-3 h-3"></i> Click parts to learn
                                </span>
                            </div>

                            <!-- Labels Container (Absolute positioning over canvas) -->
                            <div id="labelsContainer" class="absolute inset-0 pointer-events-none"></div>
                        </div>

                        <!-- Controls -->
                        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-bold text-slate-500 uppercase">Arm Movement</span>
                                <span id="flexStatus" class="text-sm font-bold text-rose-600">Extended</span>
                            </div>
                            
                            <input 
                                type="range" min="0" max="100" value="0" id="flexSlider" 
                                class="w-full h-4 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600 mb-6"
                            >

                            <div class="flex gap-3">
                                <button id="flexArmBtn" class="flex-1 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2">
                                    <i data-lucide="corner-left-up" class="w-4 h-4"></i> Flex Arm
                                </button>
                                <button id="extendArmBtn" class="flex-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-2">
                                    <i data-lucide="corner-right-down" class="w-4 h-4"></i> Extend Arm
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Info Panel (Mobile - Below Canvas, Desktop - Right of Canvas) -->
                    <div class="manya-info-panel">
                        <!-- Dynamic Info Box -->
                        <div id="infoCard" class="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-rose-500 min-h-[300px] transition-all">
                            <div class="flex justify-between items-start mb-4">
                                <h2 id="infoTitle" class="text-xl font-black text-slate-800">Select a Part</h2>
                                <div id="infoIcon" class="p-2 bg-slate-100 rounded-full text-slate-400">
                                    <i data-lucide="info" class="w-5 h-5"></i>
                                </div>
                            </div>
                            <div id="infoContent" class="space-y-4">
                                <p class="text-slate-500 text-sm italic">
                                    Click on the muscles (Red), bones (White), or tendons (Grey) in the diagram to see their function and exam tips.
                                </p>
                                <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 hidden" id="examTipBox">
                                    <strong>Exam Tip:</strong> <span id="examTipText"></span>
                                </div>
                            </div>
                        </div>

                        <!-- Legend/Key -->
                        <div class="bg-slate-800 text-white p-5 rounded-2xl shadow-md">
                            <h3 class="font-bold mb-3 flex items-center gap-2">
                                <i data-lucide="list" class="w-4 h-4"></i> Key Concepts
                            </h3>
                            <ul class="text-xs space-y-2 text-slate-300">
                                <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-rose-500"></span> <strong>Antagonistic:</strong> Muscles working in pairs.</li>
                                <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-400"></span> <strong>Contracted:</strong> Short, thick, hard.</li>
                                <li class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-slate-400"></span> <strong>Relaxed:</strong> Long, thin, soft.</li>
                            </ul>
                        </div>
                    </div>
                </main>
            </div>
        `;

        AntagonisticMusclesEngine.initCanvas(container.querySelector('#simCanvas'));
        AntagonisticMusclesEngine.setupEventListeners(container);
        AntagonisticMusclesEngine.startLoop();
        AntagonisticMusclesEngine.showInfo('BICEPS'); // Default info
        lucide.createIcons(); // Initialize lucide icons

        // Ensure canvas resize observer is only added once or cleared correctly
        if (AntagonisticMusclesEngine.state.resizeObserver) {
            AntagonisticMusclesEngine.state.resizeObserver.disconnect();
        }
        AntagonisticMusclesEngine.state.resizeObserver = new ResizeObserver(() => AntagonisticMusclesEngine.resize());
        AntagonisticMusclesEngine.state.resizeObserver.observe(container.querySelector('#simCanvas').parentElement);
    },

    // --- Entry Point for Quiz/Labeling Mode ---
    renderLabeling: (container, data) => {
        AntagonisticMusclesEngine.injectStyles();
        AntagonisticMusclesEngine.state.partData = data.parts;

        // Reset state for quiz
        AntagonisticMusclesEngine.state.flexion = 0;
        AntagonisticMusclesEngine.state.targetFlexion = 0;

        const quizParts = data.quizOrder; // Array of part IDs to quiz

        container.innerHTML = `
            <div class="manya-engine-container">
                <header class="manya-header">
                    <div class="flex items-center gap-3">
                        <div class="bg-rose-600 p-2 rounded-lg text-white">
                            <i data-lucide="help-circle" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h1 class="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Label the <span class="text-rose-600">Muscles</span></h1>
                            <p class="text-xs text-slate-500 font-medium">Identify the parts by tapping the pulsing pins.</p>
                        </div>
                    </div>
                    <div class="hidden md:block text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">
                        Quiz Mode
                    </div>
                </header>

                <main class="manya-main-content">
                    <div class="manya-canvas-section">
                        <div class="relative w-full aspect-[4/3] bg-white rounded-3xl shadow-xl border-4 border-slate-200 overflow-hidden">
                            <canvas id="simCanvas" class="w-full h-full"></canvas>
                            <div id="quizPinsContainer" class="absolute inset-0 pointer-events-none"></div>
                        </div>

                        <div id="quizControls" class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4">
                            <h3 class="text-lg font-bold text-slate-800 mb-4" id="quizQuestion">Tap a pulsing pin to begin!</h3>
                            <div id="wordBank" class="grid grid-cols-2 gap-3">
                                <!-- Word bank buttons will be inserted here -->
                            </div>
                            <div id="quizFeedback" class="mt-4 text-center text-lg font-bold hidden"></div>
                        </div>
                    </div>
                </main>
            </div>
        `;

        AntagonisticMusclesEngine.initCanvas(container.querySelector('#simCanvas'));
        AntagonisticMusclesEngine.setupQuiz(quizParts, container);
        AntagonisticMusclesEngine.startLoop(); // Keep arm moving slightly or fixed
        lucide.createIcons(); // Initialize lucide icons

        // Ensure canvas resize observer is only added once or cleared correctly
        if (AntagonisticMusclesEngine.state.resizeObserver) {
            AntagonisticMusclesEngine.state.resizeObserver.disconnect();
        }
        AntagonisticMusclesEngine.state.resizeObserver = new ResizeObserver(() => AntagonisticMusclesEngine.resize());
        AntagonisticMusclesEngine.state.resizeObserver.observe(container.querySelector('#simCanvas').parentElement);
    },

    // --- Quiz Logic ---
    setupQuiz: (quizOrder, container) => {
        const s = AntagonisticMusclesEngine.state;
        s.currentQuizIndex = 0;
        s.quizOrder = quizOrder;
        s.selectedQuizPart = null;
        s.quizPinsContainer = container.querySelector('#quizPinsContainer');
        s.wordBank = container.querySelector('#wordBank');
        s.quizQuestion = container.querySelector('#quizQuestion');
        s.quizFeedback = container.querySelector('#quizFeedback');

        s.canvas.removeEventListener('pointerdown', AntagonisticMusclesEngine.handleStudyCanvasClick); // Remove study mode listener
        s.canvas.addEventListener('pointerdown', AntagonisticMusclesEngine.handleQuizCanvasClick);

        AntagonisticMusclesEngine.renderQuizStep();
    },

    renderQuizStep: () => {
        const s = AntagonisticMusclesEngine.state;
        s.quizPinsContainer.innerHTML = '';
        s.wordBank.innerHTML = '';
        s.quizFeedback.classList.add('hidden');
        s.quizFeedback.innerHTML = '';

        if (s.currentQuizIndex >= s.quizOrder.length) {
            s.quizQuestion.innerHTML = "Quiz Complete! Well done!";
            return;
        }

        const partIdToQuiz = s.quizOrder[s.currentQuizIndex];
        s.quizQuestion.innerHTML = `Which part is the <span class="text-rose-600 font-bold">${s.partData[partIdToQuiz].title}</span>?`;

        // Create word bank with correct answer and distractors
        const allPartIds = Object.keys(s.partData);
        let possibleAnswers = [partIdToQuiz];
        while (possibleAnswers.length < 4 && possibleAnswers.length < allPartIds.length) {
            const randomId = allPartIds[Math.floor(Math.random() * allPartIds.length)];
            if (!possibleAnswers.includes(randomId)) {
                possibleAnswers.push(randomId);
            }
        }
        possibleAnswers.sort(() => Math.random() - 0.5); // Shuffle

        possibleAnswers.forEach(id => {
            const button = document.createElement('button');
            button.className = 'py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors';
            button.innerText = s.partData[id].title.split('(')[0].trim(); // Get just the name
            button.dataset.partId = id;
            button.onclick = () => AntagonisticMusclesEngine.checkAnswer(id);
            s.wordBank.appendChild(button);
        });

        // Add a pulsing quiz pin to the target part
        AntagonisticMusclesEngine.addQuizPin(partIdToQuiz);
    },

    addQuizPin: (partId) => {
        const s = AntagonisticMusclesEngine.state;
        // Need to calculate position on canvas (e.g., center of the hit region)
        // This is a simplification; in a real engine, you might store more precise label coords
        let targetX = 0, targetY = 0;
        
        // Find center of hit region for the part
        const hit = s.hitRegions.find(h => h.id === partId);
        if (hit) {
            if (hit.type === 'circle') {
                targetX = hit.x;
                targetY = hit.y;
            } else if (hit.type === 'rect') {
                targetX = hit.x + hit.w / 2;
                targetY = hit.y + hit.h / 2;
            }
        } else {
             // Fallback for parts that might not have a direct hitRegion in the way we defined
             // This needs to be smarter based on specific parts
            if (partId === 'BICEPS') { targetX = s.width/4; targetY = s.height/4; }
            if (partId === 'TRICEPS') { targetX = s.width/4; targetY = s.height/2 + 50; }
            // Add more specific fallbacks
        }

        const pin = document.createElement('div');
        pin.className = 'absolute w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse cursor-pointer';
        pin.style.left = `${targetX}px`;
        pin.style.top = `${targetY}px`;
        pin.style.transform = 'translate(-50%, -50%)';
        pin.dataset.partId = partId; // So we know which pin was tapped
        
        s.quizPinsContainer.appendChild(pin);
        s.currentPin = pin; // Store reference to the current pulsing pin
        s.currentQuizAnswer = partId; // Store correct answer
    },

    checkAnswer: (selectedId) => {
        const s = AntagonisticMusclesEngine.state;
        s.quizFeedback.classList.remove('hidden');

        if (selectedId === s.currentQuizAnswer) {
            s.quizFeedback.innerHTML = `<span class="text-green-600"><i data-lucide="check-circle" class="inline-block w-5 h-5 align-middle mr-1"></i> Correct!</span>`;
            s.currentQuizIndex++;
            s.quizPinsContainer.innerHTML = ''; // Remove the pin
            setTimeout(() => {
                AntagonisticMusclesEngine.renderQuizStep();
                lucide.createIcons();
            }, 1500);
        } else {
            s.quizFeedback.innerHTML = `<span class="text-red-600"><i data-lucide="x-circle" class="inline-block w-5 h-5 align-middle mr-1"></i> Try again!</span>`;
        }
        lucide.createIcons();
    },

    handleQuizCanvasClick: (e) => {
        // In quiz mode, clicks on canvas might be for pins (if we make pins clickable)
        // For now, word bank buttons are primary interaction
        // If we want pins to be tappable, this logic needs to be enhanced
    },

    // --- Canvas Setup and Drawing ---
    initCanvas: (canvasElement) => {
        const s = AntagonisticMusclesEngine.state;
        s.canvas = canvasElement;
        s.ctx = s.canvas.getContext('2d');
        s.labelsContainer = document.getElementById('labelsContainer');
        AntagonisticMusclesEngine.resize();
    },

    resize: () => {
        const s = AntagonisticMusclesEngine.state;
        if (!s.canvas || !s.canvas.parentElement) return;

        const rect = s.canvas.parentElement.getBoundingClientRect();
        s.canvas.width = rect.width * 2; // Retina scale
        s.canvas.height = rect.height * 2;
        s.canvas.style.width = rect.width + 'px';
        s.canvas.style.height = rect.height + 'px';
        s.width = s.canvas.width;
        s.height = s.canvas.height;
        s.ctx.scale(2, 2); // logical coords match CSS pixels roughly
        AntagonisticMusclesEngine.render();
    },

    setupEventListeners: (container) => {
        const s = AntagonisticMusclesEngine.state;
        container.querySelector('#flexSlider').oninput = (e) => AntagonisticMusclesEngine.updateSimFromSlider(e.target.value);
        container.querySelector('#flexArmBtn').onclick = () => AntagonisticMusclesEngine.animateArm('FLEX');
        container.querySelector('#extendArmBtn').onclick = () => AntagonisticMusclesEngine.animateArm('EXTEND');
        
        s.canvas.addEventListener('pointerdown', AntagonisticMusclesEngine.handleStudyCanvasClick);
    },

    handleStudyCanvasClick: (e) => {
        const s = AntagonisticMusclesEngine.state;
        const rect = s.canvas.getBoundingClientRect();
        const scaleX = (s.width / 2) / rect.width;
        const scaleY = (s.height / 2) / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        let clickedId = null;
        for (let i = s.hitRegions.length - 1; i >= 0; i--) {
            const h = s.hitRegions[i];
            if (h.type === 'circle') {
                const dist = Math.sqrt((x - h.x) ** 2 + (y - h.y) ** 2);
                if (dist < h.r) { clickedId = h.id; break; }
            } else if (h.type === 'rect') {
                if (x > h.x && x < h.x + h.w && y > h.y && y < h.y + h.h) {
                    clickedId = h.id; break;
                }
            }
        }

        if (clickedId) {
            AntagonisticMusclesEngine.showInfo(clickedId);
        }
    },

    updateSimFromSlider: (val) => {
        const s = AntagonisticMusclesEngine.state;
        s.targetFlexion = val / 100;
        s.flexion = s.targetFlexion; // Immediate update for slider drag feel
        AntagonisticMusclesEngine.updateUI();
    },

    animateArm: (action) => {
        const s = AntagonisticMusclesEngine.state;
        s.targetFlexion = action === 'FLEX' ? 1 : 0;
        document.getElementById('flexSlider').value = s.targetFlexion * 100;
    },

    updateUI: () => {
        const s = AntagonisticMusclesEngine.state;
        const statusLabel = document.getElementById('flexStatus');
        if (statusLabel) { // Check if in study mode
            if (s.flexion < 0.2) statusLabel.innerText = "Extended (Straight)";
            else if (s.flexion > 0.8) statusLabel.innerText = "Flexed (Bent)";
            else statusLabel.innerText = "Moving...";
        }
    },

    startLoop: () => {
        if (AntagonisticMusclesEngine.state.animationFrameId) {
            cancelAnimationFrame(AntagonisticMusclesEngine.state.animationFrameId);
        }
        AntagonisticMusclesEngine.loop();
    },

    loop: () => {
        const s = AntagonisticMusclesEngine.state;
        // Smooth animation
        const diff = s.targetFlexion - s.flexion;
        if (Math.abs(diff) > 0.01) {
            s.flexion += diff * 0.1;
            AntagonisticMusclesEngine.updateUI();
        } else {
            s.flexion = s.targetFlexion;
        }

        AntagonisticMusclesEngine.render();
        s.animationFrameId = requestAnimationFrame(AntagonisticMusclesEngine.loop);
    },

    render: () => {
        const s = AntagonisticMusclesEngine.state;
        if (!s.ctx) return; // Ensure context is initialized

        const w = s.width / 2;
        const h = s.height / 2;
        
        s.ctx.clearRect(0, 0, w, h);
        s.hitRegions = []; // Reset hits

        // --- CONFIG & CENTERING ---
        const cx = w / 2;
        const cy = h / 2;

        const upperArmLen = 180;
        const foreArmLen = 160;
        
        const shoulderX = w * 0.25; 
        const shoulderY = h * 0.5;
        
        const elbowX = shoulderX + upperArmLen; 
        const elbowY = shoulderY;

        const maxAngle = -2.2; // Radians (~125 deg up)
        const currentAngle = s.flexion * maxAngle;

        // --- DRAW BONES ---
        AntagonisticMusclesEngine.drawBonePart(shoulderX - 40, shoulderY - 30, shoulderX + 10, shoulderY + 10, 'ORIGIN');
        AntagonisticMusclesEngine.drawBone(shoulderX, shoulderY, elbowX, elbowY, 24, 'HUMERUS');

        s.ctx.save();
        s.ctx.translate(elbowX, elbowY);
        s.ctx.rotate(currentAngle);
        
        AntagonisticMusclesEngine.drawBone(0, 5, foreArmLen, 5, 14, 'ULNA');
        AntagonisticMusclesEngine.drawBone(0, -8, foreArmLen, -5, 12, 'RADIUS');
        
        // --- REALISTIC HAND ---
        const handX = foreArmLen;
        const handY = 0;
        
        s.ctx.fillStyle = "var(--manya-skin-color)"; 
        s.ctx.beginPath();
        s.ctx.moveTo(handX, -10);
        s.ctx.lineTo(handX + 15, -18);
        s.ctx.quadraticCurveTo(handX + 35, -28, handX + 35, -15); 
        s.ctx.quadraticCurveTo(handX + 30, -5, handX + 20, -5); 
        s.ctx.lineTo(handX + 55, -5);
        s.ctx.quadraticCurveTo(handX + 65, 5, handX + 55, 18); 
        s.ctx.lineTo(handX + 10, 15);                             
        s.ctx.lineTo(handX, 10);
        s.ctx.closePath();
        s.ctx.fill();
        
        s.ctx.strokeStyle = "var(--manya-hand-outline-color)"; 
        s.ctx.lineWidth = 1.5;
        s.ctx.lineJoin = "round";
        s.ctx.stroke();
        
        s.ctx.beginPath();
        s.ctx.lineWidth = 1;
        s.ctx.moveTo(handX + 20, -5);
        s.ctx.lineTo(handX + 50, -5); 
        s.ctx.stroke();
        
        s.ctx.restore();

        // --- DRAW MUSCLES (Realistic) ---
        const bicepsContracted = s.flexion; 
        const bicepsBulge = 18 + (bicepsContracted * 28); 
        
        const biOrgX = shoulderX + 30;
        const biOrgY = shoulderY - 15;
        
        const biInsDist = 45;
        const biInsX = elbowX + Math.cos(currentAngle) * biInsDist + Math.cos(currentAngle - Math.PI/2) * -10;
        const biInsY = elbowY + Math.sin(currentAngle) * biInsDist + Math.sin(currentAngle - Math.PI/2) * -10;

        AntagonisticMusclesEngine.drawTendon(biOrgX - 25, biOrgY, biOrgX, biOrgY);
        AntagonisticMusclesEngine.drawTendon(biInsX, biInsY, biInsX - Math.cos(currentAngle)*15, biInsY - Math.sin(currentAngle)*15);

        const biMidX = (biOrgX + biInsX) / 2;
        const biMidY = (biOrgY + biInsY) / 2;
        const bulgeY = biMidY - bicepsBulge;
        
        AntagonisticMusclesEngine.drawRealisticMuscle(biOrgX, biOrgY, biInsX, biInsY, bicepsBulge, true, 'BICEPS');

        const tricepsContracted = 1 - s.flexion;
        const tricepsBulge = 18 + (tricepsContracted * 18);
        
        const triOrgX = shoulderX + 40;
        const triOrgY = shoulderY + 15;
        
        const triInsX = elbowX - 10;
        const triInsY = elbowY + 15;

        AntagonisticMusclesEngine.drawTendon(triOrgX - 25, triOrgY, triOrgX, triOrgY);
        AntagonisticMusclesEngine.drawTendon(triInsX, triInsY, elbowX + Math.cos(currentAngle)*15, elbowY + Math.sin(currentAngle)*8); 

        AntagonisticMusclesEngine.drawRealisticMuscle(triOrgX, triOrgY, triInsX, triInsY, tricepsBulge, false, 'TRICEPS');

        // --- DRAW LABELS ---
        if (s.labelsContainer) { // Only update labels in study mode
            AntagonisticMusclesEngine.updateLabels(biMidX, bulgeY - 20, (triOrgX+triInsX)/2, triOrgY + tricepsBulge + 20);
        }
    },

    drawBone: (x1, y1, x2, y2, w, id) => {
        const s = AntagonisticMusclesEngine.state;
        s.ctx.lineCap = "round";
        
        const p = new Path2D();
        p.moveTo(x1, y1);
        p.lineTo(x2, y2);
        
        const grad = s.ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "var(--manya-bone-light)");
        grad.addColorStop(0.5, "var(--manya-bone-mid)");
        grad.addColorStop(1, "var(--manya-bone-dark)");

        s.ctx.lineWidth = w;
        s.ctx.strokeStyle = grad;
        s.ctx.stroke(p);
        
        s.ctx.strokeStyle = "var(--manya-bone-shadow)";
        s.ctx.lineWidth = 1;
        s.ctx.stroke(p);

        const mx = (x1+x2)/2; const my = (y1+y2)/2;
        s.hitRegions.push({
            id: id,
            type: 'rect',
            x: mx - Math.abs(x2-x1)/2 - 10,
            y: my - 20,
            w: Math.abs(x2-x1) + 20,
            h: 40
        });
    },

    drawBonePart: (x1, y1, x2, y2, id) => {
        const s = AntagonisticMusclesEngine.state;
        const p = new Path2D();
        p.rect(x1, y1, x2-x1, y2-y1);
        
        const grad = s.ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "var(--manya-bone-part-light)");
        grad.addColorStop(1, "var(--manya-bone-part-dark)");
        
        s.ctx.fillStyle = grad;
        s.ctx.fill(p);
        s.ctx.strokeStyle = "var(--manya-bone-shadow)";
        s.ctx.lineWidth = 1;
        s.ctx.stroke(p);
        
        s.hitRegions.push({ id, type: 'rect', x: x1, y: y1, w: x2-x1, h: y2-y1 });
    },

    drawTendon: (x1, y1, x2, y2) => {
        const s = AntagonisticMusclesEngine.state;
        const grad = s.ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, "var(--manya-tendon-light)");
        grad.addColorStop(1, "var(--manya-tendon-dark)");

        s.ctx.strokeStyle = grad; 
        s.ctx.lineWidth = 8;
        s.ctx.lineCap = "round";
        s.ctx.beginPath();
        s.ctx.moveTo(x1, y1);
        s.ctx.lineTo(x2, y2);
        s.ctx.stroke();
        
        s.ctx.strokeStyle = "var(--manya-tendon-outline)";
        s.ctx.lineWidth = 0.5;
        s.ctx.beginPath(); s.ctx.moveTo(x1, y1); s.ctx.lineTo(x2, y2); s.ctx.stroke();

        s.hitRegions.push({
            id: 'TENDON', 
            type: 'circle',
            x: (x1+x2)/2, y: (y1+y2)/2, r: 15
        });
    },

    drawRealisticMuscle: (x1, y1, x2, y2, bulge, isUpper, id) => {
        const s = AntagonisticMusclesEngine.state;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy);
        const nx = -dy / len;
        const ny = dx / len;
        
        const dir = isUpper ? 1 : -1;
        const cx = mx + nx * bulge * dir;
        const cy = my + ny * bulge * dir;

        const p = new Path2D();
        p.moveTo(x1, y1);
        p.quadraticCurveTo(cx, cy, x2, y2);
        const innerBulge = bulge * 0.15;
        const cx2 = mx + nx * innerBulge * dir;
        const cy2 = my + ny * innerBulge * dir;
        p.quadraticCurveTo(cx2, cy2, x1, y1);

        const grad = s.ctx.createRadialGradient(cx, cy, 5, mx, my, bulge);
        grad.addColorStop(0, "var(--manya-muscle-highlight)"); 
        grad.addColorStop(0.6, "var(--manya-muscle-main)"); 
        grad.addColorStop(1, "var(--manya-muscle-shadow)"); 

        s.ctx.fillStyle = grad;
        s.ctx.fill(p);
        
        s.ctx.save();
        s.ctx.clip(p); 
        s.ctx.strokeStyle = "var(--manya-muscle-fiber)"; 
        s.ctx.lineWidth = 1;
        
        const fiberCount = 5;
        for(let i=1; i<fiberCount; i++) {
            const f = i / fiberCount;
            const sx = x1 + (x2-x1)*0.05;
            const sy = y1 + (y2-y1)*0.05;
            const ex = x2 - (x2-x1)*0.05;
            const ey = y2 - (y2-y1)*0.05;

            const layerBulge = bulge * (1 - Math.abs(0.5 - f)*2);
            const lcx = mx + nx * layerBulge * dir;
            const lcy = my + ny * layerBulge * dir;

            s.ctx.beginPath();
            s.ctx.moveTo(x1, y1);
            s.ctx.quadraticCurveTo(lcx, lcy, x2, y2);
            s.ctx.stroke();
        }
        s.ctx.restore();

        s.ctx.strokeStyle = "var(--manya-muscle-shadow)";
        s.ctx.lineWidth = 1;
        s.ctx.stroke(p);

        s.hitRegions.push({
            id: id,
            type: 'circle',
            x: mx, y: my, r: 35
        });
    },

    updateLabels: (bicepsX, bicepsY, tricepsX, tricepsY) => {
        const s = AntagonisticMusclesEngine.state;
        if (!s.labelsContainer) return; // Only if in study mode
        s.labelsContainer.innerHTML = '';

        AntagonisticMusclesEngine.createLabel(bicepsX, bicepsY, "Biceps");
        AntagonisticMusclesEngine.createLabel(tricepsX, tricepsY, "Triceps");
    },

    createLabel: (x, y, text) => {
        const el = document.createElement('div');
        el.className = 'muscle-label fade-in';
        el.innerText = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = 'translate(-50%, -50%)';
        AntagonisticMusclesEngine.state.labelsContainer.appendChild(el);
    },

    showInfo: (id) => {
        const s = AntagonisticMusclesEngine.state;
        const data = s.partData[id];
        if (!data) return;

        const card = document.getElementById('infoCard');
        const title = document.getElementById('infoTitle');
        const iconContainer = document.getElementById('infoIcon');
        const content = document.getElementById('infoContent');
        const examTipBox = document.getElementById('examTipBox');
        const examTipText = document.getElementById('examTipText');

        if (!card) return; // Ensure elements exist (only in study mode)

        card.classList.remove('fade-in');
        void card.offsetWidth; 
        card.classList.add('fade-in');

        const colorClass = data.color.replace('text-', 'border-');
        card.className = `bg-white p-6 rounded-2xl shadow-lg border-l-8 ${colorClass} min-h-[300px] transition-all`;

        title.innerHTML = data.title;
        title.className = `text-xl font-black ${data.color}`;
        
        iconContainer.innerHTML = `<i data-lucide="${data.icon}" class="w-6 h-6"></i>`;
        lucide.createIcons();

        let html = `
            <p class="text-slate-700 font-medium">${data.desc}</p>
            <div class="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                ${data.action}
            </div>
        `;
        
        examTipBox.classList.remove('hidden');
        examTipText.innerText = data.tip;

        content.innerHTML = html;
        content.appendChild(examTipBox); // Re-append the exam tip box
    },

    // --- Styles ---
    injectStyles: () => {
        if (document.getElementById('antagonistic-muscles-engine-styles')) {
            return;
        }

        const styleTag = document.createElement('style');
        styleTag.id = 'antagonistic-muscles-engine-styles';
        styleTag.innerHTML = `
            /* Tailwind CSS Integration */
            .manya-engine-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 1rem;
                min-height: 100vh;
                background-color: var(--manya-bg-color);
            }
            .manya-header {
                width: 100%;
                max-width: 48rem; /* Equivalent to max-w-4xl */
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                background-color: white;
                padding: 1rem;
                border-radius: 1rem; /* rounded-2xl */
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                border: 1px solid var(--manya-border-light);
            }
            .manya-main-content {
                width: 100%;
                max-width: 48rem; /* max-w-4xl */
                display: flex;
                flex-direction: column;
                gap: 1.5rem; /* gap-6 */
            }
            @media (min-width: 1024px) { /* lg breakpoint */
                .manya-main-content {
                    flex-direction: row;
                }
            }
            .manya-canvas-section {
                flex: 1; /* flex-1 */
                display: flex;
                flex-direction: column;
                gap: 1rem; /* gap-4 */
            }
            .manya-info-panel {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 1rem; /* gap-4 */
            }
            @media (min-width: 1024px) { /* lg breakpoint */
                .manya-info-panel {
                    width: 20rem; /* lg:w-80 */
                }
            }

            /* Custom Styling */
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            canvas { touch-action: none; cursor: pointer; }
            
            .fade-in { animation: fadeIn 0.3s ease-in; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            
            .muscle-label {
                position: absolute;
                background: rgba(255, 255, 255, 0.9);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                pointer-events: none;
                border: 1px solid var(--manya-border-medium);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                transition: all 0.1s;
                white-space: nowrap;
                z-index: 10;
            }

            /* CSS Variables for Manya Theme */
            :root {
                --manya-bg-color: #f8fafc; /* slate-50 */
                --manya-border-light: #e2e8f0; /* slate-200 */
                --manya-border-medium: #cbd5e1; /* slate-300 */
                --manya-text-primary: #1e293b; /* slate-800 */
                --manya-text-secondary: #64748b; /* slate-500 */
                --manya-primary-color: #e11d48; /* rose-600 */
                --manya-primary-light: #fdf2f8; /* rose-50 */
                --manya-primary-medium: #fecdd3; /* rose-100 */
                --manya-primary-dark: #be123c; /* rose-700 */
                --manya-secondary-color: #3b82f6; /* blue-500 */
                --manya-secondary-light: #eff6ff; /* blue-50 */
                --manya-secondary-medium: #dbeafe; /* blue-100 */
                --manya-secondary-dark: #2563eb; /* blue-700 */

                --manya-bone-light: #f1f5f9; /* slate-100 */
                --manya-bone-mid: #ffffff;
                --manya-bone-dark: #e2e8f0; /* slate-200 */
                --manya-bone-shadow: #94a3b8; /* slate-400 */
                --manya-bone-part-light: #cbd5e1; /* slate-300 */
                --manya-bone-part-dark: #f1f5f9; /* slate-100 */

                --manya-tendon-light: #f8fafc; /* slate-50 */
                --manya-tendon-dark: #cbd5e1; /* slate-300 */
                --manya-tendon-outline: #94a3b8; /* slate-400 */

                --manya-muscle-highlight: #fca5a5; /* red-300 */
                --manya-muscle-main: #ef4444; /* red-500 */
                --manya-muscle-shadow: #991b1b; /* red-800 */
                --manya-muscle-fiber: rgba(153, 27, 27, 0.3); /* red-800 alpha */

                --manya-skin-color: #fcd34d; /* amber-300 */
                --manya-hand-outline-color: #b45309; /* amber-700 */

                --manya-success-color: #16a34a; /* green-600 */
                --manya-error-color: #dc2626; /* red-600 */
                --manya-warning-light: #fefce8; /* yellow-50 */
                --manya-warning-border: #fde68a; /* yellow-200 */
                --manya-warning-text: #b45309; /* yellow-800 */
            }
        `;
        document.head.appendChild(styleTag);
    }
};