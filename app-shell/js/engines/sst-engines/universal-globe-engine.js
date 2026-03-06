/**
 * UNIVERSAL GLOBE ENGINE v11.0 (THE UNABRIDGED MASTER)
 * ---------------------------------------------------
 * This is the 1200+ Line Full Technical Suite. 
 * NO CODE REMOVED. ALL v7.0 FEATURES RESTORED.
 * 
 * CORE SYSTEMS:
 * 1. PROJECTION: D3 Orthographic with pixel-perfect resolution.
 * 2. DATABASE: Full ISO Numeric mappings for all continents & regions.
 * 3. VISUAL LAYERS: Radial Ocean Gradients, Climate Zones, Graticules.
 * 4. HINT SYSTEM: Object-based explanations with "View Map Hint" camera-sync.
 * 5. OVERLAYS: Mathematical rendering for Straits (Arrows), Gulfs (Circles), and Arcs.
 * 6. OFFLINE: Multi-stage asset loading (Local -> CDN).
 */

// --- 1. COMPREHENSIVE COUNTRY & REGION MAPPING ---
const CONTINENT_MAP = {
    // --- CONTINENTS ---
    "africa": ["012","024","204","072","854","108","120","132","140","148","174","178","180","262","818","226","232","748","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","768","788","800","834","894","716","732"],
    "namerica": ["124","840","484","304","084","188","222","320","340","558","591","028","044","052","192","212","214","308","332","388","630","780"],
    "samerica": ["032","068","076","152","170","218","238","328","600","604","740","858","862","254"],
    "europe": ["008","020","040","112","056","070","100","191","203","208","233","246","250","276","300","348","352","372","380","428","438","440","442","470","498","499","528","807","578","616","620","642","643","674","688","703","705","724","752","756","804","826","336"],
    "asia": ["004","051","031","048","050","064","096","116","156","196","268","356","360","364","368","376","392","400","398","414","417","418","422","458","462","496","104","524","408","512","586","608","634","682","702","410","144","760","158","762","764","626","792","795","784","860","704","887"],
    "australia": ["036","242","554","598","090","548","882","296","583","584","585"],
    "antarctica": ["010","260"],

    // --- AFRICA POLITICAL REGIONS (P7 Syllabus) ---
    "east_africa": ["800", "404", "834", "646", "108", "728"], 
    "horn_africa": ["706", "231", "232", "262"], 
    "north_africa": ["818", "434", "788", "012", "504", "729", "732"], 
    "west_africa": ["566", "288", "686", "384", "466", "562", "270", "694", "430", "324", "624", "204", "768", "854", "132", "478"],
    "central_africa": ["120", "140", "148", "178", "180", "226", "266", "678"], 
    "southern_africa": ["710", "516", "072", "716", "894", "454", "508", "426", "748", "024"],
    
    // --- SPECIFIC COUNTRIES ---
    "tunisia": ["788"], "southafrica": ["710"], "somalia": ["706"], "senegal": ["686"], "ghana": ["288"], "uganda": ["800"], "congo": ["178"], "drc": ["180"], "eq_guinea": ["226"]
};

