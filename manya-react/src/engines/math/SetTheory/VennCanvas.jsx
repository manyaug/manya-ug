import React, { useRef, useLayoutEffect, useCallback, useEffect } from 'react';

// Helper for alpha colors if not imported
const hexAlpha = (hex, alpha) => {
    if (!hex || hex === 'transparent' || !hex.startsWith('#')) return `rgba(0,0,0,0)`;
    return `${hex.substring(0, 7)}${alpha}`; 
};

/**
 * VENN CANVAS RENDERER
 * A "dumb" component that handles the heavy Canvas API drawing for Set Theory.
 */
const VennCanvas = ({ 
    l, 
    data, 
    isDark, 
    isTwoSet, 
    isResolved, 
    selectedRegions, 
    activeSets, 
    chips, 
    frozenZones,
    isHintVisible,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    currentStep,
    REGION_MAP,
    evaluateExpr,
    canvasSize
}) => {
    const canvasRef = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current; if (!canvas || !l) return;
        const ctx = canvas.getContext('2d');
        const { s, width, height, pad, isMobile, isDisjoint, c1, c2, r, cy, offset } = l;

        if (canvas.width !== width * s) canvas.width = width * s;
        if (canvas.height !== height * s) canvas.height = height * s;

        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.scale(s, s);

        const colors = { 
            text: isDark ? "#FFFFFF" : "#1E293B", 
            border: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9",
            universe: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
        };

        // ─── 📦 UNIVERSAL SET FRAME ───
        const boxPad = isMobile ? 12 : 24;
        const cornerRadius = isMobile ? 24 : 32;
        
        ctx.beginPath(); 
        ctx.roundRect(boxPad, boxPad, width - boxPad*2, height - boxPad*2, cornerRadius);
        
        // Premium background gradient
        const boxGlow = ctx.createLinearGradient(0, 0, 0, height);
        boxGlow.addColorStop(0, colors.universe);
        boxGlow.addColorStop(1, isDark ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)");
        
        ctx.fillStyle = boxGlow; 
        ctx.fill(); 
        ctx.strokeStyle = colors.border; 
        ctx.lineWidth = 1.5; 
        ctx.stroke();

        // Universe Symbol (ξ)
        ctx.fillStyle = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)";
        ctx.font = "800 24px 'Plus Jakarta Sans', serif"; 
        ctx.textAlign = "left";
        ctx.fillText("\u03BE", boxPad + 20, boxPad + 40);

        if (data.universal_total) {
            ctx.font = "800 12px 'Plus Jakarta Sans', sans-serif"; 
            ctx.fillStyle = isDark ? "#94a3b8" : "#64748b"; 
            ctx.textAlign = "right";
            ctx.fillText(`Total = ${data.universal_total}`, width - boxPad - 25, boxPad + 40);
        }

        if ((currentStep.interaction === 'DRAG_SETS' || currentStep.items) && activeSets.a) {
            const drawMovable = (obj, label, col) => {
                if (!obj) return;
                ctx.save(); ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI*2);
                const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, obj.r);
                g.addColorStop(0, hexAlpha(col, '00')); g.addColorStop(1, hexAlpha(col, '20')); ctx.fillStyle = g; ctx.fill();
                ctx.lineWidth = isMobile ? 6 : 8; ctx.shadowBlur = isResolved ? 30 : 15; ctx.shadowColor = isResolved ? "#22c55e" : col;
                ctx.strokeStyle = isResolved ? "#22c55e" : col; ctx.stroke();
                ctx.fillStyle = isDark ? "#FFFFFF" : "#1E293B"; ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif"; ctx.textAlign="center"; 
                ctx.shadowBlur = 0; 
                ctx.fillText(label, obj.x + (obj.label_dx || 0), obj.y - obj.r + (obj.label_dy || -20)); 
                ctx.restore();
            };
            drawMovable(activeSets.a, activeSets.a.label || activeSets.a.val, activeSets.a.color);
            if (activeSets.b) drawMovable(activeSets.b, activeSets.b.label || activeSets.b.val, activeSets.b.color);
        } else {
            const activeShades = new Set(selectedRegions);
            if (currentStep.targetRegion && !['CLICK_SUM', 'SHADE_REGION'].includes(currentStep.interaction)) {
                if (currentStep.type === 'REGION_ID_QUIZ' || isHintVisible || isResolved) {
                    (REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion]).forEach(z => activeShades.add(z));
                }
            }

            const SHADE_FILL = "rgba(251, 191, 36, 0.35)";
            const drawRegion = (type, col) => {
                ctx.save(); ctx.fillStyle = col; 
                if (type === 'center' && !isDisjoint && isTwoSet) {
                    ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.clip();
                    ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill();
                } else if (type === 'left') {
                    ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.clip();
                    if (isTwoSet && !isDisjoint) {
                        ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c2.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                    }
                    ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.fill();
                } else if (type === 'right' && isTwoSet) {
                    ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.clip();
                    if (!isDisjoint) {
                        ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c1.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                    }
                    ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill();
                } else if (type === 'outside') {
                    ctx.beginPath(); ctx.roundRect(boxPad, boxPad, width - boxPad*2, height - boxPad*2, 24); ctx.clip();
                    ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c1.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                    if (isTwoSet) {
                        ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c2.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                    }
                    ctx.beginPath(); ctx.roundRect(boxPad, boxPad, width - boxPad*2, height - boxPad*2, 24); ctx.fill();
                }
                ctx.restore();
            };
            activeShades.forEach(reg => drawRegion(reg, SHADE_FILL));

            const drawStatic = (x, y, rad, col) => {
                ctx.save(); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI*2);
                const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
                g.addColorStop(0, hexAlpha(col, '00')); g.addColorStop(1, hexAlpha(col, '15')); ctx.fillStyle = g; ctx.fill();
                ctx.lineWidth = isMobile ? 5 : 7; ctx.shadowBlur = 15; ctx.shadowColor = col; ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
            };
            drawStatic(c1.x, cy, r, c1.color);
            if (isTwoSet) drawStatic(c2.x, cy, r, c2.color);

            ctx.font = `800 ${isMobile ? 18 : 22}px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign="center";
            if (data.sets?.A) { ctx.fillStyle = c1.color; ctx.fillText(data.sets.A.label || data.sets.A.val || "", c1.x, cy - r - (isMobile ? 15 : 25)); }
            if (isTwoSet && data.sets?.B) { ctx.fillStyle = c2.color; ctx.fillText(data.sets.B.label || data.sets.B.val || "", c2.x, cy - r - (isMobile ? 15 : 25)); }

            const renderMembers = (src) => {
                if (!src) return;
                ['left','center','right','outside'].forEach(reg => {
                    const rawItems = src[reg] || [];
                    const items = Array.isArray(rawItems) ? rawItems : [rawItems];
                    
                    items.forEach((v, i) => {
                        let lx, ly;
                        if (reg === 'left') { lx = c1.x - (isDisjoint ? 0 : offset * 0.85); ly = cy; }
                        else if (reg === 'right') { lx = c2.x + (isDisjoint ? 0 : offset * 0.85); ly = cy; }
                        else if (reg === 'center') { lx = width/2; ly = cy; }
                        else if (reg === 'outside') { lx = width - boxPad - 50; ly = height - boxPad - 50; }
                        
                        if (items.length > 1) { lx += (i - (items.length-1)/2) * 20; }

                        const displayVal = evaluateExpr(String(v), currentStep.x_val || 0);
                        ctx.fillStyle = colors.text; ctx.font = "800 18px 'Plus Jakarta Sans', sans-serif"; ctx.textAlign="center"; 
                        ctx.fillText(displayVal, lx, ly);
                    });
                });
            };
            // Render stationary members (from data.zones or history)
            if (chips.length === 0) {
                if (frozenZones) renderMembers(frozenZones);
                else if (currentStep.interaction !== 'DRAG_SORT' && data.zones) renderMembers(data.zones);
            }
        }

        chips.forEach(c => {
            ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, Math.PI*2);
            ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"; ctx.shadowBlur=10; ctx.shadowColor="rgba(0,0,0,0.2)"; ctx.fill();
            ctx.strokeStyle = isResolved ? "#16a34a" : (isDark?"#4b5563":"#cbd5e1"); ctx.lineWidth=2; ctx.stroke();
            ctx.fillStyle=colors.text; ctx.font="800 20px 'Plus Jakarta Sans', sans-serif"; ctx.textAlign="center"; ctx.fillText(c.val, c.x, c.y + 7); ctx.restore();
        });
    }, [l, data, isDark, isTwoSet, isResolved, selectedRegions, activeSets, chips, frozenZones, isHintVisible, currentStep, REGION_MAP, evaluateExpr]);

    // --- 🖋️ RENDER & EVENTS ---
    useEffect(() => {
        draw();
    }, [draw]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleDown = (e) => onMouseDown?.(e);
        const handleMove = (e) => onMouseMove?.(e);
        const handleUp = (e) => onMouseUp?.(e);

        canvas.addEventListener('mousedown', handleDown);
        canvas.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);

        canvas.addEventListener('touchstart', handleDown, { passive: false });
        canvas.addEventListener('touchmove', handleMove, { passive: false });
        canvas.addEventListener('touchend', handleUp, { passive: false });

        return () => {
            canvas.removeEventListener('mousedown', handleDown);
            canvas.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            canvas.removeEventListener('touchstart', handleDown);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchend', handleUp);
        };
    }, [onMouseDown, onMouseMove, onMouseUp]);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full block touch-none" 
        />
    );
};

export default VennCanvas;
