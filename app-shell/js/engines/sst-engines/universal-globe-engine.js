/**
 * Universal Globe Engine v3.1 (Mobile Performance Optimized)
 * - Capped DPI for mobile performance
 * - "Lo-Fi" Rendering during drag (hides borders/shadows while spinning)
 * - Pre-calculated geometry
 */

const COUNTRY_LOOKUP = {
    // ... (Keep your country list here, same as before) ...
    "800": "Uganda", "404": "Kenya", "834": "Tanzania", "566": "Nigeria", "818": "Egypt", "710": "South Africa"
};

const CONTINENT_MAP = {
    "africa": ["12","24","204","72","854","108","120","132","140","148","174","178","180","262","818","226","232","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","748","768","788","800","834","894","716"],
    "namerica": ["124","840","484","388","320","222"], 
    "samerica": ["32","68","76","152","170"], 
    "europe": ["250","276","380","826","724","620"], 
    "asia": ["156","356","392","410","360"], 
    "australia": ["36","554"],
    "antarctica": ["10"]
};

export const UniversalGlobeEngine = {
    state: {
        width: 0, height: 0,
        canvas: null, ctx: null,
        projection: null, path: null,
        data: null,
        rotation: [0, 0],
        scale: 1,
        activeTab: 0,
        placedPieces: [],
        isDraggingGlobe: false,
        
        // CACHED GEOMETRY (Performance Boost)
        geoLand: null,
        geoBorders: null,
        geoCoastline: null,
        geoGraticule: null
    },

    injectStyles: () => {
        if (document.getElementById('uni-globe-v3-1-styles')) return;
        const style = document.createElement('style');
        style.id = 'uni-globe-v3-1-styles';
        style.innerHTML = `
            :root { --primary: #6366f1; --primary-light: #e0e7ff; --bg: #f1f5f9; }
            .globe-root { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--bg); padding: 16px; gap: 16px; overflow: hidden; }
            
            .globe-card { 
                flex: 0 0 45vh; position: relative; background: #f0f9ff;
                border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                border: 1px solid #e0f2fe; touch-action: none; cursor: grab; overflow: hidden;
            }
            .globe-card:active { cursor: grabbing; }

            .content-card { 
                flex: 1; background: #fff; border-radius: 24px;
                box-shadow: 0 -4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column;
                overflow: hidden; border: 1px solid #fff;
            }

            .map-hud { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; pointer-events: none; }
            .hud-pill { background: rgba(255,255,255,0.9); padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; color: #1e293b; backdrop-filter: blur(4px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

            .tabs-wrapper { padding: 16px; overflow-x: auto; white-space: nowrap; border-bottom: 1px solid #f1f5f9; }
            .case-btn { padding: 8px 16px; border-radius: 20px; background: #f8fafc; border: 1px solid #e2e8f0; margin-right: 8px; font-weight: 600; color: #64748b; font-size:13px; }
            .case-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
            
            .puzzle-grid { flex: 1; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; align-content: start; }
            .puzzle-piece { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 12px 4px; text-align: center; }
            .puzzle-piece.placed { opacity: 0.4; filter: grayscale(1); background: #f0fdf4; border-color: #bbf7d0; }
            .piece-icon { font-size: 28px; display: block; }
            .piece-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }

            .lesson-body { padding: 20px; overflow-y: auto; }
            .step-card { display: flex; gap: 12px; margin-bottom: 20px; position: relative; }
            .step-card:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 32px; bottom: 0; width: 2px; background: #e2e8f0; }
            .step-badge { width: 30px; height: 30px; background: var(--primary-light); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0; z-index: 2; border: 2px solid #fff; }
            
            .drag-ghost { position: fixed; pointer-events: none; z-index: 9999; background: white; border: 2px solid var(--primary); border-radius: 12px; padding: 10px; width: 80px; text-align: center; opacity: 0.9; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
            .feedback-toast { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.8); background: white; padding: 12px 20px; border-radius: 50px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-weight: 800; font-size: 14px; text-align: center; opacity: 0; pointer-events: none; transition: all 0.3s; z-index: 100; }
            .feedback-toast.show { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            .feedback-toast.success { color: #22c55e; border: 2px solid #bbf7d0; }
            .feedback-toast.error { color: #ef4444; border: 2px solid #fecaca; }
            .globe-loader { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .spinner { width: 30px; height: 30px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px; }
            @keyframes spin { to { transform: rotate(360deg); } }
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

        // PRE-CALCULATE GEOMETRY (Speed Boost)
        if (!UniversalGlobeEngine.state.geoLand) {
            try {
                let world;
                try {
                    world = await fetch("./content/assets/countries-50m.json").then(r => r.json());
                } catch {
                    world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json").then(r => r.json());
                }
                
                // Cache these so we don't calculate them every frame
                UniversalGlobeEngine.state.geoLand = topojson.feature(world, world.objects.countries);
                UniversalGlobeEngine.state.geoBorders = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
                UniversalGlobeEngine.state.geoCoastline = topojson.mesh(world, world.objects.countries, (a, b) => a === b);
                UniversalGlobeEngine.state.geoGraticule = d3.geoGraticule()();
                
            } catch (e) { console.error("Map error", e); }
        }

        container.innerHTML = `
            <div class="globe-root">
                <div class="globe-card" id="globe-mount">
                    <canvas id="globe-canvas" class="globe-canvas"></canvas>
                    <div class="map-hud">
                        <div class="hud-pill">${data.variantTitle}</div>
                        <div class="hud-pill" id="status-pill">${data.mode === 'puzzle' ? '0/0' : 'Learn'}</div>
                    </div>
                    <div id="feedback-toast" class="feedback-toast"></div>
                </div>
                <div class="content-card" id="ui-mount"></div>
            </div>
        `;

        UniversalGlobeEngine.initCanvas();
        UniversalGlobeEngine.renderUI();
    },

    initCanvas: () => {
        const mount = document.getElementById('globe-mount');
        const canvas = document.getElementById('globe-canvas');
        if(!mount || !canvas) return;

        const rect = mount.getBoundingClientRect();
        
        // PERFORMANCE FIX: Cap DPI at 2x max (Phones can represent 3x or 4x which kills FPS)
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        UniversalGlobeEngine.state.width = rect.width;
        UniversalGlobeEngine.state.height = rect.height;
        UniversalGlobeEngine.state.ctx = ctx;

        const projection = d3.geoOrthographic()
            .scale(Math.min(rect.width, rect.height) / 2.2)
            .translate([rect.width / 2, rect.height / 2])
            .clipAngle(90);

        const path = d3.geoPath(projection, ctx);

        UniversalGlobeEngine.state.projection = projection;
        UniversalGlobeEngine.state.path = path;

        // Interaction
        d3.select(canvas).call(d3.drag()
            .on("start", () => { 
                UniversalGlobeEngine.state.isDraggingGlobe = true; 
                // Draw immediately to switch to low-res mode
                UniversalGlobeEngine.draw();
            })
            .on("drag", (event) => {
                const rotate = projection.rotate();
                // Increased sensitivity for responsiveness
                projection.rotate([rotate[0] + event.dx * 0.6, rotate[1] - event.dy * 0.6]);
                UniversalGlobeEngine.state.rotation = projection.rotate();
                
                // Use requestAnimationFrame for smoother drag loop
                requestAnimationFrame(UniversalGlobeEngine.draw);
            })
            .on("end", () => { 
                UniversalGlobeEngine.state.isDraggingGlobe = false; 
                // Draw high-res once stopped
                UniversalGlobeEngine.draw();
            })
        );

        const initialRot = UniversalGlobeEngine.state.data.initialRotation || [0, -10, 0];
        projection.rotate(initialRot);
        UniversalGlobeEngine.draw();

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
        const { ctx, width, height, path, projection, geoLand, geoBorders, geoCoastline, geoGraticule, data, placedPieces, activeTab, isDraggingGlobe } = UniversalGlobeEngine.state;
        if (!ctx || !geoLand) return;
        
        ctx.clearRect(0, 0, width, height);

        // 1. OCEAN (Static color during drag for speed, Gradient when still)
        if (isDraggingGlobe) {
             ctx.fillStyle = "#dbeafe";
             ctx.beginPath(); path({type: "Sphere"}); ctx.fill();
        } else {
            const grad = ctx.createRadialGradient(width/2, height/2, height/5, width/2, height/2, height/1.5);
            grad.addColorStop(0, "#f0f9ff"); grad.addColorStop(1, "#bae6fd");
            ctx.fillStyle = grad; ctx.beginPath(); path({type: "Sphere"}); ctx.fill();
        }

        // 2. GRID (Skip during drag)
        if (!isDraggingGlobe) {
            ctx.strokeStyle = "rgba(30, 58, 138, 0.1)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); path(geoGraticule); ctx.stroke();
        }

        // 3. LAND 
        // Always draw land
        ctx.beginPath(); path(geoLand);
        ctx.fillStyle = "#ffffff"; ctx.fill();

        // 4. HIGHLIGHTS (Puzzle Mode)
        if (data.mode === 'puzzle' && placedPieces.length > 0) {
            placedPieces.forEach(pieceId => {
                const idsToColor = CONTINENT_MAP[pieceId];
                if (idsToColor) {
                    // Filter features only for this continent
                    // Note: This filter is a bit heavy, ideally cache continent GeoJSONs too
                    // But typically fast enough for 7 continents
                    const continentFeatures = {
                        type: "FeatureCollection",
                        features: geoLand.features.filter(f => idsToColor.includes(String(f.id)))
                    };
                    ctx.beginPath(); path(continentFeatures);
                    ctx.fillStyle = "#86efac"; // Green
                    ctx.fill();
                }
            });
        }

        // 5. BORDERS (Skip internal borders during drag for speed)
        if (!isDraggingGlobe && geoBorders) {
            ctx.beginPath(); path(geoBorders);
            ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 0.5; ctx.stroke();
        }

        // Coastline (Always draw, gives shape)
        if (geoCoastline) {
            ctx.beginPath(); path(geoCoastline);
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 0.8; ctx.stroke();
        }

        // 6. OVERLAYS
        if (!isDraggingGlobe) {
            // Prime Meridian
            ctx.beginPath();
            path({type: "LineString", coordinates: [[0, 90], [0, -90]]});
            ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);

            // Equator
            ctx.beginPath();
            path({type: "LineString", coordinates: [[-180, 0], [180, 0]]});
            ctx.strokeStyle = "#10b981"; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
        }

        // 7. MARKERS & LINES (Lesson/Game Mode)
        const item = data.mode === 'lesson' ? data.cases[activeTab] : 
                     data.mode === 'game' ? data.questions[activeTab] : null;

        if (item) {
            if (item.connection) {
                ctx.beginPath();
                path({type: "LineString", coordinates: [item.connection.from, item.connection.to]});
                ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
            }
            if (item.markers) {
                const center = projection.invert([width/2, height/2]);
                item.markers.forEach(m => {
                    if (d3.geoDistance(center, [m.lon, m.lat]) < 1.57) {
                        const [x, y] = projection([m.lon, m.lat]);
                        
                        // Only draw fancy shadows if not dragging
                        if (!isDraggingGlobe) {
                            ctx.beginPath(); ctx.arc(x, y, 6, 0, 2*Math.PI);
                            ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fill();
                        }
                        
                        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2*Math.PI);
                        ctx.fillStyle = m.color || "#ef4444"; ctx.fill();
                        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();

                        if (!isDraggingGlobe) {
                            ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
                            ctx.fillText(m.label, x, y - 12);
                        }
                    }
                });
            }
        }
        
        // 8. ATMOSPHERE
        ctx.beginPath(); path({type: "Sphere"});
        ctx.strokeStyle = "rgba(56, 189, 248, 0.3)"; ctx.lineWidth = 2; ctx.stroke();
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
        ghost.style.left = `${t.clientX-40}px`; ghost.style.top = `${t.clientY-40}px`;
        document.body.appendChild(ghost);

        const move = (ev) => {
            const touch = ev.touches ? ev.touches[0] : ev;
            ghost.style.left = `${touch.clientX-40}px`; ghost.style.top = `${touch.clientY-40}px`;
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
        if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;

        const { projection } = UniversalGlobeEngine.state;
        const coords = projection.invert([x - rect.left, y - rect.top]);
        if(!coords) return;
        
        if(d3.geoDistance(coords, piece.target) < 0.5) {
            UniversalGlobeEngine.state.placedPieces.push(piece.id);
            UniversalGlobeEngine.showToast(`Correct! ${piece.label}`, 'success');
            
            // Re-render UI and Map
            UniversalGlobeEngine.renderPuzzlePieces(document.getElementById('puzzle-grid'));
            
            d3.transition().duration(600).tween("rotate", () => {
                const r = d3.interpolate(projection.rotate(), [-piece.target[0], -piece.target[1]]);
                return (t) => { projection.rotate(r(t)); UniversalGlobeEngine.draw(); };
            });
        } else {
            UniversalGlobeEngine.showToast('Try again!', 'error');
        }
    },

    showToast: (msg, type) => {
        const toast = document.getElementById('feedback-toast');
        toast.innerHTML = type === 'success' ? `✅ ${msg}` : `❌ ${msg}`;
        toast.className = `feedback-toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
};

window.GlobeTimeEngine = UniversalGlobeEngine;