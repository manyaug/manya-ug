/**
 * Universal Globe Engine v7.0 (The Complete Suite)
 * 
 * MODES:
 * 1. 'puzzle' : Drag and drop continents/features (Interactive Game)
 * 2. 'lesson' : Tabs with text info, auto-rotating map, and zooming (Study Mode)
 * 3. 'game'   : Q&A Style (Quiz Mode)
 * 
 * FEATURES:
 * - Offline Ready (Local Assets)
 * - Mobile Optimized (Card Layout, Touch Events)
 * - High Performance (Canvas + ResizeObserver)
 * - Zoom & Lock (For detailed study)
 */

// --- 1. COMPREHENSIVE COUNTRY & REGION MAPPING ---
// Maps IDs (ISO Numeric) to Groups for Highlighting
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
    "east_africa": ["800", "404", "834", "646", "108", "728"], // Uganda, Kenya, Tanzania, Rwanda, Burundi, S.Sudan
    "horn_africa": ["706", "231", "232", "262"], // Somalia, Ethiopia, Eritrea, Djibouti
    "north_africa": ["818", "434", "788", "012", "504", "729", "732"], // Egypt, Libya, Tunisia, Algeria, Morocco, Sudan
    "west_africa": ["566", "288", "686", "384", "466", "562", "270", "694", "430", "324", "624", "204", "768", "854", "132", "478"],
    "central_africa": ["120", "140", "148", "178", "180", "226", "266", "678"], // Cameroon, CAR, Chad, Congo, DRC...
    "southern_africa": ["710", "516", "072", "716", "894", "454", "508", "426", "748", "024"], // SA, Nam, Bot, Zim, Zam...
    
    // --- SPECIFIC COUNTRIES (For Puzzle Targeting) ---
   "tunisia": ["788"],
    "southafrica": ["710"],
    "somalia": ["706"],
    "senegal": ["686"],
    "ghana": ["288"],
    "uganda": ["800"],
    "congo": ["178"],       // Republic of the Congo
    "drc": ["180"],         // Democratic Republic of the Congo
    "eq_guinea": ["226"]    // Equatorial Guinea
};

