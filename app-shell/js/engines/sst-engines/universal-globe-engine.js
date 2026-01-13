/**
 * Universal Globe Engine v4.0 (Final Polish)
 * - Centering: Fixed Canvas DPI scaling and positioning.
 * - Puzzle: Fixed Drag/Drop coordinate mapping.
 * - Visuals: Colors specific continents when placed.
 */

// --- CONTINENT MAPPING (IDs to Continent Keys) ---
// This maps ISO Numeric IDs to the Puzzle Piece IDs
const CONTINENT_MAP = {
    "africa": ["12","24","204","72","854","108","120","132","140","148","174","178","180","262","818","226","232","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","748","768","788","800","834","894","716"],
    "namerica": ["124","840","484","388","320","222","212","214","308","188","192","558","591"], // Canada, USA, Mexico...
    "samerica": ["32","68","76","152","170","218","254","328","600","604","740","858","862"], // Brazil, Argentina...
    "europe": ["250","276","380","826","724","620","616","528","578","756","752","372","348"], // France, Germany...
    "asia": ["156","356","392","410","360","764","704","682","586","458","364","116","048"], // China, India...
    "australia": ["36","554"], // Australia, NZ
    "antarctica": ["10"]
};

export const UniversalGlobeEngine = {
    state: {
        width: 0, height: 0,
        canvas: null, ctx: null,
        projection: null, path: null,
        worldData: null,
        data: null,
        rotation: [0, 0],
        scale: 1,
        activeTab: 0,
        placedPieces: [],
        isDraggingGlobe: false
    },

    injectStyles: () => {
        if (document.getElementById('uni-globe-v4-styles')) return;
        const style = document.createElement('style');
        style.id = 'uni-globe-v4-styles';
        style.innerHTML = `
            :root {
                --primary: #6366f1;
                --primary-light: #e0e7ff;
                --surface: #ffffff;
                --bg: #f1f5f9;
                --text: #1e293b;
                --text-muted: #64748b;
            }

            .globe-root { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                background: var(--bg); 
                padding: 16px; gap: 16px;
                overflow: hidden;
            }

            /* --- GLOBE CARD --- */
            .globe-card { 
                flex: 0 0 45vh; 
                position: relative; 
                background: radial-gradient(circle at 50% 50%, #f0f9ff 0%, #e0f2fe 100%);
                border-radius: 24px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                border: 1px solid #fff;
                overflow: hidden;
                display: flex; align-items: center; justify-content: center; /* CENTERING FIX */
            }
            .globe-canvas { 
                width: 100%; height: 100%; 
                cursor: grab; touch-action: none;
            }
            .globe-canvas:active { cursor: grabbing; }

            .map-hud {
                position: absolute; top: 12px; left: 12px; right: 12px;
                display: flex; justify-content: space-between; pointer-events: none;
            }
            .hud-pill {
                background: rgba(255,255,255,0.9); padding: 6px 12px;
                border-radius: 20px; font-size: 11px; font-weight: 800;
                color: var(--text); backdrop-filter: blur(4px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }

            /* --- CONTENT CARD --- */
            .content-card { 
                flex: 1; background: var(--surface); border-radius: 24px;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column;
                overflow: hidden; border: 1px solid #fff;
            }

            /* PUZZLE & TABS */
            .tabs-wrapper { padding: 16px; overflow-x: auto; white-space: nowrap; border-bottom: 1px solid #f1f5f9; }
            .case-btn { padding: 8px 16px; border-radius: 20px; background: #f8fafc; border: 1px solid #e2e8f0; margin-right: 8px; font-weight: 600; color: #64748b; font-size:13px; }
            .case-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
            
            .puzzle-grid { flex: 1; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; align-content: start; }
            .puzzle-piece { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 12px 4px; text-align: center; cursor: grab; user-select: none; }
            .puzzle-piece:active { transform: scale(0.95); border-color: var(--primary); }
            .puzzle-piece.placed { opacity: 0.4; filter: grayscale(1); background: #f0fdf4; border-color: #bbf7d0; pointer-events: none; }
            .piece-icon { font-size: 28px; display: block; }
            .piece-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }

            /* LESSON */
            .lesson-body { padding: 20px; overflow-y: auto; }
            .step-card { display: flex; gap: 12px; margin-bottom: 20px; position: relative; }
            .step-card:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 32px; bottom: 0; width: 2px; background: #e2e8f0; }
            .step-badge { width: 30px; height: 30px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; z-index: 2; border: 2px solid #fff; }
            
            /* GHOST DRAG */
            .drag-ghost { 
                position: fixed; pointer-events: none; z-index: 9999; 
                background: white; border: 2px solid var(--primary); border-radius: 12px; 
                padding: 8px; width: 80px; text-align: center; opacity: 0.95; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.25); transform: translate(-50%, -50%);
            }
            
            .globe-loader { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .spinner { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
            @keyframes spin { to { transform: rotate(360deg); } }
            
            /* FEEDBACK */
            .feedback-toast {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8);
                background: white; padding: 12px 20px; border-radius: 50px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                font-weight: 800; font-size: 14px; text-align: center;
                opacity: 0; pointer-events: none; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 100;
            }
            .feedback-toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            .feedback-toast.success { color: #22c55e; border: 2px solid #bbf7d0; }
            .feedback-toast.error { color: #ef4444; border: 2px solid #fecaca; }
        `;
        document.head.appendChild(style);
    },

    loadDependencies: async () => {
        const load = (src) => new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = () => reject();
            document.head.appendChild(s);
        });
        try {
            await load("./app-shell/js/lib/d3.min.js");
            await load("./app-shell/js/lib/topojson.min.js");
        } catch (e) {
            await load("https://d3js.org/d3.v7.min.js");
            await load("https://unpkg.com/topojson@3");
        }
    },

    renderLabeling: async (container, data) => {
        UniversalGlobeEngine.injectStyles();
        await UniversalGlobeEngine.loadDependencies();
        
        UniversalGlobeEngine.state.container = container;
        UniversalGlobeEngine.state.data = data;
        UniversalGlobeEngine.state.activeTab = 0;
        UniversalGlobeEngine.state.placedPieces = [];

        // Load Map
        if (!UniversalGlobeEngine.state.worldData) {
            try {
                const res = await fetch("./assets/sst/locating_africa/countries-50m.json");
                UniversalGlobeEngine.state.worldData = await res.json();
            } catch (e) {
                const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
                UniversalGlobeEngine.state.worldData = await res.json();
            }
        }

        container.innerHTML = `
            <div class="globe-root">
                <div class="globe-card" id="globe-mount">
                    <canvas id="globe-canvas" class="globe-canvas"></canvas>
                    <div class="map-hud">
                        <div class="hud-pill">${data.variantTitle}</div>
                        <div class="hud-pill" id="status-pill">Learn</div>
                    </div>
                    <div id="feedback-toast" class="feedback-toast"></div>
                </div>
                <div class="content-card" id="ui-mount"></div>
            </div>
        `;

        // Small delay to ensure container is laid out for correct sizing
        setTimeout(() => {
            UniversalGlobeEngine.initCanvas();
            UniversalGlobeEngine.renderUI();
        }, 50);
    },

    initCanvas: () => {
        const mount = document.getElementById('globe-mount');
        const canvas = document.getElementById('globe-canvas');
        if(!mount || !canvas) return;

        const rect = mount.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        UniversalGlobeEngine.state.width = rect.width;
        UniversalGlobeEngine.state.height = rect.height;
        UniversalGlobeEngine.state.ctx = ctx;

        // CENTERING FIX: Explicitly translate to center of current view
        const projection = d3.geoOrthographic()
            .scale(Math.min(rect.width, rect.height) / 2.2)
            .translate([rect.width / 2, rect.height / 2]) // Center X, Center Y
            .clipAngle(90);

        const path = d3.geoPath(projection, ctx);
        UniversalGlobeEngine.state.projection = projection;
        UniversalGlobeEngine.state.path = path;

        // Interaction
        d3.select(canvas).call(d3.drag()
            .on("start", () => { UniversalGlobeEngine.state.isDraggingGlobe = true; })
            .on("drag", (event) => {
                const rotate = projection.rotate();
                projection.rotate([rotate[0] + event.dx * 0.5, rotate[1] - event.dy * 0.5]);
                UniversalGlobeEngine.state.rotation = projection.rotate();
                UniversalGlobeEngine.draw();
            })
            .on("end", () => { UniversalGlobeEngine.state.isDraggingGlobe = false; })
        );

        // Init Rotation
        const initialRot = UniversalGlobeEngine.state.data.initialRotation || [0, -10, 0];
        projection.rotate(initialRot);
        UniversalGlobeEngine.draw();

        // Responsive Resize
        window.addEventListener('resize', () => {
            if(!mount) return;
            const r = mount.getBoundingClientRect();
            canvas.width = r.width * dpr; canvas.height = r.height * dpr;
            ctx.scale(dpr, dpr);
            UniversalGlobeEngine.state.width = r.width; UniversalGlobeEngine.state.height = r.height;
            projection.translate([r.width/2, r.height/2]);
            UniversalGlobeEngine.draw();
        });
    },

    draw: () => {
        const { ctx, width, height, path, projection, worldData, data, placedPieces, activeTab } = UniversalGlobeEngine.state;
        if (!ctx) return;
        
        ctx.clearRect(0, 0, width, height);

        // 1. OCEAN
        const grad = ctx.createRadialGradient(width/2, height/2, height/5, width/2, height/2, height/1.5);
        grad.addColorStop(0, "#f0f9ff"); grad.addColorStop(1, "#bae6fd");
        ctx.fillStyle = grad; ctx.beginPath(); path({type: "Sphere"}); ctx.fill();

        // 2. GRID
        ctx.strokeStyle = "rgba(30, 58, 138, 0.1)"; ctx.lineWidth = 0.5;
        ctx.beginPath(); path(d3.geoGraticule()()); ctx.stroke();

        if (worldData) {
            const countries = topojson.feature(worldData, worldData.objects.countries);

            // 3. BASE LAND (White)
            ctx.beginPath(); path(countries);
            ctx.fillStyle = "#ffffff"; ctx.fill();

            // 4. COLORED CONTINENTS (Puzzle Logic)
            if (data.mode === 'puzzle' && placedPieces.length > 0) {
                placedPieces.forEach(pieceId => {
                    const idsToColor = CONTINENT_MAP[pieceId];
                    if (idsToColor) {
                        const continentFeatures = {
                            type: "FeatureCollection",
                            features: countries.features.filter(f => idsToColor.includes(String(f.id)))
                        };
                        ctx.beginPath(); path(continentFeatures);
                        ctx.fillStyle = "#86efac"; // Success Green
                        ctx.fill();
                    }
                });
            }

            // 5. BORDERS & COASTLINE
            // Internal Borders
            ctx.beginPath(); 
            path(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b));
            ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 0.5; ctx.stroke();

            // Coastline
            ctx.beginPath(); 
            path(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a === b));
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.0; ctx.stroke();
        }

        // 6. MARKERS (Lesson/Game)
        const item = data.mode === 'lesson' ? data.cases[activeTab] : 
                     data.mode === 'game' ? data.questions[activeTab] : null;

        if (item) {
            // Arcs
            if (item.connection) {
                ctx.beginPath();
                path({type: "LineString", coordinates: [item.connection.from, item.connection.to]});
                ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
            }
            // Markers
            if (item.markers) {
                const center = projection.invert([width/2, height/2]);
                item.markers.forEach(m => {
                    if (d3.geoDistance(center, [m.lon, m.lat]) < 1.57) {
                        const [x, y] = projection([m.lon, m.lat]);
                        
                        // Glow
                        ctx.beginPath(); ctx.arc(x, y, 6, 0, 2*Math.PI);
                        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
                        
                        // Pin
                        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2*Math.PI);
                        ctx.fillStyle = m.color || "#ef4444"; ctx.fill();
                        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();

                        ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
                        ctx.fillText(m.label, x, y - 12);
                    }
                });
            }
        }
    },

    renderUI: () => {
        const { data } = UniversalGlobeEngine.state;
        const mount = document.getElementById('ui-mount');
        mount.innerHTML = '';

        if (data.mode === 'puzzle') {
            mount.innerHTML = `
                <div class="puzzle-header" style="padding:20px 20px 10px; text-align:center; border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:18px; font-weight:800; margin-bottom:4px;">Build the World</div>
                    <div style="font-size:13px; color:#64748b;">Drag items to the globe</div>
                </div>
                <div class="puzzle-grid" id="puzzle-grid"></div>
            `;
            UniversalGlobeEngine.renderPuzzlePieces(document.getElementById('puzzle-grid'));
            
            const pill = document.getElementById('status-pill');
            if(pill) pill.innerText = `0 / ${data.pieces.length}`;

        } else if (data.mode === 'lesson') {
            const tabs = document.createElement('div');
            tabs.className = 'tabs-wrapper';
            data.cases.forEach((c, i) => {
                const btn = document.createElement('button');
                btn.className = `case-btn ${i === UniversalGlobeEngine.state.activeTab ? 'active' : ''}`;
                btn.innerText = c.tabTitle;
                btn.onclick = () => UniversalGlobeEngine.switchTab(i);
                tabs.appendChild(btn);
            });
            mount.appendChild(tabs);
            
            const body = document.createElement('div');
            body.className = 'lesson-body';
            const cur = data.cases[UniversalGlobeEngine.state.activeTab];
            body.innerHTML = `
                <div style="font-size:18px; font-weight:800; margin-bottom:8px;">${cur.title}</div>
                <div style="font-size:14px; color:#64748b; margin-bottom:20px;">${cur.description}</div>
                ${cur.steps.map((s, i) => `<div class="step-card"><div class="step-badge">${i+1}</div><div style="font-size:15px; color:#334155; margin-top:2px;">${s}</div></div>`).join('')}
            `;
            mount.appendChild(body);
        }
    },

    renderPuzzlePieces: (grid) => {
        const { data, placedPieces } = UniversalGlobeEngine.state;
        grid.innerHTML = '';
        data.pieces.forEach(p => {
            const isPlaced = placedPieces.includes(p.id);
            const el = document.createElement('div');
            el.className = `puzzle-piece ${isPlaced?'placed':''}`;
            el.innerHTML = `<span class="piece-icon">${p.icon}</span><span class="piece-label">${p.label}</span>`;
            if(!isPlaced) {
                const handler = (e) => UniversalGlobeEngine.handleDrag(e, p);
                el.addEventListener('mousedown', handler); 
                el.addEventListener('touchstart', handler, {passive:false});
            }
            grid.appendChild(el);
        });
        const pill = document.getElementById('status-pill');
        if(pill) pill.innerText = `${placedPieces.length} / ${data.pieces.length}`;
    },

    switchTab: (i) => {
        UniversalGlobeEngine.state.activeTab = i;
        UniversalGlobeEngine.renderUI();
        const rot = UniversalGlobeEngine.state.data.cases[i].initialRotation;
        if(rot) {
            const { projection } = UniversalGlobeEngine.state;
            d3.transition().duration(1000).tween("rotate", () => {
                const r = d3.interpolate(projection.rotate(), rot);
                return (t) => { projection.rotate(r(t)); UniversalGlobeEngine.draw(); };
            });
        }
    },

    handleDrag: (e, piece) => {
        e.preventDefault();
        const t = e.touches ? e.touches[0] : e;
        
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.innerHTML = `<span style="font-size:24px">${piece.icon}</span><br/><span style="font-size:10px; font-weight:bold">${piece.label}</span>`;
        ghost.style.left = `${t.clientX}px`; 
        ghost.style.top = `${t.clientY}px`;
        document.body.appendChild(ghost);

        const move = (ev) => {
            ev.preventDefault();
            const touch = ev.touches ? ev.touches[0] : ev;
            ghost.style.left = `${touch.clientX}px`; 
            ghost.style.top = `${touch.clientY}px`;
        };

        const up = (ev) => {
            document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
            document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up);
            ghost.remove();
            
            const touch = ev.changedTouches ? ev.changedTouches[0] : ev;
            UniversalGlobeEngine.checkDrop(touch.clientX, touch.clientY, piece);
        };

        document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, {passive:false}); document.addEventListener('touchend', up);
    },

    checkDrop: (x, y, piece) => {
        const mount = document.getElementById('globe-mount');
        const rect = mount.getBoundingClientRect();
        
        // Ensure drop is within globe bounds
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;

        const { projection } = UniversalGlobeEngine.state;
        
        // Adjust coordinates relative to canvas
        const coords = projection.invert([x - rect.left, y - rect.top]);
        if(!coords) return;

        const dist = d3.geoDistance(coords, piece.target);

        // Distance Threshold (0.5 radians ~ 28 degrees, generous for fingers)
        if (dist < 0.5) {
            UniversalGlobeEngine.state.placedPieces.push(piece.id);
            UniversalGlobeEngine.showToast(`Correct! ${piece.label}`, 'success');
            
            // Refresh Dock
            UniversalGlobeEngine.renderPuzzlePieces(document.getElementById('puzzle-grid'));
            
            // Auto Rotate to Target
            d3.transition().duration(600).tween("rotate", () => {
                const r = d3.interpolate(projection.rotate(), [-piece.target[0], -piece.target[1]]);
                return (t) => { projection.rotate(r(t)); UniversalGlobeEngine.draw(); };
            });
            
            UniversalGlobeEngine.draw();
        } else {
            UniversalGlobeEngine.showToast('Not quite there!', 'error');
        }
    },

    showToast: (msg, type) => {
        const toast = document.getElementById('feedback-toast');
        toast.innerText = msg;
        toast.className = `feedback-toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 1500);
    }
};

window.GlobeTimeEngine = UniversalGlobeEngine;