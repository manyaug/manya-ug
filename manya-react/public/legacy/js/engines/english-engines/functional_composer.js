/**
 * Functional Composer Engine (v1.1)
 * Optimized for P.7 Functional Writing & Sequencing
 * Entry point: renderLabeling(container, data)
 */

export const FunctionalComposer = {
    // Consolidated State
    state: {
        container: null,
        data: null,
        currentStep: 0,
        isResolved: false,
        placedItems: {}, 
        availableItems: [],
        selectedItem: null,
        scale: window.devicePixelRatio || 2
    },

    injectStyles: () => {
        if (document.getElementById('functional-composer-styles')) return;
        const style = document.createElement('style');
        style.id = 'functional-composer-styles';
        style.innerHTML = `
            .composer-root {
                position: absolute; inset: 0;
                display: flex; flex-direction: column;
                background: #f1f5f9; font-family: 'Segoe UI', Tahoma, sans-serif;
                overflow: hidden; user-select: none;
            }
            .composer-workspace {
                flex: 1; padding: 15px; overflow-y: auto;
                display: flex; flex-direction: column; align-items: center;
                background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
                background-size: 20px 20px;
            }
            .writing-paper {
                background: white; width: 100%; max-width: 500px;
                min-height: 500px; border-radius: 4px; padding: 20px;
                box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                position: relative; border: 1px solid #e2e8f0;
            }
            .drop-slot {
                border: 2px dashed #cbd5e1; border-radius: 8px;
                margin-bottom: 12px; min-height: 44px; padding: 10px;
                transition: all 0.2s; background: #f8fafc;
                display: flex; align-items: center; justify-content: center;
                font-size: 14px; color: #94a3b8; font-weight: 600;
                cursor: pointer;
            }
            .drop-slot.occupied { border-style: solid; border-color: #6366f1; background: #eef2ff; color: #1e293b; }
            .drop-slot.correct { border-color: #22c55e; background: #f0fdf4; border-width: 3px; }
            .drop-slot.wrong { border-color: #ef4444; background: #fef2f2; border-width: 3px; }

            .item-pool {
                background: #fff; padding: 15px; border-top: 2px solid #e2e8f0;
                display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
                max-height: 25vh; overflow-y: auto;
            }
            .draggable-item {
                padding: 10px 16px; background: white; border: 2px solid #e2e8f0;
                border-radius: 12px; font-size: 14px; font-weight: 700;
                cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #334155;
            }
            .draggable-item.selected { border-color: #6366f1; background: #f5f3ff; transform: translateY(-2px); }
            .draggable-item.used { opacity: 0.2; pointer-events: none; }

            .hud {
                flex: 0 0 auto; background: white; padding: 16px;
                padding-bottom: calc(16px + env(safe-area-inset-bottom));
                border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 10px;
            }
            .check-btn {
                width: 100%; height: 56px; background: #6366f1; color: white;
                border: none; border-radius: 16px; font-weight: 700; font-size: 1rem; cursor: pointer;
            }
            .check-btn.success { background: #22c55e; }
            
            @keyframes composer-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        FunctionalComposer.injectStyles();
        FunctionalComposer.state.container = container;
        FunctionalComposer.state.data = data;
        FunctionalComposer.state.currentStep = 0;
        FunctionalComposer.loadTask();
    },

    loadTask: () => {
        const q = FunctionalComposer.state.data.questions[FunctionalComposer.state.currentStep];
        FunctionalComposer.state.isResolved = false;
        FunctionalComposer.state.placedItems = {};
        FunctionalComposer.state.selectedItem = null;
        
        // Prepare items
        FunctionalComposer.state.availableItems = q.items.map(item => ({
            ...item,
            isUsed: false
        })).sort(() => Math.random() - 0.5);

        FunctionalComposer.state.container.innerHTML = `
            <div class="composer-root">
                <div class="composer-workspace">
                    <div style="margin-bottom: 15px; text-align: center;">
                        <h3 style="margin:0; color:#1e293b">${q.title}</h3>
                        <p style="margin:4px 0 0 0; font-size:13px; color:#64748b">${q.instruction}</p>
                    </div>
                    <div class="writing-paper" id="paper-surface">
                        ${q.slots.map(slot => `
                            <div class="drop-slot" id="slot-${slot.id}" 
                                 style="position:${slot.pos ? 'absolute' : 'relative'}; 
                                        top:${slot.y || 0}px; right:${slot.x || 0}px; 
                                        left:${slot.left || 'auto'};
                                        width:${slot.w || '100%'}">
                                ${slot.label}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="item-pool" id="pool-mount"></div>

                <div class="hud">
                    <div id="composer-feedback" style="text-align:center; height:20px; font-weight:800; font-size:14px"></div>
                    <button id="composer-main-btn" class="check-btn">CHECK LAYOUT</button>
                </div>
            </div>
        `;

        // Attach listeners to slots
        q.slots.forEach(slot => {
            document.getElementById(`slot-${slot.id}`).onclick = () => FunctionalComposer.handleSlotClick(slot.id);
        });

        FunctionalComposer.renderPool();
        document.getElementById('composer-main-btn').onclick = () => FunctionalComposer.validate();
    },

    renderPool: () => {
        const mount = document.getElementById('pool-mount');
        mount.innerHTML = '';
        FunctionalComposer.state.availableItems.forEach((item, index) => {
            const el = document.createElement('div');
            const isSelected = FunctionalComposer.state.selectedItem?.id === item.id;
            el.className = `draggable-item ${item.isUsed ? 'used' : ''} ${isSelected ? 'selected' : ''}`;
            el.innerText = item.text;
            el.onclick = () => FunctionalComposer.selectItem(item);
            mount.appendChild(el);
        });
    },

    selectItem: (item) => {
        if (item.isUsed) return;
        FunctionalComposer.state.selectedItem = item;
        FunctionalComposer.renderPool();
    },

    handleSlotClick: (slotId) => {
        const item = FunctionalComposer.state.selectedItem;
        if (!item) return;

        // If slot occupied, free the old item
        const oldItemId = FunctionalComposer.state.placedItems[slotId];
        if (oldItemId) {
            const oldItem = FunctionalComposer.state.availableItems.find(i => i.id === oldItemId);
            if (oldItem) oldItem.isUsed = false;
        }

        // Place new item
        FunctionalComposer.state.placedItems[slotId] = item.id;
        item.isUsed = true;
        
        const slotEl = document.getElementById(`slot-${slotId}`);
        slotEl.innerText = item.text;
        slotEl.classList.add('occupied');
        
        FunctionalComposer.state.selectedItem = null;
        FunctionalComposer.renderPool();
    },

    validate: () => {
        if (FunctionalComposer.state.isResolved) {
            FunctionalComposer.progress();
            return;
        }

        const q = FunctionalComposer.state.data.questions[FunctionalComposer.state.currentStep];
        let allCorrect = true;

        q.slots.forEach(slot => {
            const placedId = FunctionalComposer.state.placedItems[slot.id];
            const slotEl = document.getElementById(`slot-${slot.id}`);
            
            if (placedId === slot.correctId) {
                slotEl.classList.add('correct');
                slotEl.classList.remove('wrong');
            } else {
                slotEl.classList.add('wrong');
                slotEl.classList.remove('correct');
                allCorrect = false;
            }
        });

        const fb = document.getElementById('composer-feedback');
        const btn = document.getElementById('composer-main-btn');

        if (allCorrect) {
            FunctionalComposer.state.isResolved = true;
            fb.innerText = "Layout is Perfect! ✍️";
            fb.style.color = "#22c55e";
            btn.innerText = "NEXT CHALLENGE";
            btn.classList.add('success');
        } else {
            fb.innerText = "Some parts are in the wrong place.";
            fb.style.color = "#ef4444";
            document.getElementById('paper-surface').style.animation = "composer-shake 0.3s";
            setTimeout(() => { document.getElementById('paper-surface').style.animation = ""; }, 300);
        }
    },

    progress: () => {
        if (FunctionalComposer.state.currentStep < FunctionalComposer.state.data.questions.length - 1) {
            FunctionalComposer.state.currentStep++;
            FunctionalComposer.loadTask();
        } else {
            // DB Bridge
            const result = {
                isCorrect: true,
                score: FunctionalComposer.state.data.questions.length,
                total: FunctionalComposer.state.data.questions.length,
                type: 'writing'
            };
            if (window.onSimulationSubmit) window.onSimulationSubmit(result);
            if (window.captureSimulationResult) window.captureSimulationResult(true, result.score, result.total);

            FunctionalComposer.state.container.innerHTML = `
                <div class="composer-workspace">
                    <h1 style="color:#6366f1; margin-top:50px">Quest Complete! 🎓</h1>
                    <p style="color:#64748b">You have mastered Functional Writing layouts.</p>
                </div>
            `;
        }
    }
};

// Map to the window for your index.htm router
window.FunctionalComposer = FunctionalComposer;