export const UniversalGlobeEngine = {
    state: {
        // Dimensions
        width: 0, height: 0,
        
        // Canvas & D3
        canvas: null, ctx: null,
        projection: null, path: null,
        
        // Data
        worldData: null,
        data: null,
        
        // View State
        rotation: [0, 0],
        scale: 1,      // Base scale calculated from container
        zoomFactor: 1, // Multiplier from JSON (e.g., 1.5x)
        
        // Logic State
        activeTab: 0,
        placedPieces: [],
        
        // Interaction
        isDraggingGlobe: false,
        resizeObserver: null
    },

    // --- 2. CSS STYLES ---
    injectStyles: () => {
        if (document.getElementById('uni-globe-v8-styles')) return;
        const style = document.createElement('style');
        style.id = 'uni-globe-v8-styles';
        style.innerHTML = `
            :root {
                --primary: #6366f1;
                --primary-bg: #e0e7ff;
                --surface: #ffffff;
                --bg: #f8fafc;
                --text: #0f172a;
                --text-muted: #64748b;
            }

            .globe-root { 
                position: absolute; inset: 0; 
                display: flex; flex-direction: column; 
                background: var(--bg); font-family: 'Inter', sans-serif;
                overflow: hidden;
            }

            /* --- TOP: GLOBE AREA --- */
            .globe-card { 
                flex: 0 0 45vh; /* Globe takes 45% height */
                position: relative; 
                background: radial-gradient(circle at 50% 50%, #f1f5f9 0%, #cbd5e1 100%);
                z-index: 1; /* Behind content */
            }
            .globe-canvas { display: block; width: 100%; height: 100%; cursor: grab; }
            .globe-canvas:active { cursor: grabbing; }

            /* HUD */
            .map-hud { position: absolute; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; pointer-events: none; }
            .hud-pill { 
                background: rgba(255,255,255,0.8); backdrop-filter: blur(8px);
                padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; 
                color: var(--text); border: 1px solid rgba(255,255,255,0.4);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
            }

            /* --- BOTTOM: CONTENT SHEET --- */
            .content-card { 
                flex: 1; /* Takes remaining space */
                background: var(--surface);
                border-top-left-radius: 24px; border-top-right-radius: 24px;
                box-shadow: 0 -10px 40px -10px rgba(0,0,0,0.1);
                display: flex; flex-direction: column;
                position: relative; z-index: 10;
                margin-top: -20px; /* Overlap globe slightly */
                overflow: hidden;
            }
            
            /* Drag Handle (Visual only) */
            .sheet-handle {
                width: 40px; height: 4px; background: #e2e8f0; 
                border-radius: 2px; margin: 12px auto 4px auto; flex-shrink: 0;
            }

            /* --- MODERN TABS --- */
            .tabs-wrapper { 
                padding: 8px 16px; border-bottom: 1px solid #f1f5f9;
                overflow-x: auto; white-space: nowrap; scrollbar-width: none;
                -webkit-overflow-scrolling: touch; flex-shrink: 0;
            }
            .tabs-wrapper::-webkit-scrollbar { display: none; }
            
            .tab-btn {
                display: inline-block; padding: 10px 16px; margin-right: 8px;
                border-radius: 12px; font-size: 13px; font-weight: 600;
                color: var(--text-muted); background: transparent; border: none;
                cursor: pointer; transition: all 0.2s ease;
            }
            .tab-btn.active {
                background: var(--primary-bg); color: var(--primary);
            }

            /* --- LESSON BODY --- */
            .lesson-body { 
                flex: 1; overflow-y: auto; padding: 20px; 
                padding-bottom: 40px; /* Space for scrolling */
            }

            .lesson-header { margin-bottom: 20px; }
            .lesson-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; margin-bottom: 6px; }
            .lesson-desc { font-size: 15px; color: var(--text-muted); line-height: 1.5; }

            /* --- FOCUS CHIPS (Zoom Buttons) --- */
            .focus-chips-container {
                display: flex; gap: 10px; overflow-x: auto; padding-bottom: 15px;
                scrollbar-width: none; margin-bottom: 10px;
            }
            .focus-chip {
                flex: 0 0 auto;
                padding: 8px 12px; background: #fff; 
                border: 1px solid #e2e8f0; border-radius: 50px;
                font-size: 12px; font-weight: 700; color: var(--text);
                display: flex; align-items: center; gap: 6px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.03);
                cursor: pointer; transition: transform 0.1s;
            }
            .focus-chip:active { transform: scale(0.96); background: #f8fafc; }
            .focus-icon { color: var(--primary); font-size: 14px; }

            /* --- TIMELINE STEPS --- */
            .timeline-container { padding-left: 10px; }
            .step-item { display: flex; gap: 16px; position: relative; padding-bottom: 24px; }
            
            /* Vertical Line */
            .step-item:not(:last-child)::after {
                content: ''; position: absolute; left: 14px; top: 32px; bottom: 0;
                width: 2px; background: #e2e8f0;
            }
            
            .step-marker {
                width: 30px; height: 30px; border-radius: 50%;
                background: var(--primary); color: white;
                font-size: 13px; font-weight: 700;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0; z-index: 2; border: 3px solid #fff;
                box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2);
            }
            
            .step-content {
                background: #f8fafc; padding: 12px 16px; border-radius: 12px;
                font-size: 15px; color: var(--text); line-height: 1.6; width: 100%;
                border: 1px solid #f1f5f9;
            }
            .step-content b { color: var(--primary); font-weight: 700; }

            /* LOADER & TOAST */
            .globe-loader { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background:#f8fafc; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:50;}
            .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom:10px;}
            @keyframes spin { to { transform: rotate(360deg); } }
            
            .feedback-toast {
                position: absolute; bottom: 20px; left: 50%; transform: translate(-50%, 20px);
                background: #1e293b; color: white; padding: 12px 24px; border-radius: 50px;
                font-weight: 600; opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3); pointer-events: none; z-index: 100;
            }
            .feedback-toast.show { opacity: 1; transform: translate(-50%, 0); }
            .feedback-toast.success { background: #22c55e; }
            .feedback-toast.error { background: #ef4444; }
        `;
        document.head.appendChild(style);
    },

    // --- 3. DEPENDENCY LOADER (Offline First) ---
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
            console.warn("Local libs missing, trying CDN...");
            await load("https://d3js.org/d3.v7.min.js");
            await load("https://unpkg.com/topojson@3");
        }
    },

    // --- 4. INITIALIZATION ---
    renderLabeling: async (container, data) => {
        UniversalGlobeEngine.injectStyles();
        
        container.innerHTML = `
            <div class="globe-root">
                <div class="globe-card" id="globe-mount">
                    <canvas id="globe-canvas" class="globe-canvas"></canvas>
                    <div class="map-hud">
                        <div class="hud-pill">${data.variantTitle || 'Social Studies'}</div>
                        <div class="hud-pill" id="status-pill">Loading...</div>
                    </div>
                    <div id="feedback-toast" class="feedback-toast"></div>
                    <div class="globe-loader" id="loader">
                        <div class="spinner"></div>
                        <div style="font-size:11px; font-weight:700; color:#94a3b8">Loading Map...</div>
                    </div>
                </div>
                <div class="content-card" id="ui-mount"></div>
            </div>
        `;

        await UniversalGlobeEngine.loadDependencies();
        
        UniversalGlobeEngine.state.container = container;
        UniversalGlobeEngine.state.data = data;
        UniversalGlobeEngine.state.activeTab = 0;
        UniversalGlobeEngine.state.placedPieces = [];
        
        // Clean up old observer if re-rendering
        if(UniversalGlobeEngine.state.resizeObserver) {
            UniversalGlobeEngine.state.resizeObserver.disconnect();
        }

        // Load Map Data (World 50m)
        if (!UniversalGlobeEngine.state.worldData) {
            try {
                const res = await fetch("./content/assets/countries-50m.json");
                UniversalGlobeEngine.state.worldData = await res.json();
            } catch (e) {
                console.warn("Local map missing, using CDN");
                const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
                UniversalGlobeEngine.state.worldData = await res.json();
            }
        }

        UniversalGlobeEngine.initCanvas();
        UniversalGlobeEngine.renderUI();
        
        // Hide Loader
        const loader = document.getElementById('loader');
        if(loader) loader.style.display = 'none';
        
        // Update Status Pill
        const status = document.getElementById('status-pill');
        if(status) status.innerText = data.mode === 'puzzle' ? `0 / ${data.pieces.length}` : 'Learn';
    },

    // --- 5. CANVAS & D3 SETUP ---