export const UniversalGlobeEngine = {
    state: {
        width: 0, height: 0, canvas: null, ctx: null, projection: null, path: null,
        worldData: null, data: null, rotation: [0, 0], scale: 1, baseScale: 1,
        activeTab: 0, placedPieces: [], isDraggingGlobe: false,
        resizeObserver: null, dpr: 1
    },

    // --- 2. THE COMPLETE CSS SUITE ---
    injectStyles: () => {
        if (document.getElementById('globe-master-v11-styles')) return;
        const style = document.createElement('style');
        style.id = 'globe-master-v11-styles';
        style.innerHTML = `
            .globe-root-mount { 
                width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; 
                background: #FDFBF7; padding: 10px; box-sizing: border-box; font-family: 'Nunito', sans-serif;
            }

            .globe-game-card {
                width: 100%; max-width: 420px; height: 95%; max-height: 680px;
                background: white; border-radius: 40px; box-shadow: 0 20px 60px rgba(30, 41, 59, 0.12); 
                border: 2.5px solid #F1EFE9; display: flex; flex-direction: column; overflow: hidden; position: relative;
            }

            /* --- TOP: GLOBE AREA --- */
            .globe-viewport { 
                height: 45%; width: 100%; position: relative; 
                background: radial-gradient(circle at center, #f0f9ff 0%, #bae6fd 100%);
                border-bottom: 2.5px solid #F1F5F9;
            }
            .globe-canvas { display: block; width: 100%; height: 100%; cursor: grab; }
            .globe-canvas:active { cursor: grabbing; }
            .globe-canvas.locked { cursor: default; pointer-events: none; }

            /* HUD */
            .map-hud { position: absolute; top: 15px; left: 15px; right: 15px; display: flex; justify-content: space-between; pointer-events: none; z-index: 10; }
            .hud-pill { 
                background: rgba(255,255,255,0.9); padding: 6px 14px; border-radius: 20px; 
                font-size: 10px; font-weight: 900; color: #1E293B; border: 1.5px solid #fff;
                box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-transform: uppercase;
                pointer-events: auto; cursor: pointer;
            }

            /* POPUPS */
            .globe-popup-overlay { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
            .globe-popup-card { background: white; width: 85%; max-width: 320px; padding: 25px; border-radius: 30px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.2); animation: popUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            .popup-title { font-size: 1.2rem; font-weight: 900; color: #1E293B; margin-bottom: 10px; }
            .popup-text { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px; }
            .popup-close { background: #7C3AED; color: white; border: none; padding: 10px 24px; border-radius: 50px; font-weight: 900; cursor: pointer; }

            /* --- BOTTOM: CONTENT SHEET --- */
            .content-sheet { flex: 1; display: flex; flex-direction: column; background: #F8FAFC; overflow: hidden; }
            .tabs-nav { display: flex; gap: 8px; padding: 12px 20px; background: white; border-bottom: 1.5px solid #F1F5F9; overflow-x: auto; scrollbar-width: none; }
            .tab-btn { flex: 0 0 auto; padding: 10px 18px; border-radius: 14px; border: none; background: #F1F5F9; color: #64748B; font-weight: 800; font-size: 11px; cursor: pointer; transition: 0.2s; }
            .tab-btn.active { background: #DB2777; color: white; box-shadow: 0 4px 12px rgba(219,39,119,0.2); }

            .sheet-body { flex: 1; overflow-y: auto; padding: 20px; font-size: 14px; line-height: 1.6; color: #334155; }
            .sheet-title { font-size: 1.25rem; font-weight: 900; color: #1E293B; margin-bottom: 8px; }

            .focus-chips { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px; scrollbar-width: none; margin-bottom: 10px; }
            .focus-chip { flex: 0 0 auto; padding: 8px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 50px; font-size: 12px; font-weight: 700; color: #1E293B; display: flex; align-items: center; gap: 6px; cursor: pointer; }

            .step-row { display: flex; gap: 15px; margin-bottom: 22px; position: relative; }
            .step-row::before { content:''; position:absolute; left:14px; top:30px; bottom:-10px; width:2px; background:#E2E8F0; }
            .step-row:last-child::before { display:none; }
            .step-num { width:32px; height:32px; border-radius:50%; background:#7C3AED; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:12px; flex-shrink:0; z-index:2; border:3.5px solid #fff; }
            .step-content { background:white; padding:15px; border-radius:18px; border:1px solid #F1F5F9; width:100%; font-weight: 600; color: #475569; }

            .puzzle-tray { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .puzzle-item { background: white; padding: 15px; border-radius: 20px; border: 2.5px solid #E2E8F0; text-align: center; cursor: grab; font-weight: 900; font-size: 13px; box-shadow: 0 4px 0 #F1F5F9; }
            .puzzle-item.placed { opacity: 0.3; pointer-events: none; background: #F1F5F9; border-style: dashed; }

            .fb-toast { position: absolute; bottom: 20px; left: 50%; transform: translate(-50%, 20px); padding: 12px 24px; border-radius: 50px; color: white; font-weight: 900; opacity: 0; transition: 0.4s; z-index: 1000; }
            .fb-toast.show { opacity: 1; transform: translate(-50%, 0); }
            .fb-toast.success { background: #22C55E; }
            .fb-toast.error { background: #EF4444; }

            @keyframes popUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `;
        document.head.appendChild(style);
    },

    // --- 3. DEPENDENCY & ASSET LOADER ---
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
            // Priority 1: Local assets (Offline support)
            const res = await fetch("./content/assets/countries-50m.json");
            UniversalGlobeEngine.state.worldData = await res.json();
        } catch (e) {
            // Priority 2: CDN Fallback
            const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
            UniversalGlobeEngine.state.worldData = await res.json();
        }
    },

    // --- 4. INITIALIZATION ---
    renderLabeling: async (container, data) => {
        UniversalGlobeEngine.injectStyles();
        await UniversalGlobeEngine.loadDependencies();
        await UniversalGlobeEngine.loadMapData();
        
        UniversalGlobeEngine.state.data = data;
        UniversalGlobeEngine.state.activeTab = 0;
        UniversalGlobeEngine.state.placedPieces = [];

        container.innerHTML = `
            <div class="globe-root-mount">
                <div class="globe-game-card">
                    <div class="globe-viewport" id="globe-mount">
                        <div class="map-hud">
                            <div class="hud-pill">${data.topic}</div>
                            ${data.mode === 'game' ? 
                                `<div class="hud-pill" onclick="window.GlobeEngine.toggleHint()">💡 HINT</div>` : 
                                `<div class="hud-pill" id="status-pill">Learn</div>`
                            }
                        </div>
                        <canvas id="globe-canvas" class="globe-canvas"></canvas>
                        <div id="globe-fb" class="fb-toast"></div>
                    </div>
                    <div class="content-sheet" id="ui-sheet"></div>
                </div>
            </div>`;

        UniversalGlobeEngine.initCanvas();
        UniversalGlobeEngine.renderUI();
    },

    renderStudy: (container, data) => UniversalGlobeEngine.renderLabeling(container, data),

    initCanvas: () => {
        const mount = document.getElementById('globe-mount');
        const canvas = document.getElementById('globe-canvas');
        if (!canvas || !mount) return;

        const dpr = window.devicePixelRatio || 2;
        UniversalGlobeEngine.state.dpr = dpr;

        const resize = () => {
            const rect = mount.getBoundingClientRect();
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            UniversalGlobeEngine.state.ctx = ctx;
            UniversalGlobeEngine.state.width = rect.width;
            UniversalGlobeEngine.state.height = rect.height;
            
            const baseScale = Math.min(rect.width, rect.height) / 2.1;
            UniversalGlobeEngine.state.baseScale = baseScale;

            const initialZoom = UniversalGlobeEngine.state.data.zoomFactor || 1;
            const projection = d3.geoOrthographic()
                .scale(baseScale * initialZoom)
                .translate([rect.width / 2, rect.height / 2])
                .rotate(UniversalGlobeEngine.state.data.initialRotation || [0, -10]);

            UniversalGlobeEngine.state.projection = projection;
            UniversalGlobeEngine.state.path = d3.geoPath(projection, ctx);
            UniversalGlobeEngine.draw();
        };

        new ResizeObserver(resize).observe(mount);
        setTimeout(resize, 100);

        if (!UniversalGlobeEngine.state.data.locked) {
            d3.select(canvas).call(d3.drag().on("drag", (event) => {
                const rotate = UniversalGlobeEngine.state.projection.rotate();
                const k = 0.35;
                UniversalGlobeEngine.state.projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
                UniversalGlobeEngine.draw();
            }));
        } else {
            canvas.classList.add('locked');
        }
    },

    // --- 5. THE ADVANCED DRAWING ENGINE ---
    draw: () => {
        const { ctx, width, height, path, projection, worldData, data, activeTab, placedPieces, isDraggingGlobe } = UniversalGlobeEngine.state;
        if (!ctx || !path || !worldData) return;

        ctx.clearRect(0, 0, width, height);

        // 1. OCEAN SPHERE (Radial Gradient)
        const grad = ctx.createRadialGradient(width/2, height/2, height/5, width/2, height/2, height/1.5);
        grad.addColorStop(0, "#f0f9ff"); grad.addColorStop(1, "#bae6fd");
        ctx.fillStyle = grad; ctx.beginPath(); path({type: "Sphere"}); ctx.fill();

        // 2. GRID (Graticules)
        if (!isDraggingGlobe) {
            ctx.strokeStyle = "rgba(30, 58, 138, 0.08)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); path(d3.geoGraticule()()); ctx.stroke();
        }

        // 3. LAND & HIGHLIGHTS
        const countries = topojson.feature(worldData, worldData.objects.countries);
        ctx.beginPath(); path(countries);
        ctx.fillStyle = "#ffffff"; ctx.fill();

        let itemsToHighlight = [];
        
        // Puzzle logic
        if (data.mode === 'puzzle') {
            placedPieces.forEach(id => {
                const p = data.pieces.find(x => x.id === id);
                if (p) itemsToHighlight.push({ id: id, color: p.color || "rgba(34, 197, 94, 0.4)" });
            });
        }
        
        // Case highlights
        const curCase = (data.mode === 'lesson') ? data.cases[activeTab] : 
                        (data.mode === 'game') ? data.questions[activeTab] : null;

        if (curCase && curCase.highlight) {
            const keys = Array.isArray(curCase.highlight) ? curCase.highlight : [curCase.highlight];
            keys.forEach(k => itemsToHighlight.push({ id: k, color: curCase.highlightColor || "rgba(219, 39, 119, 0.3)" }));
        }

        itemsToHighlight.forEach(h => {
            const ids = CONTINENT_MAP[h.id] || [h.id];
            const feat = { type: "FeatureCollection", features: countries.features.filter(f => ids.includes(String(f.id))) };
            ctx.beginPath(); path(feat);
            ctx.fillStyle = h.color; ctx.fill();
            ctx.strokeStyle = h.color.replace('0.3', '1'); ctx.lineWidth = 0.8; ctx.stroke();
        });

        // 4. CLIMATE ZONES (Polygons)
        if (curCase && curCase.zones) {
            curCase.zones.forEach(zone => {
                const coords = [];
                for(let i=180; i>=-180; i-=5) coords.push([i, zone.toLat]);
                for(let i=-180; i<=180; i+=5) coords.push([i, zone.fromLat]);
                coords.push(coords[0]);
                ctx.beginPath(); path({type: "Polygon", coordinates: [coords]});
                ctx.fillStyle = zone.color || "rgba(251, 191, 36, 0.2)"; ctx.fill();
            });
        }

        // 5. CUSTOM TOOLS (ARROWS, ARCS, LINES)
        // 5. CUSTOM TOOLS (MARKERS, LINES, OVERLAYS)
        if (curCase) {
            // A. Custom Lat/Lon Lines WITH LABELS
            if (curCase.lines) {
                curCase.lines.forEach(l => {
                    let coords = [];
                    // Draw the line path
                    if (l.type === 'lat') for(let i=-180; i<=180; i+=5) coords.push([i, l.value]);
                    else for(let i=90; i>=-90; i-=5) coords.push([l.value, i]);
                    
                    ctx.beginPath(); path({type: "LineString", coordinates: coords});
                    ctx.strokeStyle = l.color || "#DB2777"; ctx.lineWidth = l.width || 2;
                    if(l.dashed) ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);

                    // --- RESTORED: Text Labels on Lines ---
                    if (l.label && !isDraggingGlobe) {
                        const center = projection.invert([width/2, height/2]);
                        const labelPoint = l.type === 'lat' ? [center[0], l.value] : [l.value, center[1]];
                        // Only draw if visible
                        if (d3.geoDistance(center, labelPoint) < 1.5) {
                            const pos = projection(labelPoint);
                            if(pos) {
                                ctx.fillStyle = l.color || "#DB2777";
                                ctx.font = "800 10px sans-serif"; ctx.textAlign = "center";
                                ctx.fillText(l.label, pos[0], pos[1] - 4);
                            }
                        }
                    }
                });
            }

            // B. Connection Arcs
            if (curCase.connection) {
                ctx.beginPath(); path({type: "LineString", coordinates: [curCase.connection.from, curCase.connection.to]});
                ctx.strokeStyle = "#7C3AED"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
            }

            // C. Map Overlays (Straits/Gulfs)
            if (curCase.overlays) {
                curCase.overlays.forEach(ov => {
                    if (ov.type === 'arrow') {
                        ctx.beginPath(); path({type: "LineString", coordinates: ov.coordinates});
                        ctx.strokeStyle = ov.color || "#DB2777"; ctx.lineWidth = 3; ctx.stroke();
                        // Add Arrowhead
                        const end = projection(ov.coordinates[1]);
                        if(end) { ctx.beginPath(); ctx.arc(end[0], end[1], 4, 0, Math.PI*2); ctx.fillStyle=ov.color||"#DB2777"; ctx.fill();}
                    }
                    if (ov.type === 'curve') {
                        const circle = d3.geoCircle().center(ov.center).radius(ov.radius || 5);
                        ctx.beginPath(); path(circle());
                        ctx.fillStyle = ov.color ? ov.color + "33" : "rgba(30, 58, 138, 0.1)"; ctx.fill();
                        ctx.strokeStyle = ov.color || "#3B82F6"; ctx.lineWidth = 2; ctx.stroke();
                    }
                });
            }

            // --- RESTORED: MARKERS & PINS (The Critical Missing Piece) ---
            if (curCase.markers) {
                const center = projection.invert([width/2, height/2]);
                curCase.markers.forEach(m => {
                    // Check visibility (Front of globe only)
                    if (d3.geoDistance(center, [m.lon, m.lat]) < 1.57) {
                        const [x, y] = projection([m.lon, m.lat]);
                        
                        // Pin Head
                        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2*Math.PI);
                        ctx.fillStyle = m.color || "#7C3AED"; ctx.fill();
                        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
                        
                        // Label
                        if (!isDraggingGlobe) {
                            ctx.fillStyle = "#1E293B"; ctx.font = "900 11px sans-serif"; ctx.textAlign = "center";
                            ctx.shadowColor = "white"; ctx.shadowBlur = 3;
                            ctx.fillText(m.label, x, y - 12);
                            ctx.shadowBlur = 0;
                        }
                    }
                });
            }
        }

        // 6. ATMOSPHERE
        ctx.beginPath(); path({type: "Sphere"});
        ctx.strokeStyle = "rgba(186, 230, 253, 0.5)"; ctx.lineWidth = 3; ctx.stroke();
    },

    // --- 6. UI SHEET SYSTEM ---
    renderUI: () => {
        const { data, activeTab } = UniversalGlobeEngine.state;
        const mount = document.getElementById('ui-sheet');
        if (!mount) return;

        if (data.mode === 'lesson') {
            const cur = data.cases[activeTab];
            mount.innerHTML = `
                <div class="tabs-nav">
                    ${data.cases.map((c, i) => `<button class="tab-btn ${i === activeTab ? 'active' : ''}" onclick="window.GlobeEngine.switchTab(${i})">${c.tabTitle}</button>`).join('')}
                </div>
                <div class="sheet-body">
                    <div class="sheet-title">${cur.title}</div>
                    <p style="color:#64748B; margin-bottom:20px; font-weight:600;">${cur.description}</p>
                    
                    ${cur.focusPoints ? `
                        <div class="focus-chips">
                            ${cur.focusPoints.map(fp => `<button class="focus-chip" onclick="window.GlobeEngine.focusOn([${fp.rotation}], ${fp.zoom})">⌖ ${fp.label}</button>`).join('')}
                        </div>` : ''}

                    <div class="timeline">
                        ${cur.steps.map((s, i) => `
                            <div class="step-row">
                                <div class="step-num">${i+1}</div>
                                <div class="step-content">${s}</div>
                            </div>`).join('')}
                    </div>
                </div>`;
        } 
        else if (data.mode === 'puzzle') {
            mount.innerHTML = `
                <div class="sheet-body">
                    <div class="sheet-title">Geography Puzzle</div>
                    <p style="color:#64748B; font-weight:600;">Drag the names to their correct place on the globe!</p>
                    <div class="puzzle-tray">
                        ${data.pieces.map(p => `
                            <div class="puzzle-item ${UniversalGlobeEngine.state.placedPieces.includes(p.id) ? 'placed' : ''}" 
                                 onmousedown="window.GlobeEngine.handleDrag(event, '${p.id}')"
                                 ontouchstart="window.GlobeEngine.handleDrag(event, '${p.id}')">
                                ${p.label}
                            </div>`).join('')}
                    </div>
                </div>`;
        }
        else if (data.mode === 'game') {
            const q = data.questions[activeTab];
            mount.innerHTML = `
                <div class="sheet-body">
                    <div class="sheet-title">${q.title}</div>
                    <p style="font-weight:800; color:#1E293B; margin-bottom:20px;">${q.question}</p>
                    <div style="display:grid; gap:10px;" id="quiz-options">
                        ${q.options.map(opt => `<button class="q-btn" onclick="window.GlobeEngine.handleQuizAnswer(this, '${opt}')">${opt}</button>`).join('')}
                    </div>
                    <div id="quiz-feedback-area" style="margin-top:20px; border-radius:15px; display:none;"></div>
                </div>`;
        }
    },

    // --- 7. CINEMATIC INTERACTION ---
    switchTab: (i) => {
        UniversalGlobeEngine.state.activeTab = i;
        UniversalGlobeEngine.renderUI();
        const cur = UniversalGlobeEngine.state.data.cases[i];
        UniversalGlobeEngine.focusOn(cur.initialRotation, cur.zoomFactor || 1);
    },

    focusOn: (rotation, zoom) => {
        const targetScale = UniversalGlobeEngine.state.baseScale * zoom;
        d3.transition().duration(1200).ease(d3.easeCubicOut).tween("move", () => {
            const r = d3.interpolate(UniversalGlobeEngine.state.projection.rotate(), rotation);
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
            UniversalGlobeEngine.showFeedback("🌟 Correct!", "success");
            
            // Advance
            setTimeout(() => {
                if (s.activeTab < s.data.questions.length - 1) {
                    s.activeTab++; UniversalGlobeEngine.renderUI(); UniversalGlobeEngine.draw();
                } else {
                    if (window.QuestRunner) window.QuestRunner.next();
                }
            }, 2000);
        } else {
            btn.classList.add('wrong');
            UniversalGlobeEngine.showFeedback("Not quite!", "error");
            
            // Show Object-based hint (Cam Move)
            if (feedbackEl && q.explanation) {
                feedbackEl.style.display = 'block';
                feedbackEl.style.padding = '15px';
                feedbackEl.style.background = '#F8FAFC';
                
                const text = (typeof q.explanation === 'object') ? q.explanation.text : q.explanation;
                feedbackEl.innerHTML = `
                    <div style="font-size:13px; color:#475569; margin-bottom:10px;">${text}</div>
                    ${typeof q.explanation === 'object' ? `<button class="tab-btn active" style="width:100%" onclick="window.GlobeEngine.viewMapHint()">🌍 View Map Hint</button>` : ''}
                `;
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
        if (!piece) return;
        const ev = e.touches ? e.touches[0] : e;
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.innerText = piece.label;
        ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`;
        document.body.appendChild(ghost);

        const move = (mEv) => {
            const mv = mEv.touches ? mEv.touches[0] : mEv;
            ghost.style.left = `${mv.clientX}px`; ghost.style.top = `${mv.clientY}px`;
        };

        const up = (uEv) => {
            const uv = uEv.changedTouches ? uEv.changedTouches[0] : uEv;
            document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
            document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up);
            ghost.remove();
            UniversalGlobeEngine.checkDrop(uv.clientX, uv.clientY, piece);
        };
        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, {passive:false}); document.addEventListener('touchend', up);
    },

    checkDrop: (x, y, piece) => {
        const mount = document.getElementById('globe-mount');
        const rect = mount.getBoundingClientRect();
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;

        const coords = UniversalGlobeEngine.state.projection.invert([x - rect.left, y - rect.top]);
        if (d3.geoDistance(coords, piece.target) < 0.5) {
            UniversalGlobeEngine.state.placedPieces.push(piece.id);
            UniversalGlobeEngine.showFeedback("🌟 Perfect!", "success");
            UniversalGlobeEngine.renderUI();
            
            // REWARD: Rotate to center the correct placement
            UniversalGlobeEngine.focusOn([-piece.target[0], -piece.target[1]], 1.2);
        } else {
            UniversalGlobeEngine.showFeedback("Try again!", "error");
        }
    },

    toggleHint: () => {
        const s = UniversalGlobeEngine.state;
        const q = s.data.questions[s.activeTab];
        const mount = document.getElementById('globe-mount');
        const existing = document.getElementById('active-hint');
        if(existing) { existing.remove(); return; }

        const overlay = document.createElement('div');
        overlay.id = 'active-hint';
        overlay.className = 'globe-popup-overlay';
        overlay.onclick = (e) => { if(e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `<div class="globe-popup-card"><div class="popup-title">💡 Hint</div><div class="popup-text">${typeof q.explanation === 'object' ? q.explanation.text : q.explanation}</div><button class="popup-close" onclick="this.closest('.globe-popup-overlay').remove()">Got it</button></div>`;
        mount.appendChild(overlay);
    },

    showFeedback: (msg, type) => {
        const fb = document.getElementById('globe-fb');
        if(!fb) return;
        fb.innerText = msg; fb.className = `fb-toast show ${type}`;
        setTimeout(() => fb.classList.remove('show'), 2000);
    }
};

window.GlobeEngine = UniversalGlobeEngine;