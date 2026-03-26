/**
 * Manya Morph Engine v2.0 (High-End Animation)
 * Logic: Calculates coordinate differences and glides words across the DOM.
 */
export const MorphSpeechEngine = {
    state: { data: null, isTransformed: false, theme: '#8b5cf6' },

    injectStyles: () => {
        if (document.getElementById('morph-v2-styles')) return;
        const style = document.createElement('style');
        style.id = 'morph-v2-styles';
        style.innerHTML = `
            .morph-wrapper { 
                position: absolute; inset: 0; background: #0f172a; 
                display: flex; flex-direction: column; color: white; overflow: hidden;
            }
            .stage { flex: 1; position: relative; display: flex; align-items: center; justify-content: center; }
            
            .sentence-box { 
                display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; 
                width: 90%; padding: 40px; background: rgba(255,255,255,0.05);
                border-radius: 30px; border: 1px solid rgba(255,255,255,0.1);
            }

            .m-word {
                font-size: 1.5rem; font-weight: 800; display: inline-block;
                white-space: nowrap; transition: color 0.4s;
            }

            /* The "Flying" State */
            .word-proxy {
                position: fixed; pointer-events: none; font-weight: 800;
                transition: all 0.7s cubic-bezier(0.68, -0.6, 0.32, 1.6);
                z-index: 999;
            }

            .changed-glow { color: #facc15 !important; text-shadow: 0 0 15px #facc15; }
            
            .portal-container {
                padding: 40px 20px; background: #1e293b; border-top: 1px solid #334155;
                display: flex; flex-direction: column; align-items: center; gap: 20px;
            }

            /* Interactive Slider instead of a button */
            .tense-slider {
                width: 80%; -webkit-appearance: none; height: 12px; border-radius: 10px;
                background: #334155; outline: none; position: relative;
            }
            .tense-slider::-webkit-slider-thumb {
                -webkit-appearance: none; width: 40px; height: 40px; border-radius: 50%;
                background: var(--t-color); cursor: pointer; border: 4px solid white;
                box-shadow: 0 0 20px var(--t-shadow);
            }

            .status-labels { width: 80%; display: flex; justify-content: space-between; font-weight: 900; font-size: 0.7rem; letter-spacing: 2px; }
            .active-label { color: var(--t-color); text-shadow: 0 0 10px var(--t-shadow); }
        `;
        document.head.appendChild(style);
    },

    renderLabeling: (container, data) => {
        MorphSpeechEngine.state.data = data;
        MorphSpeechEngine.state.theme = data.themeColor || '#8b5cf6';
        MorphSpeechEngine.injectStyles();
        document.documentElement.style.setProperty('--t-color', MorphSpeechEngine.state.theme);
        document.documentElement.style.setProperty('--t-shadow', MorphSpeechEngine.state.theme + '80');

        container.innerHTML = `
            <div class="morph-wrapper">
                <div style="padding:20px; text-align:center;">
                    <h2 style="margin:0; font-size:1.2rem;">${data.variantTitle}</h2>
                </div>
                <div class="stage" id="morph-stage">
                    <div class="sentence-box" id="sentence-target"></div>
                </div>
                <div class="portal-container">
                    <div class="status-labels">
                        <span id="label-direct" class="active-label">DIRECT SPEECH</span>
                        <span id="label-indirect">INDIRECT</span>
                    </div>
                    <input type="range" min="0" max="1" value="0" step="1" class="tense-slider" id="magic-slider" oninput="window.TriggerMorph(this.value)">
                    <div style="background:rgba(255,255,255,0.1); padding:15px; border-radius:12px; font-size:0.9rem; width:80%; text-align:center;">
                        <span id="hint-text">${data.directHint}</span>
                    </div>
                </div>
            </div>
        `;
        MorphSpeechEngine.renderSentence(data.direct);
    },

    renderSentence: (words) => {
        const target = document.getElementById('sentence-target');
        target.innerHTML = words.map((w, i) => `
            <span class="m-word" data-id="${w.id}">${w.text}</span>
        `).join('');
    },

    morph: (val) => {
        const s = MorphSpeechEngine.state;
        const targetMode = val == 1 ? 'indirect' : 'direct';
        if ((targetMode === 'indirect' && s.isTransformed) || (targetMode === 'direct' && !s.isTransformed)) return;

        const stage = document.getElementById('morph-stage');
        const box = document.getElementById('sentence-target');
        const oldWords = Array.from(box.querySelectorAll('.m-word'));
        
        // 1. Capture "First" Positions
        const firstPositions = oldWords.map(el => ({
            id: el.dataset.id,
            rect: el.getBoundingClientRect(),
            text: el.innerText
        }));

        // 2. Switch UI State
        s.isTransformed = (val == 1);
        document.getElementById('label-direct').classList.toggle('active-label', !s.isTransformed);
        document.getElementById('label-indirect').classList.toggle('active-label', s.isTransformed);
        document.getElementById('hint-text').innerHTML = s.isTransformed ? s.data.indirectHint : s.data.directHint;

        // 3. Render New Content (but keep it hidden for a split second)
        MorphSpeechEngine.renderSentence(s.isTransformed ? s.data.indirect : s.data.direct);
        const newWords = Array.from(box.querySelectorAll('.m-word'));
        newWords.forEach(el => el.style.opacity = '0');

        // 4. Animation Loop
        firstPositions.forEach(oldP => {
            const match = newWords.find(nw => nw.dataset.id === oldP.id);
            
            // Create a "Flying Word"
            const proxy = document.createElement('div');
            proxy.className = 'word-proxy';
            proxy.innerText = oldP.text;
            proxy.style.left = oldP.rect.left + 'px';
            proxy.style.top = oldP.rect.top + 'px';
            proxy.style.color = 'white';
            document.body.appendChild(proxy);

            if (match) {
                const lastP = match.getBoundingClientRect();
                // Check if text changed (e.g. "am" -> "was")
                if (oldP.text !== match.innerText) {
                    proxy.style.color = '#facc15';
                    proxy.style.transform = 'rotateX(360deg) scale(1.5)';
                }
                
                requestAnimationFrame(() => {
                    proxy.style.left = lastP.left + 'px';
                    proxy.style.top = lastP.top + 'px';
                    proxy.innerText = match.innerText; // Morph text during flight
                    
                    setTimeout(() => {
                        match.style.opacity = '1';
                        if (oldP.text !== match.innerText) match.classList.add('changed-glow');
                        proxy.remove();
                    }, 700);
                });
            } else {
                // Word is being removed
                proxy.style.transform = 'scale(0) translateY(-50px)';
                proxy.style.opacity = '0';
                setTimeout(() => proxy.remove(), 700);
            }
        });

        // Handle words appearing for the first time
        newWords.forEach(nw => {
            const match = firstPositions.find(fp => fp.id === nw.dataset.id);
            if (!match) {
                nw.style.transform = 'scale(0)';
                setTimeout(() => {
                    nw.style.opacity = '1';
                    nw.style.transform = 'scale(1)';
                    nw.style.color = '#facc15';
                }, 400);
            }
        });
    }
};

window.TriggerMorph = (val) => MorphSpeechEngine.morph(val);