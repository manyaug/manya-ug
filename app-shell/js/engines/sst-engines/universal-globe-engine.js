/**
 * UNIVERSAL GLOBE ENGINE v12.1 (FIXED PATHS)
 * ---------------------------------------------------
 * Fully Integrated with Manya Elite HUD & Notification Systems.
 * ALL v11.0 TECHNICAL FEATURES PRESERVED.
 */

// FIXED: Added extra ../ to reach app-shell/js/ from engines/sst-engines/
import { ManyaDB } from '/app-shell/manya-db.js';
import { ManyaNotify } from '/app-shell/views/manya-notify.js';


const CONTINENT_MAP = {
    "africa": ["012","024","204","072","854","108","120","132","140","148","174","178","180","262","818","226","232","748","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","768","788","800","834","894","716","732"],
    "namerica": ["124","840","484","304","084","188","222","320","340","558","591","028","044","052","192","212","214","308","332","388","630","780"],
    "samerica": ["032","068","076","152","170","218","238","328","600","604","740","858","862","254"],
    "europe": ["008","020","040","112","056","070","100","191","203","208","233","246","250","276","300","348","352","372","380","428","438","440","442","470","498","499","528","807","578","616","620","642","643","674","688","703","705","724","752","756","804","826","336"],
    "asia": ["004","051","031","048","050","064","096","116","156","196","268","356","360","364","368","376","392","400","398","414","417","418","422","458","462","496","104","524","408","512","586","608","634","682","702","410","144","760","158","762","764","626","792","795","784","860","704","887"],
    "australia": ["036","242","554","598","090","548","882","296","583","584","585"],
    "antarctica": ["010","260"],
    "east_africa": ["800", "404", "834", "646", "108", "728"], 
    "horn_africa": ["706", "231", "232", "262"], 
    "north_africa": ["818", "434", "788", "012", "504", "729", "732"], 
    "west_africa": ["566", "288", "686", "384", "466", "562", "270", "694", "430", "324", "624", "204", "768", "854", "132", "478"],
    "central_africa": ["120", "140", "148", "178", "180", "226", "266", "678"], 
    "southern_africa": ["710", "516", "072", "716", "894", "454", "508", "426", "748", "024"],
    "tunisia": ["788"], "southafrica": ["710"], "somalia": ["706"], "senegal": ["686"], "ghana": ["288"], "uganda": ["800"], "congo": ["178"], "drc": ["180"], "eq_guinea": ["226"]
};

