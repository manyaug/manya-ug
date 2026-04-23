import React, { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { CONTINENT_MAP } from './GlobeLogic';

/**
 * GLOBE CANVAS COMPONENT
 * Handles the D3 rendering cycle, projections, and map interactions.
 */
const GlobeCanvas = ({
    worldData,
    data,
    activeTab,
    placedPieces,
    isDark,
    rotationRef,
    scaleRef,
    isDraggingRef,
    projectionRef,
    pathRef,
    isD3Ready,
    onPinClick
}) => {
    const canvasRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !worldData || !projectionRef.current || !pathRef.current) return;
        
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 2;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const projection = projectionRef.current;
        const path = pathRef.current;
        
        ctx.clearRect(0, 0, width, height);

        // 1. Ocean Sphere
        const grad = ctx.createRadialGradient(width/2 - 20, height/2 - 20, 0, width/2, height/2, scaleRef.current);
        if (isDark) {
            grad.addColorStop(0, "#075985");
            grad.addColorStop(1, "#082f49");
        } else {
            grad.addColorStop(0, "#caf0f8");
            grad.addColorStop(1, "#00b4d8");
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        path({type: "Sphere"});
        ctx.fill();

        // 2. Graticule
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(30, 58, 138, 0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        path(d3.geoGraticule()());
        ctx.stroke();

        // 3. Countries
        const countries = topojson.feature(worldData, worldData.objects.countries);
        ctx.beginPath();
        path(countries);
        ctx.fillStyle = isDark ? "#1e293b" : "#f8fafc";
        ctx.fill();
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // 4. Overlays & Highlights
        let itemsToHighlight = [];
        const curCase = (data?.mode === 'study') ? data.cases[activeTab] : 
                        (data?.mode === 'quiz')  ? data.questions[activeTab] : {};

        if (curCase?.highlight || curCase?.highlightContinent) {
            const ids = CONTINENT_MAP[curCase.highlightContinent] || 
                       (Array.isArray(curCase.highlight) ? curCase.highlight : [curCase.highlight]);
            ids.forEach(k => itemsToHighlight.push({ id: k, color: curCase.highlightColor || "rgba(242, 118, 5, 0.4)" }));
        }

        if (data?.mode === 'puzzle') {
            placedPieces.forEach(id => {
                itemsToHighlight.push({ id: id, color: "rgba(34, 197, 94, 0.8)" });
            });
        }

        itemsToHighlight.forEach(h => {
            const ids = CONTINENT_MAP[h.id] || [h.id];
            const feat = { 
                type: "FeatureCollection", 
                features: countries.features.filter(f => f.id && (ids.includes(String(f.id).padStart(3, '0')) || ids.includes(String(f.id)))) 
            };
            ctx.beginPath(); path(feat);
            ctx.fillStyle = h.color; ctx.fill();
            ctx.strokeStyle = h.color.replace('0.4', '1').replace('0.8', '1'); ctx.lineWidth = 1.5; ctx.stroke();
        });

        // ─── CUSTOM OVERLAYS ───
        if (curCase?.overlays && Array.isArray(curCase.overlays)) {
            curCase.overlays.forEach(ov => {
                if (ov.type === 'curve' && ov.center) {
                   const circle = d3.geoCircle().center([ov.center[1], ov.center[0]]).radius(ov.radius || 5)();
                   ctx.beginPath(); path(circle);
                   ctx.fillStyle = (ov.color || "#0ea5e9") + "33"; ctx.fill();
                   ctx.strokeStyle = ov.color || "#0ea5e9"; ctx.lineWidth = 2; ctx.stroke();
                } else if (ov.type === 'arrow' && ov.coordinates) {
                   ctx.beginPath(); path({type: "LineString", coordinates: ov.coordinates});
                   ctx.strokeStyle = ov.color || "#2563eb"; ctx.lineWidth = 3; ctx.stroke();
                }
            });
        }

        // ─── CLIMATE ZONES ───
        if (curCase?.zones && Array.isArray(curCase.zones)) {
            curCase.zones.forEach(zone => {
                const coords = [];
                for(let i=180; i>=-180; i-=5) coords.push([i, zone.toLat]);
                for(let i=-180; i<=180; i+=5) coords.push([i, zone.fromLat]);
                coords.push(coords[0]);
                ctx.beginPath(); path({type: "Polygon", coordinates: [coords]});
                ctx.fillStyle = zone.color || "rgba(251, 191, 36, 0.18)"; ctx.fill();
                ctx.strokeStyle = (zone.color || "rgba(251, 191, 36, 0.18)").replace('0.18', '0.4'); ctx.lineWidth = 1; ctx.stroke();
            });
        }

        // ─── LINES (EQUATOR, TROPICS) ───
        if (curCase?.lines && Array.isArray(curCase.lines)) {
            curCase.lines.forEach(l => {
                let coords = [];
                if (l.type === 'lat') for(let i=-180; i<=180; i+=5) coords.push([i, l.value]);
                else for(let i=90; i>=-90; i-=5) coords.push([l.value, i]);
                
                ctx.beginPath(); path({type: "LineString", coordinates: coords});
                ctx.strokeStyle = l.color || (isDark ? "#fbbf24" : "#f59e0b"); 
                ctx.lineWidth = l.width || 3.5; ctx.lineCap = "round";
                if(l.dashed) ctx.setLineDash([10, 8]); 
                ctx.shadowBlur = 4; ctx.shadowColor = l.color || (isDark ? "#fbbf24" : "#f59e0b");
                ctx.stroke(); ctx.shadowBlur = 0; ctx.setLineDash([]);
                
                if (l.label && !isDraggingRef.current) {
                    const center = projection.invert([width/2, height/2]);
                    const labelPoint = l.type === 'lat' ? [center[0], l.value] : [l.value, center[1]];
                    if (d3.geoDistance(center, labelPoint) < 1.4) {
                        const pos = projection(labelPoint);
                        if(pos) {
                            ctx.fillStyle = l.color || (isDark ? "#fbbf24" : "#f59e0b"); 
                            ctx.font = "900 11px 'Plus Jakarta Sans'"; ctx.textAlign = "center";
                            ctx.shadowBlur = 8; ctx.shadowColor = isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)";
                            ctx.fillText(l.label.toUpperCase(), pos[0], pos[1] - 8); ctx.shadowBlur = 0;
                        }
                    }
                }
            });
        }

        // ─── CONNECTIONS (GREAT CIRCLES) ───
        const conns = curCase?.connections || (curCase?.connection ? [curCase.connection] : []);
        conns.forEach(c => {
            if (!c.from || !c.to) return;
            ctx.beginPath(); path({ type: "LineString", coordinates: [c.from, c.to] });
            ctx.strokeStyle = c.color || "#6366f1"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
            ctx.setLineDash(c.dashed ? [8, 6] : []); ctx.stroke(); ctx.setLineDash([]);
        });

        // ─── MARKERS ───
        const pts = curCase?.markers || curCase?.points || [];
        pts.forEach(p => {
            const coords = [p.lon ?? p.lng ?? 0, p.lat ?? 0];
            if (d3.geoDistance(coords, projection.invert([width/2, height/2])) > 1.57) return; 
            const [x, y] = projection(coords);
            ctx.beginPath(); ctx.arc(x, y, 10, 0, 2 * Math.PI); ctx.fillStyle = (p.color || "#0ea5e9") + "33"; ctx.fill();
            ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fillStyle = p.color || "#0ea5e9"; ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5; ctx.stroke();
            if (p.label) {
                ctx.fillStyle = isDark ? "#fff" : "#0f172a"; ctx.font = "black 12px 'Plus Jakarta Sans'"; ctx.textAlign = "center";
                ctx.shadowBlur = 6; ctx.shadowColor = isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)";
                ctx.fillText(p.label, x, y - 14); ctx.shadowBlur = 0;
            }
        });

        // ─── ATMOSPHERIC SHINE & BORDER ───
        ctx.beginPath(); path({type: "Sphere"});
        const shine = ctx.createRadialGradient(width/2 - 40, height/2 - 40, 0, width/2, height/2, scaleRef.current);
        shine.addColorStop(0, "rgba(255,255,255,0.05)"); shine.addColorStop(1, "rgba(0,0,0,0.25)"); ctx.fillStyle = shine; ctx.fill();
        ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 4; ctx.stroke();
        ctx.shadowBlur = 20; ctx.shadowColor = "rgba(245, 158, 11, 0.3)"; ctx.stroke(); ctx.shadowBlur = 0;

    }, [worldData, activeTab, placedPieces, isDark, data, projectionRef, pathRef, scaleRef, isDraggingRef]);

    useEffect(() => {
        if (!isD3Ready || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        
        const init = () => {
            const rect = parent.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 2;
            canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
            const baseScale = Math.min(rect.width, rect.height) / 1.6;
            scaleRef.current = baseScale;

            const projection = d3.geoOrthographic()
                .scale(baseScale * (data.zoomFactor || 1))
                .translate([rect.width / 2, rect.height / 2])
                .rotate(rotationRef.current);

            projectionRef.current = projection;
            pathRef.current = d3.geoPath(projection, ctx);
            
            // --- 👆 CLICK DETECTION ---
            canvas.onclick = (e) => {
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const projection = projectionRef.current;
                const curCase = (data?.mode === 'study') ? data.cases[activeTab] : 
                               (data?.mode === 'quiz')  ? data.questions[activeTab] : {};
                const pts = curCase?.markers || curCase?.points || [];

                pts.forEach((p, idx) => {
                    const coords = [p.lon ?? p.lng ?? 0, p.lat ?? 0];
                    const pos = projection(coords);
                    if (pos) {
                        const dist = Math.sqrt((pos[0] - mouseX)**2 + (pos[1] - mouseY)**2);
                        if (dist < 25) { // Hit-test radius
                            if (onPinClick) onPinClick(idx);
                        }
                    }
                });
            };

            d3.select(canvas).call(d3.drag()
                .on("drag", (event) => {
                    isDraggingRef.current = true;
                    const rotate = projectionRef.current.rotate();
                    const scale = projectionRef.current.scale();
                    const newRotate = [rotate[0] + event.dx * (40 / scale), rotate[1] - event.dy * (40 / scale)];
                    projectionRef.current.rotate(newRotate);
                    rotationRef.current = newRotate;
                    draw();
                })
                .on("end", () => { isDraggingRef.current = false; draw(); })
            );
            draw();
        };

        const ro = new ResizeObserver(init);
        ro.observe(parent); init();
        return () => ro.disconnect();
    }, [isD3Ready, worldData, data.zoomFactor, rotationRef, scaleRef, isDraggingRef, projectionRef, pathRef, draw]);

    useEffect(() => { if (isD3Ready && worldData) draw(); }, [draw, isD3Ready, worldData]);

    return <canvas ref={canvasRef} className="w-full h-full drop-shadow-2xl" />;
};

export default GlobeCanvas;