initCanvas: () => {
        const mount = document.getElementById('globe-mount');
        const canvas = document.getElementById('globe-canvas');
        if(!mount || !canvas) return;

        // Apply Locked Cursor (Prevent dragging if locked in JSON)
        if(UniversalGlobeEngine.state.data.locked) {
            canvas.classList.add('locked');
        }

        const handleResize = (entries) => {
            if(!entries || entries.length === 0) return;
            const entry = entries[0];
            const width = entry.contentRect.width;
            const height = entry.contentRect.height;
            if(width === 0) return;

            // Handle High DPI Displays
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            UniversalGlobeEngine.state.width = width;
            UniversalGlobeEngine.state.height = height;
            UniversalGlobeEngine.state.ctx = ctx;

            // 1. Calculate & Store Base Scale (The "Fit to Screen" size)
            const baseScale = Math.min(width, height) / 2.2;
            UniversalGlobeEngine.state.baseScale = baseScale;

            // 2. Determine Initial Zoom from JSON (default to 1)
            const initialZoom = UniversalGlobeEngine.state.data.zoomFactor || 1;
            
            const projection = d3.geoOrthographic()
                .scale(baseScale * initialZoom)
                .translate([width / 2, height / 2])
                .clipAngle(90);

            // 3. Set Initial Rotation
            const initialRot = UniversalGlobeEngine.state.data.initialRotation || [0, -10, 0];
            projection.rotate(initialRot);

            UniversalGlobeEngine.state.projection = projection;
            UniversalGlobeEngine.state.path = d3.geoPath(projection, ctx);
            
            // Sync state scale
            UniversalGlobeEngine.state.scale = projection.scale();

            UniversalGlobeEngine.draw();
        };

        UniversalGlobeEngine.state.resizeObserver = new ResizeObserver(handleResize);
        UniversalGlobeEngine.state.resizeObserver.observe(mount);
        
        // Disable Drag if Locked
        if (!UniversalGlobeEngine.state.data.locked) {
            d3.select(canvas).call(d3.drag()
                .on("start", () => { UniversalGlobeEngine.state.isDraggingGlobe = true; })
                .on("drag", (event) => {
                    const { projection } = UniversalGlobeEngine.state;
                    const rotate = projection.rotate();
                    const k = 0.5; // Sensitivity
                    projection.rotate([rotate[0] + event.dx * k, rotate[1] - event.dy * k]);
                    UniversalGlobeEngine.state.rotation = projection.rotate();
                    UniversalGlobeEngine.draw();
                })
                .on("end", () => { UniversalGlobeEngine.state.isDraggingGlobe = false; })
            );
        }
    },

    // --- 6. CINEMATIC UPDATE FUNCTION (Zoom + Rotate) ---
    updateToCurrentData: () => {
        const { data, activeTab, projection, baseScale, width, height } = UniversalGlobeEngine.state;
        
        let targetRot = null;
        let targetZoom = 1;

        // 1. Determine Target Values based on Mode
        if (data.mode === 'lesson') {
            const currentCase = data.cases[activeTab];
            targetRot = currentCase.initialRotation;
            // Use specific case zoom, or global zoom, or default 1
            targetZoom = currentCase.zoomFactor || data.zoomFactor || 1;
        } else if (data.mode === 'game') {
            const currentQuestion = data.questions[activeTab];
            targetRot = currentQuestion.initialRotation;
            targetZoom = currentQuestion.zoomFactor || data.zoomFactor || 1;
        }

        // 2. Calculate Actual Scale Value
        // Fallback for baseScale if resize hasn't fired yet
        const currentBaseScale = baseScale || Math.min(width, height) / 2.2;
        const targetScale = currentBaseScale * targetZoom;

        // 3. Execute Animation
        if(targetRot && projection) {
            d3.transition()
                .duration(1200) // 1.2s Smooth Transition
                .ease(d3.easeCubicOut)
                .tween("render", () => {
                    // Interpolate Rotation
                    const r = d3.interpolate(projection.rotate(), targetRot);
                    // Interpolate Scale (Zoom)
                    const s = d3.interpolate(projection.scale(), targetScale);
                    
                    return (t) => {
                        // Apply updates
                        projection.rotate(r(t));
                        projection.scale(s(t));
                        
                        // Sync state for drag continuity
                        UniversalGlobeEngine.state.rotation = projection.rotate();
                        UniversalGlobeEngine.state.scale = projection.scale(); 
                        
                        UniversalGlobeEngine.draw();
                    };
                });
        } else {
            // Instant update if no rotation defined
            if(targetZoom !== 1) {
                 projection.scale(targetScale);
                 UniversalGlobeEngine.state.scale = targetScale;
            }
            UniversalGlobeEngine.draw();
        }
    },
    
    // --- 7. DRAWING LOGIC (Updated v7.3) ---
    draw: () => {
        const { ctx, width, height, path, projection, worldData, data, activeTab, placedPieces, isDraggingGlobe } = UniversalGlobeEngine.state;
        if (!ctx || !path) return;
        
        ctx.clearRect(0, 0, width, height);

        // 1. OCEAN
        const grad = ctx.createRadialGradient(width/2, height/2, height/5, width/2, height/2, height/1.5);
        grad.addColorStop(0, "#f0f9ff"); grad.addColorStop(1, "#bae6fd");
        ctx.fillStyle = grad; ctx.beginPath(); path({type: "Sphere"}); ctx.fill();

        // 2. GRID (Graticules) - Skip during drag for speed
        if (!isDraggingGlobe) {
            ctx.strokeStyle = "rgba(30, 58, 138, 0.1)"; ctx.lineWidth = 0.5;
            ctx.beginPath(); path(d3.geoGraticule()()); ctx.stroke();
        }

        // 3. LAND & HIGHLIGHTS
        if (worldData) {
            const countries = topojson.feature(worldData, worldData.objects.countries);

            // A. Base White Land
            ctx.beginPath(); path(countries);
            ctx.fillStyle = "#ffffff"; ctx.fill();

            // B. Prepare Highlights List
            let highlightList = [];

            // From Puzzle Mode (Placed Pieces)
            if (data.mode === 'puzzle' && placedPieces.length > 0) {
                placedPieces.forEach(id => {
                    const piece = data.pieces.find(p => p.id === id);
                    if(piece) highlightList.push({ id: id, color: piece.color || "#86efac" });
                });
            }
            
            // From Lesson Mode (Current Tab 'highlight' property)
            const currentItem = data.mode === 'lesson' ? data.cases[activeTab] : null;
            if (currentItem && currentItem.highlight) {
                const keys = Array.isArray(currentItem.highlight) ? currentItem.highlight : [currentItem.highlight];
                keys.forEach(k => {
                     highlightList.push({ id: k, color: currentItem.highlightColor || "#60a5fa" });
                });
            }

            // C. Draw Highlights
            highlightList.forEach(item => {
                // Try to find IDs in CONTINENT_MAP (Group), otherwise treat item.id as a direct ISO code (Single Country)
                const idsToColor = CONTINENT_MAP[item.id] || [item.id]; 
                
                if (idsToColor) {
                    const features = {
                        type: "FeatureCollection",
                        features: countries.features.filter(f => idsToColor.includes(String(f.id)))
                    };
                    
                    if (features.features.length > 0) {
                        ctx.beginPath(); path(features);
                        ctx.fillStyle = item.color; ctx.fill();
                        // Add a border to the highlighted region for clarity
                        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 0.5; ctx.stroke();
                    }
                }
            });

            // D. Climate Zones (Shading)
            if (currentItem && currentItem.zones) {
                currentItem.zones.forEach(zone => {
                    const coords = [];
                    for(let i=180; i>=-180; i-=5) coords.push([i, zone.toLat]);
                    for(let i=-180; i<=180; i+=5) coords.push([i, zone.fromLat]);
                    coords.push(coords[0]);

                    const poly = {type: "Polygon", coordinates: [coords]};
                    ctx.beginPath(); path(poly);
                    ctx.fillStyle = zone.color || "rgba(255, 165, 0, 0.2)"; 
                    ctx.fill();
                });
            }

            // E. Borders & Coastline
            if (!isDraggingGlobe) {
                // Thin internal borders
                ctx.beginPath(); 
                path(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b));
                ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 0.5; ctx.stroke();
            }

            // Thick Coastline
            ctx.beginPath(); 
            path(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a === b));
            ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.0; ctx.stroke();
        }

        // 4. LINES & MARKERS SELECTION LOGIC
        // Determine the active item based on mode
        let item = null;
        if (data.mode === 'lesson') item = data.cases[activeTab];
        else if (data.mode === 'game') item = data.questions[activeTab];
        else if (data.mode === 'puzzle') item = data; // In Puzzle mode, lines/markers are top-level

        if (item) {
            // A. Draw Custom Lines (Latitudes / Longitudes)
            if (item.lines) {
                item.lines.forEach(line => {
                    let coords = [];
                    if (line.type === 'lat') {
                        // Horizontal Circle
                        for(let i=-180; i<=180; i+=5) coords.push([i, line.value]);
                    } else if (line.type === 'lon') {
                        // Vertical Semi-Circle (Pole to Pole)
                        for(let i=90; i>=-90; i-=5) coords.push([line.value, i]);
                    }
                    
                    ctx.beginPath(); path({type: "LineString", coordinates: coords});
                    ctx.strokeStyle = line.color || "#ef4444";
                    ctx.lineWidth = line.width || 2;
                    ctx.setLineDash(line.dashed ? [4, 4] : []);
                    ctx.stroke(); ctx.setLineDash([]);

                    // Labels (Hide during drag)
                    if (line.label && !isDraggingGlobe) {
                        const center = projection.invert([width/2, height/2]);
                        const labelPoint = line.type === 'lat' ? [center[0], line.value] : [line.value, center[1]];
                        
                        // Only draw label if near center of view
                        if (d3.geoDistance(center, labelPoint) < 1.5) {
                            const pos = projection(labelPoint);
                            if(pos) {
                                ctx.fillStyle = line.color || "#ef4444";
                                ctx.font = "800 11px sans-serif"; ctx.textAlign = "center";
                                ctx.shadowColor = "white"; ctx.shadowBlur = 4;
                                ctx.fillText(line.label, pos[0], pos[1] - 4);
                                ctx.shadowBlur = 0;
                            }
                        }
                    }
                });
            } else if (!item.hideDefaultLines) {
                // B. Default Lines (Equator/Prime) if no custom lines and not hidden
                ctx.beginPath(); path({type: "LineString", coordinates: [[0, 90], [0, -90]]});
                ctx.strokeStyle = "rgba(239, 68, 68, 0.4)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke();
                
                ctx.beginPath(); path({type: "LineString", coordinates: [[-180, 0], [180, 0]]});
                ctx.strokeStyle = "rgba(34, 197, 94, 0.4)"; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
            }

            // C. Connections (Arcs)
            if (item.connection) {
                ctx.beginPath();
                path({type: "LineString", coordinates: [item.connection.from, item.connection.to]});
                ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
            }

            // D. Markers (Pins)
            if (item.markers) {
                const center = projection.invert([width/2, height/2]);
                item.markers.forEach(m => {
                    // Check visibility (Front of globe)
                    if (d3.geoDistance(center, [m.lon, m.lat]) < 1.57) {
                        const [x, y] = projection([m.lon, m.lat]);
                        
                        // Glow
                        if (!isDraggingGlobe) {
                            ctx.beginPath(); ctx.arc(x, y, 6, 0, 2*Math.PI);
                            ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
                        }
                        
                        // Pin Head
                        ctx.beginPath(); ctx.arc(x, y, 4, 0, 2*Math.PI);
                        ctx.fillStyle = m.color || "#ef4444"; ctx.fill();
                        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
                        
                        // Label
                        if (!isDraggingGlobe) {
                            ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
                            ctx.shadowColor = "white"; ctx.shadowBlur = 4;
                            ctx.fillText(m.label, x, y - 12);
                            ctx.shadowBlur = 0;
                        }
                    }
                });
            }
            // --- INSERT THIS BLOCK INSIDE THE draw() FUNCTION ---
        
        // 5. FEATURE OVERLAYS (Arrows for Straits, Curves for Gulfs)
        if (item && item.overlays) {
            item.overlays.forEach(ov => {
                
                // TYPE: ARROW (Good for Straits)
                if (ov.type === 'arrow') {
                    const [p1, p2] = ov.coordinates; // [Start Lon,Lat], [End Lon,Lat]
                    const geoPath = {type: "LineString", coordinates: [p1, p2]};
                    
                    // Draw Line
                    ctx.beginPath(); path(geoPath);
                    ctx.strokeStyle = ov.color || "#ef4444"; 
                    ctx.lineWidth = 3; 
                    ctx.setLineDash([2, 4]); // Dotted look
                    ctx.stroke(); 
                    ctx.setLineDash([]);
                    
                    // Draw Arrowhead (Simple Dot at end)
                    const endPos = projection(p2);
                    if(endPos) {
                        ctx.beginPath(); ctx.arc(endPos[0], endPos[1], 4, 0, 2*Math.PI); 
                        ctx.fillStyle = ov.color || "#ef4444"; ctx.fill();
                    }
                } 
                
                // TYPE: CURVE/CIRCLE (Good for Gulfs)
                else if (ov.type === 'curve') {
                    // Uses d3.geoCircle to draw a perfect circle on the sphere surface
                    // Radius is in degrees (e.g., 5 degrees covers a gulf)
                    if (window.d3 && d3.geoCircle) {
                        const circleGenerator = d3.geoCircle().center(ov.center).radius(ov.radius || 5);
                        const circleJson = circleGenerator();
                        
                        ctx.beginPath(); path(circleJson);
                        ctx.fillStyle = ov.color ? ov.color + "33" : "rgba(14, 165, 233, 0.2)"; // 20% opacity
                        ctx.fill();
                        ctx.strokeStyle = ov.color || "#0ea5e9"; 
                        ctx.lineWidth = 2; 
                        ctx.stroke();
                    }
                }
            });
        }
        }
        
        // 5. ATMOSPHERE (Outer Glow)
        ctx.beginPath(); path({type: "Sphere"});
        ctx.strokeStyle = "rgba(56, 189, 248, 0.3)"; ctx.lineWidth = 2; ctx.stroke();
    },
    // --- 8. UI LOGIC ---
    renderUI: () => {
        const { data, activeTab } = UniversalGlobeEngine.state;
        const mount = document.getElementById('ui-mount');
        mount.innerHTML = '';

        // -- HANDLE DANGER/LOADING --
        if(!data) return;

        // 1. SHEET HANDLE (Visual cue)
        const handle = document.createElement('div');
        handle.className = 'sheet-handle';
        mount.appendChild(handle);

        // 2. TABS (Scrollable)
        if (data.mode === 'lesson') {
            const tabsDiv = document.createElement('div');
            tabsDiv.className = 'tabs-wrapper';
            
            data.cases.forEach((c, i) => {
                const btn = document.createElement('button');
                btn.className = `tab-btn ${i === activeTab ? 'active' : ''}`;
                btn.innerText = c.tabTitle;
                btn.onclick = () => UniversalGlobeEngine.switchTab(i);
                tabsDiv.appendChild(btn);
            });
            mount.appendChild(tabsDiv);
        }

        // 3. MAIN CONTENT BODY
        const body = document.createElement('div');
        body.className = 'lesson-body';

        // Decide Content based on Mode
        if (data.mode === 'lesson') {
            const cur = data.cases[activeTab];
            
            // Header
            let html = `
                <div class="lesson-header">
                    <div class="lesson-title">${cur.title}</div>
                    <div class="lesson-desc">${cur.description}</div>
                </div>
            `;

            // Focus Chips (If available)
            if (cur.focusPoints) {
                html += `<div class="focus-chips-container">`;
                cur.focusPoints.forEach(fp => {
                    html += `
                        <button class="focus-chip" onclick="GlobeTimeEngine.focusOn([${fp.rotation}], ${fp.zoom})">
                            <span class="focus-icon">⌖</span> ${fp.label}
                        </button>
                    `;
                });
                html += `</div>`;
            }

            // Timeline Steps
            html += `<div class="timeline-container">`;
            cur.steps.forEach((s, i) => {
                html += `
                    <div class="step-item">
                        <div class="step-marker">${i+1}</div>
                        <div class="step-content">${s}</div>
                    </div>
                `;
            });
            html += `</div>`;

            body.innerHTML = html;

        } else if (data.mode === 'puzzle') {
            // Puzzle UI (Grid of pieces)
            body.innerHTML = `
                <div class="lesson-header" style="text-align:center">
                    <div class="lesson-title">Map Builder</div>
                    <div class="lesson-desc">Drag the items below to their correct location on the globe.</div>
                </div>
                <div class="puzzle-grid" id="puzzle-grid"></div>
            `;
            // Defer render to ensure element exists
            setTimeout(() => UniversalGlobeEngine.renderPuzzlePieces(document.getElementById('puzzle-grid')), 0);

        } else if (data.mode === 'game') {
            // Quiz UI
            const q = data.questions[activeTab];
            let html = `
                <div class="lesson-header">
                    <div class="lesson-title">${q.title}</div>
                    <div class="lesson-desc" style="color:#1e293b; font-weight:500;">${q.question}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px;">
            `;

            if(q.options) {
                q.options.forEach(opt => {
                    const safeOpt = opt.replace(/'/g, "\\'");
                    html += `
                    <button class="focus-chip" 
                        style="width:100%; justify-content:space-between; padding:16px; border-radius:12px;"
                        onclick="GlobeTimeEngine.handleQuizAnswer(this, '${safeOpt}')">
                        <span style="font-size:15px;">${opt}</span>
                        <span class="focus-icon">?</span>
                    </button>`;
                });
            }
            html += `</div>`;
            body.innerHTML = html;
        }

        mount.appendChild(body);
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
        UniversalGlobeEngine.updateToCurrentData();
    },
    // --- NEW: FOCUS ON SPECIFIC FEATURE ---
    focusOn: (rotation, zoom) => {
        const { projection, baseScale } = UniversalGlobeEngine.state;
        if(!projection) return;

        const targetScale = baseScale * zoom;

        d3.transition()
            .duration(1200)
            .ease(d3.easeCubicOut)
            .tween("move", () => {
                const r = d3.interpolate(projection.rotate(), rotation);
                const s = d3.interpolate(projection.scale(), targetScale);
                return (t) => {
                    projection.rotate(r(t));
                    projection.scale(s(t));
                    UniversalGlobeEngine.state.rotation = projection.rotate();
                    UniversalGlobeEngine.draw();
                };
            });
    },
    handleQuizAnswer: (btn, answer) => {
        const { data, activeTab } = UniversalGlobeEngine.state;
        const q = data.questions[activeTab];
        
        // Disable all buttons to prevent double clicking
        const allBtns = document.querySelectorAll('.content-card button');
        allBtns.forEach(b => b.style.pointerEvents = 'none');
        
        if (answer === q.correctAnswer) {
            // Correct Visuals
            btn.style.borderColor = '#22c55e';
            btn.style.backgroundColor = '#f0fdf4';
            btn.querySelector('.step-badge').style.background = '#22c55e';
            btn.querySelector('.step-badge').style.color = 'white';
            btn.querySelector('.step-badge').innerText = '✓';
            
            UniversalGlobeEngine.showToast("Correct!", 'success');
            
            // Auto-advance after 1.5 seconds
            setTimeout(() => {
                if (activeTab < data.questions.length - 1) {
                    UniversalGlobeEngine.switchTab(activeTab + 1);
                } else {
                    UniversalGlobeEngine.showToast("Quiz Complete!", 'success');
                    // Optional: Show a completion screen here
                }
            }, 1500);

        } else {
            // Incorrect Visuals
            btn.style.borderColor = '#ef4444';
            btn.style.backgroundColor = '#fef2f2';
            btn.querySelector('.step-badge').style.background = '#ef4444';
            btn.querySelector('.step-badge').style.color = 'white';
            btn.querySelector('.step-badge').innerText = '✕';
            
            UniversalGlobeEngine.showToast("Try again", 'error');
            
            // Re-enable buttons
            setTimeout(() => {
                allBtns.forEach(b => b.style.pointerEvents = 'auto');
            }, 500);
        }
    },
    handleDrag: (e, piece) => {
        e.preventDefault();
        const t = e.touches ? e.touches[0] : e;
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.innerHTML = `<span style="font-size:24px">${piece.icon}</span><br/><span style="font-size:10px; font-weight:bold">${piece.label}</span>`;
        if(piece.color) ghost.style.borderColor = piece.color;
        ghost.style.left = `${t.clientX}px`; ghost.style.top = `${t.clientY}px`;
        document.body.appendChild(ghost);

        const move = (ev) => {
            ev.preventDefault();
            const touch = ev.touches ? ev.touches[0] : ev;
            ghost.style.left = `${touch.clientX}px`; ghost.style.top = `${touch.clientY}px`;
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
        
        if(d3.geoDistance(coords, piece.target) < 0.6) {
            UniversalGlobeEngine.state.placedPieces.push(piece.id);
            UniversalGlobeEngine.showToast(`Correct! ${piece.label}`, 'success');
            UniversalGlobeEngine.renderPuzzlePieces(document.getElementById('puzzle-grid'));
            
            d3.transition().duration(600).tween("rotate", () => {
                const r = d3.interpolate(projection.rotate(), [-piece.target[0], -piece.target[1]]);
                return (t) => { projection.rotate(r(t)); UniversalGlobeEngine.draw(); };
            });
            UniversalGlobeEngine.draw();
        } else {
            UniversalGlobeEngine.showToast('Try again!', 'error');
        }
    },

    showToast: (msg, type) => {
        const toast = document.getElementById('feedback-toast');
        if(!toast) return;
        toast.innerHTML = type === 'success' ? `✅ ${msg}` : `❌ ${msg}`;
        toast.className = `feedback-toast show ${type}`;
        setTimeout(() => toast.classList.remove('show'), 2000);
    }
};

window.GlobeTimeEngine = UniversalGlobeEngine;