export const UniversalGlobeEngine = {
    state: {
        width: 0, height: 0, canvas: null, ctx: null, projection: null, path: null,
        worldData: null, data: null, rotation: [0, 0], scale: 1, baseScale: 1,
        activeTab: 0, placedPieces: [], isDraggingGlobe: false, dpr: 2
    },

    // --- 2. ELITE CSS INJECTION ---
    injectStyles: () => {
        if (document.getElementById('globe-elite-styles')) return;
        const style = document.createElement('style');
        style.id = 'globe-elite-styles';
        style.innerHTML = `
            .globe-root { 
                position: fixed; inset: 0; background: #FDFBF7; 
                display: flex; flex-direction: column; z-index: 5000;
                font-family: 'Plus Jakarta Sans', sans-serif;
            }

            /* INTEGRATED HUD TAKEOVER */
            .globe-hud-takeover {
                position: fixed; top: 15px; left: 0; width: 100%; z-index: 10000;
                display: flex; justify-content: center;
            }
            .globe-hud-takeover .header-shell {
                width: 92%; max-width: 400px; height: 54px;
                background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(15px);
                border-radius: 100px; display: flex; align-items: center; padding: 0 8px;
                border: 2.5px solid #f59e0b; /* SST Gold */
                box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }

            /* VIEWPORT ADJUSTED FOR HUD */
            .globe-viewport { 
                height: 40%; width: 100%; position: relative; 
                border-bottom: 2.5px solid #F1F5F9;
                margin-top: 75px; /* SPACE FOR HUD */
            }
            .globe-canvas { display: block; width: 100%; height: 100%; cursor: grab; }

            .globe-sheet { 
                flex: 1; background: white; border-radius: 40px 40px 0 0;
                box-shadow: 0 -20px 40px rgba(0,0,0,0.03); 
                display: flex; flex-direction: column; overflow: hidden;
            }
            
            .globe-tabs { display: flex; gap: 8px; padding: 15px 20px; background: #F8FAFC; overflow-x: auto; scrollbar-width: none; }
            .g-tab { 
                padding: 10px 18px; border-radius: 14px; border: 1.5px solid #F1F5F9;
                background: white; color: #64748B; font-weight: 800; font-size: 11px;
                white-space: nowrap; cursor: pointer; transition: 0.2s;
            }
            .g-tab.active { background: #f59e0b; color: white; border-color: #f59e0b; }

            .globe-body { flex: 1; overflow-y: auto; padding: 25px; padding-bottom: 120px; }
            .g-title { font-size: 22px; font-weight: 900; color: #1E293B; margin-bottom: 10px; }
            .g-desc { font-size: 14px; color: #64748B; font-weight: 600; line-height: 1.5; margin-bottom: 20px; }

            .focus-chips { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; scrollbar-width: none; }
            .focus-chip { flex: 0 0 auto; padding: 8px 14px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 50px; font-size: 12px; font-weight: 800; color: #1E293B; cursor: pointer; }

            .step-row { display: flex; gap: 15px; margin-bottom: 20px; }
            .step-num { width:28px; height:28px; border-radius:50%; background:#f59e0b; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:11px; flex-shrink:0; }
            .step-content { background:#F8FAFC; padding:15px; border-radius:18px; width:100%; font-weight: 600; color: #475569; font-size: 14px; }

            .q-btn { width: 100%; padding: 18px; background: white; border: 2.5px solid #F1F5F9; border-radius: 20px; font-weight: 800; text-align: left; margin-bottom: 10px; cursor: pointer; }
            .q-btn.correct { background: #DCFCE7; border-color: #22C55E; color: #16A34A; }
            .q-btn.wrong { background: #FEE2E2; border-color: #EF4444; color: #B91C1C; }

            .quiz-feedback-box { margin-top: 15px; background: #F8FAFC; padding: 15px; border-radius: 20px; border: 1.5px solid #E2E8F0; }

            .puzzle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .puzzle-piece { background: white; padding: 18px; border-radius: 20px; border: 2.5px solid #F1F5F9; text-align: center; font-weight: 900; cursor: grab; box-shadow: 0 4px 0 #F1F5F9; }
            .puzzle-piece.placed { opacity: 0.3; pointer-events: none; border-style: dashed; }
        `;
        document.head.appendChild(style);
    },

    // --- 3. LOADER ---
    loadDependencies: async () => {
        const load = (src) => new Promise((resolve) => {
            if (document.querySelector(`script[src*="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = `https://cdn.jsdelivr.net/npm/${src}`;
            s.onload = resolve;
            document.head.appendChild(s);
        });
        await load("d3@7");
        await load("topojson@3");
    },

    loadMapData: async () => {
        if (UniversalGlobeEngine.state.worldData) return;
        try {
            const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
            UniversalGlobeEngine.state.worldData = await res.json();
        } catch (e) { console.error("Globe Loading Error", e); }
    },

    // --- 4. INITIALIZATION ---
    renderLabeling: async (container, data) => {
        UniversalGlobeEngine.injectStyles();
        await UniversalGlobeEngine.loadDependencies();
        await UniversalGlobeEngine.loadMapData();
        
        const user = await ManyaDB.getCurrentUser();
        UniversalGlobeEngine.state.data = data;
        UniversalGlobeEngine.state.activeTab = 0;
        UniversalGlobeEngine.state.placedPieces = [];

        container.innerHTML = `
            <div class="globe-root animate-in">
                <!-- INTEGRATED HUD TAKEOVER -->
                <header class="globe-hud-takeover">
                    <div class="header-shell">
                        <button class="uni-back-btn" style="background:#f59e0b" onclick="ViewManager.goBack()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <div class="uni-title-box" style="margin-left:15px">
                            <span class="uni-main-title">${data.topic.toUpperCase()}</span>
                            <span class="uni-sub-title" style="color:#f59e0b">GEOGRAPHY LAB</span>
                        </div>
                        <div class="uni-stats">
                            <span class="diamond-sparkle">💎</span>
                            <span class="uni-count">${user.diamonds}</span>
                        </div>
                    </div>
                </header>

                <div class="globe-viewport" id="g-mount">
                    <canvas id="g-canvas" class="globe-canvas"></canvas>
                </div>

                <div class="globe-sheet" id="g-sheet"></div>
            </div>`;

        UniversalGlobeEngine.initCanvas();
        UniversalGlobeEngine.renderUI();
    },

    renderStudy: (container, data) => UniversalGlobeEngine.renderLabeling(container, data),

    initCanvas: () => {
        const mount = document.getElementById('g-mount');
        const canvas = document.getElementById('g-canvas');
        if (!canvas || !mount) return;

        const resize = () => {
            const rect = mount.getBoundingClientRect();
            if (rect.width === 0) return; 

            const dpr = window.devicePixelRatio || 2;
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            UniversalGlobeEngine.state.ctx = ctx;
            UniversalGlobeEngine.state.width = rect.width;
            UniversalGlobeEngine.state.height = rect.height;
            
            const baseScale = Math.min(rect.width, rect.height) / 2.2;
            UniversalGlobeEngine.state.baseScale = baseScale;

            const projection = d3.geoOrthographic()
                .scale(baseScale * (UniversalGlobeEngine.state.data.zoomFactor || 1))
                .translate([rect.width / 2, rect.height / 2])
                .rotate(UniversalGlobeEngine.state.data.initialRotation || [0, -10]);

            UniversalGlobeEngine.state.projection = projection;
            UniversalGlobeEngine.state.path = d3.geoPath(projection, ctx);
            UniversalGlobeEngine.draw();
        };

        new ResizeObserver(resize).observe(mount);
        setTimeout(resize, 100);

        d3.select(canvas).call(d3.drag().on("drag", (event) => {
            UniversalGlobeEngine.state.isDraggingGlobe = true;
            const rotate = UniversalGlobeEngine.state.projection.rotate();
            UniversalGlobeEngine.state.projection.rotate([rotate[0] + event.dx * 0.4, rotate[1] - event.dy * 0.4]);
            UniversalGlobeEngine.draw();
        }).on("end", () => {
            UniversalGlobeEngine.state.isDraggingGlobe = false;
            UniversalGlobeEngine.draw();
        }));
    },

    // --- 5. DRAWING ENGINE (UNABRIDGED) ---
    draw: () => {
        const { ctx, width, height, path, projection, worldData, data, activeTab, placedPieces, isDraggingGlobe } = UniversalGlobeEngine.state;
        if (!ctx || !path || !worldData) return;

        ctx.clearRect(0, 0, width, height);

        const grad = ctx.createRadialGradient(width/2, height/2, height/5, width/2, height/2, height/1.5);
        grad.addColorStop(0, "#f0f9ff"); grad.addColorStop(1, "#bae6fd");
        ctx.fillStyle = grad; ctx.beginPath(); path({type: "Sphere"}); ctx.fill();

        if (!isDraggingGlobe) {
            ctx.strokeStyle = "rgba(30, 58, 138, 0.05)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); path(d3.geoGraticule()()); ctx.stroke();
        }

        const countries = topojson.feature(worldData, worldData.objects.countries);
        ctx.beginPath(); path(countries);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 0.5; ctx.stroke();

        let itemsToHighlight = [];
        const curCase = (data.mode === 'lesson') ? data.cases[activeTab] : 
                        (data.mode === 'game') ? data.questions[activeTab] : null;

        if (curCase?.highlight) {
            const ids = Array.isArray(curCase.highlight) ? curCase.highlight : [curCase.highlight];
            ids.forEach(k => itemsToHighlight.push({ id: k, color: curCase.highlightColor || "rgba(245, 158, 11, 0.4)" }));
        }

        if (data.mode === 'puzzle') {
            placedPieces.forEach(id => {
                const p = data.pieces.find(x => x.id === id);
                if (p) itemsToHighlight.push({ id: id, color: "rgba(16, 185, 129, 0.4)" });
            });
        }

        itemsToHighlight.forEach(h => {
            const ids = CONTINENT_MAP[h.id] || [h.id];
            const feat = { type: "FeatureCollection", features: countries.features.filter(f => ids.includes(String(f.id))) };
            ctx.beginPath(); path(feat);
            ctx.fillStyle = h.color; ctx.fill();
            ctx.strokeStyle = h.color.replace('0.4', '1'); ctx.lineWidth = 1; ctx.stroke();
        });

        if (curCase?.zones) {
            curCase.zones.forEach(zone => {
                const coords = [];
                for(let i=180; i>=-180; i-=5) coords.push([i, zone.toLat]);
                for(let i=-180; i<=180; i+=5) coords.push([i, zone.fromLat]);
                coords.push(coords[0]);
                ctx.beginPath(); path({type: "Polygon", coordinates: [coords]});
                ctx.fillStyle = zone.color || "rgba(251, 191, 36, 0.15)"; ctx.fill();
            });
        }

        if (curCase?.lines) {
            curCase.lines.forEach(l => {
                let coords = [];
                if (l.type === 'lat') for(let i=-180; i<=180; i+=5) coords.push([i, l.value]);
                else for(let i=90; i>=-90; i-=5) coords.push([l.value, i]);
                ctx.beginPath(); path({type: "LineString", coordinates: coords});
                ctx.strokeStyle = l.color || "#db2777"; ctx.lineWidth = l.width || 2;
                if(l.dashed) ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
                if (l.label && !isDraggingGlobe) {
                    const center = projection.invert([width/2, height/2]);
                    const labelPoint = l.type === 'lat' ? [center[0], l.value] : [l.value, center[1]];
                    if (d3.geoDistance(center, labelPoint) < 1.5) {
                        const pos = projection(labelPoint);
                        if(pos) {
                            ctx.fillStyle = l.color || "#db2777"; ctx.font = "800 10px sans-serif";
                            ctx.textAlign = "center"; ctx.fillText(l.label, pos[0], pos[1] - 5);
                        }
                    }
                }
            });
        }

        if (curCase?.connection) {
            ctx.beginPath(); path({type: "LineString", coordinates: [curCase.connection.from, curCase.connection.to]});
            ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        }

        if (curCase?.markers) {
            const center = projection.invert([width/2, height/2]);
            curCase.markers.forEach(m => {
                if (d3.geoDistance(center, [m.lon, m.lat]) < 1.57) {
                    const [x, y] = projection([m.lon, m.lat]);
                    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2);
                    ctx.fillStyle = m.color || "#7c3aed"; ctx.fill();
                    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
                    if(!isDraggingGlobe) {
                        ctx.fillStyle = "#1E293B"; ctx.font = "900 11px sans-serif";
                        ctx.textAlign = "center"; ctx.fillText(m.label, x, y - 12);
                    }
                }
            });
        }

        ctx.beginPath(); path({type: "Sphere"});
        ctx.strokeStyle = "rgba(186, 230, 253, 0.8)"; ctx.lineWidth = 3; ctx.stroke();
    },

    // --- 6. UI ---
    renderUI: () => {
        const { data, activeTab, placedPieces } = UniversalGlobeEngine.state;
        const sheet = document.getElementById('g-sheet');
        if (!sheet) return;

        if (data.mode === 'lesson') {
            const cur = data.cases[activeTab];
            sheet.innerHTML = `
                <div class="globe-tabs">
                    ${data.cases.map((c, i) => `<button class="g-tab ${i===activeTab?'active':''}" onclick="window.GlobeEngine.switchTab(${i})">${c.tabTitle}</button>`).join('')}
                </div>
                <div class="globe-body">
                    <div class="g-title">${cur.title}</div>
                    <div class="g-desc">${cur.description}</div>
                    ${cur.focusPoints ? `<div class="focus-chips">${cur.focusPoints.map(fp => `<button class="focus-chip" onclick="window.GlobeEngine.focusOn([${fp.rotation}], ${fp.zoom})">⌖ ${fp.label}</button>`).join('')}</div>` : ''}
                    ${cur.steps.map((s, i) => `<div class="step-row"><div class="step-num">${i+1}</div><div class="step-content">${s}</div></div>`).join('')}
                </div>`;
        } 
        else if (data.mode === 'game') {
            const q = data.questions[activeTab];
            sheet.innerHTML = `
                <div class="globe-body">
                    <div class="g-title">${q.title}</div>
                    <div class="g-desc">${q.question}</div>
                    <div id="quiz-options">${q.options.map(opt => `<button class="q-btn" onclick="window.GlobeEngine.handleQuizAnswer(this, '${opt}')">${opt}</button>`).join('')}</div>
                    <div id="quiz-feedback-area" style="display:none;"></div>
                </div>`;
        }
        else if (data.mode === 'puzzle') {
            sheet.innerHTML = `
                <div class="globe-body">
                    <div class="g-title">World Puzzle</div>
                    <div class="g-desc">Drag the names onto the globe!</div>
                    <div class="puzzle-grid">${data.pieces.map(p => `<div class="puzzle-piece ${placedPieces.includes(p.id)?'placed':''}" onmousedown="window.GlobeEngine.handleDrag(event, '${p.id}')" ontouchstart="window.GlobeEngine.handleDrag(event, '${p.id}')">${p.label}</div>`).join('')}</div>
                </div>`;
        }
    },

    switchTab: (i) => {
        UniversalGlobeEngine.state.activeTab = i;
        const cur = UniversalGlobeEngine.state.data.cases[i];
        UniversalGlobeEngine.renderUI();
        UniversalGlobeEngine.focusOn(cur.initialRotation, cur.zoomFactor || 1);
    },

    focusOn: (rot, zoom) => {
        const targetScale = UniversalGlobeEngine.state.baseScale * zoom;
        d3.transition().duration(1200).ease(d3.easeCubicOut).tween("move", () => {
            const r = d3.interpolate(UniversalGlobeEngine.state.projection.rotate(), rot);
            const s = d3.interpolate(UniversalGlobeEngine.state.projection.scale(), targetScale);
            return (t) => {
                UniversalGlobeEngine.state.projection.rotate(r(t));
                UniversalGlobeEngine.state.projection.scale(s(t));
                UniversalGlobeEngine.draw();
            };
        });
    },

    handleQuizAnswer: (btn, word) => {
        const s = UniversalGlobeEngine.state;
        const q = s.data.questions[s.activeTab];
        const feedbackEl = document.getElementById('quiz-feedback-area');
        if (word === q.correctAnswer) {
            btn.classList.add('correct');
            ManyaNotify.show("Correct!", "success");
            setTimeout(() => {
                if (s.activeTab < s.data.questions.length - 1) {
                    s.activeTab++; UniversalGlobeEngine.renderUI(); UniversalGlobeEngine.draw();
                } else { window.QuestRunner?.next(); }
            }, 1500);
        } else {
            btn.classList.add('wrong');
            ManyaNotify.show("Try again Hero!", "error");
            if (feedbackEl && q.explanation) {
                feedbackEl.style.display = 'block';
                feedbackEl.className = 'quiz-feedback-box';
                const text = (typeof q.explanation === 'object') ? q.explanation.text : q.explanation;
                feedbackEl.innerHTML = `<div style="font-size:13px; color:#475569; margin-bottom:12px; font-weight:600;">${text}</div>${typeof q.explanation === 'object' ? `<button class="g-tab active" style="width:100%" onclick="window.GlobeEngine.viewMapHint()">🌍 View Map Hint</button>` : ''}`;
            }
        }
    },

    viewMapHint: () => {
        const s = UniversalGlobeEngine.state;
        const q = s.data.questions[s.activeTab];
        const expl = q.explanation;
        if(expl.camera) UniversalGlobeEngine.focusOn(expl.camera.rotation, expl.camera.zoom);
        if(expl.highlight) q.highlight = expl.highlight;
        UniversalGlobeEngine.draw();
    },

    handleDrag: (e, id) => {
        const piece = UniversalGlobeEngine.state.data.pieces.find(p => p.id === id);
        const ev = e.touches ? e.touches[0] : e;
        const ghost = document.createElement('div');
        ghost.style.position = 'fixed'; ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '10000'; ghost.style.padding = '12px 20px';
        ghost.style.background = '#f59e0b'; ghost.style.color = 'white';
        ghost.style.borderRadius = '15px'; ghost.style.fontWeight = '900';
        ghost.innerText = piece.label;
        document.body.appendChild(ghost);
        const move = (m) => { const mv = m.touches ? m.touches[0] : m; ghost.style.left = `${mv.clientX - 40}px`; ghost.style.top = `${mv.clientY - 20}px`; };
        const up = (u) => { const uv = u.changedTouches ? u.changedTouches[0] : u; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up); ghost.remove(); UniversalGlobeEngine.checkDrop(uv.clientX, uv.clientY, piece); };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move); document.addEventListener('touchend', up);
    },

    checkDrop: (x, y, piece) => {
        const mount = document.getElementById('g-mount');
        const rect = mount.getBoundingClientRect();
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
        const coords = UniversalGlobeEngine.state.projection.invert([x - rect.left, y - rect.top]);
        if (d3.geoDistance(coords, piece.target) < 0.45) {
            UniversalGlobeEngine.state.placedPieces.push(piece.id);
            ManyaNotify.show("Perfect!", "success");
            UniversalGlobeEngine.renderUI();
            UniversalGlobeEngine.focusOn([-piece.target[0], -piece.target[1]], 1.1);
        } else { ManyaNotify.show("Try again!", "error"); }
    }
};

window.GlobeEngine = UniversalGlobeEngine;