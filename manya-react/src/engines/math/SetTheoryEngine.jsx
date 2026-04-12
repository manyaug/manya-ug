import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Lightbulb, CheckCircle2, AlertCircle, Compass, Zap, ArrowRight, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MANYA SET THEORY ENGINE v7.0 (OmniVenn)
 * -------------------------------------------------------------
 * - ADAPTIVE LAYOUT: Detects n=1 vs n=2 sets and centers with halo effects.
 * - MULTI-SLOT INPUT: Decentralized answers inside the Venn regions.
 * - UNIFIED ARCHITECTURE: Consistent visual language for all 6 interaction modes.
 */

const SetTheoryEngine = ({ data, onComplete, onResult }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // v7.0: { left: '', center: '', right: '', outside: '' }
  const [selectedRegions, setSelectedRegions] = useState(new Set());
  const [chips, setChips] = useState([]);
  const [activeSets, setActiveSets] = useState({ a: null, b: null });
  const [frozenZones, setFrozenZones] = useState(null);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [isResolved, setIsResolved] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef(null);
  const draggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  
  const currentStep = data?.questions?.[stepIdx];
  const isTwoSet = !!(data?.sets?.B && data?.sets?.B?.label !== "");

  // --- 🪄 THEME SYNC ---
  useLayoutEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDark(theme === 'dark');
    };
    checkTheme();
    const obs = new MutationObserver(checkTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // --- 🛠️ HELPERS ---
  const hexAlpha = (hex, alpha) => {
    if (!hex || hex === 'transparent' || !hex.startsWith('#')) return `rgba(0,0,0,0)`;
    return `${hex.substring(0, 7)}${alpha}`; 
  };

  const REGION_MAP = {
      'intersection': ['center'],
      'union': ['left', 'center', 'right'],
      'left_total': ['left', 'center'],
      'right_total': ['right', 'center'],
      'complement_left': ['right', 'outside'],
      'complement_right': ['left', 'outside'],
      'outside': ['outside'],
      'left': ['left'],
      'right': ['right'],
      'center': ['center'],
      'symmetric_difference': ['left', 'right'],
      'universal_only': ['outside'],
      'left_only': ['left'],
      'right_only': ['right'],
      'universal_total': ['left', 'center', 'right', 'outside']
  };


  const computeLayout = useCallback(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return null;
    const { width, height } = canvasSize;
    const isMobile = width <= 480;
    
    // DISJOINT DETECTION
    const isDisjoint = (data.topic || "").toLowerCase().includes("disjoint") || 
                      (data.variantTitle || "").toLowerCase().includes("disjoint") ||
                      (data.zones && data.zones.center && data.zones.center.length === 0 && currentStep.interaction === 'DRAG_SORT');

    const r = Math.min(isMobile ? 85 : 120, width * 0.28);
    // v7.0: If one set, offset is 0. If two sets, they overlap.
    const offset = !isTwoSet ? 0 : (isDisjoint ? r * 1.05 : r * 0.55); 
    const cy = (currentStep.interaction === 'DRAG_SORT' && !isMobile) ? height * 0.42 : height * 0.5;

    // Safety check for sets data
    const setAColor = data.sets?.A?.color || "#16a34a";
    const setBColor = data.sets?.B?.color || "#ea580c";

    return {
      c1: { x: width/2 - offset, y: cy, color: setAColor },
      c2: { x: width/2 + offset, y: cy, color: setBColor },
      r, cx: width/2, cy, width, height, s: window.devicePixelRatio || 2, isMobile, pad: isMobile ? 12 : 20, isDisjoint, offset
    };
  }, [canvasSize, currentStep, data, isTwoSet]);

  const normX = (val) => (val / 400) * canvasSize.width;
  const normY = (val) => (val / 400) * canvasSize.height;

  // v7.7: Move normalize to component scope so it's accessible by layout effects
  const normalize = (t) => String(t || "").toLowerCase().trim().replace(/[\{\}\s]/g, '').split(',').filter(x => x !== "").sort().join(',');

  const getFirstUserAnswer = () => Object.values(userAnswers).find(v => v !== '') || '';

  const evaluateExpr = (expr, val) => {
    if (!expr || typeof expr !== 'string') return expr;
    const cleanVal = String(val || "").trim();
    if (!cleanVal || isNaN(cleanVal)) return expr;
    try {
        const num = parseFloat(cleanVal);
        const resolved = expr.toLowerCase().replace(/[a-z]/g, `(${num})`).replace(/ /g, '');
        if (!/^[0-9+\-*/().\s]+$/.test(resolved)) return expr;
        return eval(resolved);
    } catch { return expr; }
  };

  // --- 🎨 RENDER ENGINE (OmniVenn v7.0) ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || canvasSize.width === 0) return;
    const ctx = canvas.getContext('2d'); const l = computeLayout(); if (!l) return;
    const { s, width, height, pad, isMobile, isDisjoint } = l;

    if (canvas.width !== width * s) canvas.width = width * s;
    if (canvas.height !== height * s) canvas.height = height * s;

    // Reset transform completely before clearing to prevent subpixel antialiasing accumulation
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    ctx.scale(s, s);

    const colors = { 
        text: isDark ? "#FFFFFF" : "#1E293B", 
        border: isDark ? "rgba(255,255,255,0.1)" : "#F1F5F9",
        universe: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
    };

    // ─── 📦 UNIVERSAL SET FRAME ───
    const boxPad = isMobile ? 10 : 20;
    ctx.beginPath(); ctx.roundRect(boxPad, boxPad, width - boxPad*2, height - boxPad*2, 24);
    ctx.fillStyle = colors.universe; ctx.fill(); ctx.strokeStyle = colors.border; ctx.lineWidth = 2; ctx.stroke();

    // Universal Set Symbols
    ctx.fillStyle = colors.text; ctx.font = "800 20px 'Plus Jakarta Sans', serif"; ctx.fillText("\u03BE", boxPad + 15, boxPad + 35);
    if (data.universal_total) {
        ctx.font = "800 12px 'Plus Jakarta Sans', sans-serif"; ctx.fillStyle = isDark ? "#94a3b8" : "#64748b"; ctx.textAlign = "right";
        ctx.fillText(`Total = ${data.universal_total}`, width - boxPad - 20, boxPad + 35);
    }

    if ((currentStep.interaction === 'DRAG_SETS' || currentStep.items) && activeSets.a) {
        const drawMovable = (obj, label, col) => {
            if (!obj) return;
            ctx.save(); ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI*2);
            const g = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, obj.r);
            g.addColorStop(0, hexAlpha(col, '00')); g.addColorStop(1, hexAlpha(col, '20')); ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = isMobile ? 6 : 8; ctx.shadowBlur = isResolved ? 30 : 15; ctx.shadowColor = isResolved ? "#22c55e" : col;
            ctx.strokeStyle = isResolved ? "#22c55e" : col; ctx.stroke();
            const txtCol = isDark ? "#FFFFFF" : "#1E293B"; // Use theme-aware solid color
            ctx.fillStyle = txtCol; ctx.font = "800 24px 'Plus Jakarta Sans', sans-serif"; ctx.textAlign="center"; 
            ctx.shadowBlur = 0; // Disable shadow for text to keep it crisp
            
            // v7.2: Support custom label vertical/horizontal offset
            const dy = obj.label_dy || -20;
            const dx = obj.label_dx || 0;
            ctx.fillText(label, obj.x + dx, obj.y - obj.r + dy); 
            ctx.restore();
        };
        drawMovable(activeSets.a, activeSets.a.label, activeSets.a.color);
        if (activeSets.b) drawMovable(activeSets.b, activeSets.b.label, activeSets.b.color);
    } else {
        const { c1, c2, r, cy, offset } = l;
        const activeShades = new Set(selectedRegions);

        // v7.3: SMART SHADE LOGIC
        // REGION_ID_QUIZ: The shading IS the question — always show it.
        // Other types: Only show on hint or after resolution (anti-spoiler).
        const isVisualQuestion = currentStep.type === 'REGION_ID_QUIZ';
        if (currentStep.targetRegion && !['CLICK_SUM', 'SHADE_REGION'].includes(currentStep.interaction)) {
            if (isVisualQuestion || isHintVisible || isResolved) {
                (REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion]).forEach(z => activeShades.add(z));
            }
        }

        // v7.3: Create a diagonal-stripe pattern for extra clarity
        const createHatchPattern = () => {
            const patCanvas = document.createElement('canvas');
            patCanvas.width = 12; patCanvas.height = 12;
            const pCtx = patCanvas.getContext('2d');
            pCtx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
            pCtx.lineWidth = 1.5;
            pCtx.beginPath();
            pCtx.moveTo(0, 12); pCtx.lineTo(12, 0);
            pCtx.moveTo(-4, 4); pCtx.lineTo(4, -4);
            pCtx.moveTo(8, 16); pCtx.lineTo(16, 8);
            pCtx.stroke();
            return ctx.createPattern(patCanvas, 'repeat');
        };

        // v7.3: Enhanced region drawing with solid fill + hatching + border
        const SHADE_FILL = "rgba(251, 191, 36, 0.35)";
        const SHADE_BORDER = "rgba(251, 191, 36, 0.8)";
        const hatchPat = activeShades.size > 0 ? createHatchPattern() : null;

        const drawRegion = (type, col) => {
            ctx.save(); ctx.fillStyle = col; 
            
            if (type === 'center' && !isDisjoint && isTwoSet) {
                // CLIP to A, then Draw B (Produces the intersection)
                ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.clip();
                ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill();
            } else if (type === 'left') {
                // Target A, exclude B
                ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.clip();
                if (isTwoSet && !isDisjoint) {
                    ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c2.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                }
                ctx.beginPath(); ctx.arc(c1.x, cy, r, 0, Math.PI*2); ctx.fill();
            } else if (type === 'right' && isTwoSet) {
                // Target B, exclude A
                ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.clip();
                if (!isDisjoint) {
                    ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c1.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                }
                ctx.beginPath(); ctx.arc(c2.x, cy, r, 0, Math.PI*2); ctx.fill();
            } else if (type === 'outside') {
                const bPad = isMobile ? 10 : 20;
                ctx.beginPath(); ctx.roundRect(bPad, bPad, width - bPad*2, height - bPad*2, 24); ctx.clip();
                
                // Exclude A
                ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c1.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                
                // Exclude B
                if (isTwoSet) {
                    ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c2.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                }
                
                ctx.beginPath(); ctx.roundRect(bPad, bPad, width - bPad*2, height - bPad*2, 24); ctx.fill();
            }
            ctx.restore();

            // Second pass: hatch overlay (if not outside, which is just solid fill)
            if (hatchPat && type !== 'outside') {
                ctx.save(); ctx.fillStyle = hatchPat;
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
                }
                ctx.restore();
            } else if (hatchPat && type === 'outside') {
                // Hatch for outside too if requested
                ctx.save(); ctx.fillStyle = hatchPat;
                const bPad = isMobile ? 10 : 20;
                
                ctx.beginPath(); ctx.roundRect(bPad, bPad, width - bPad*2, height - bPad*2, 24); ctx.clip();
                ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c1.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                if (isTwoSet) {
                    ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(c2.x, cy, r, 0, Math.PI*2, true); ctx.clip();
                }
                
                ctx.beginPath(); ctx.roundRect(bPad, bPad, width - bPad*2, height - bPad*2, 24); ctx.fill();
                ctx.restore();
            }
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

        const labelSize = isMobile ? 18 : 22;
        ctx.font = `800 ${labelSize}px 'Plus Jakarta Sans', sans-serif`; ctx.textAlign="center";
        if (data.sets?.A) {
            ctx.fillStyle = c1.color; ctx.fillText(data.sets.A.label, c1.x, cy - r - (isMobile ? 15 : 25));
        }
        if (isTwoSet && data.sets?.B) { 
            ctx.fillStyle = c2.color; ctx.fillText(data.sets.B.label, c2.x, cy - r - (isMobile ? 15 : 25)); 
        }

        const isSingleInput = ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET'].includes(currentStep.type) || ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.engineType);
        let iZones = [];
        if (currentStep.interaction === 'DIAGRAM_FILL' && currentStep.inputs) {
            iZones = currentStep.inputs.map(i => i.region);
        } else if (!isSingleInput && !['CHOICE', 'BINARY', 'SHADE_REGION', 'CLICK_SUM', 'DRAG_SORT', 'DRAG_SETS'].includes(currentStep.interaction)) {
            // v7.3: Only auto-generate input slots for legacy fill modes or diagram identification
            iZones = ['left', 'center', 'right', 'outside'].filter(zone => {
               const expectedRegions = REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion];
               const isTarget = expectedRegions.includes(zone) || (currentStep.targetZones && currentStep.targetZones.includes(zone));
               return isTarget || (data.zones && data.zones[zone] && data.zones[zone].includes('?'));
            });
        }

        const renderMembers = (src) => {
            if (!src) return;
            ['left','center','right','outside'].forEach(reg => {
                const arr = src[reg]; if (!arr) return;
                arr.forEach((v, i) => {
                    let lx, ly;
                    if (reg === 'left') { lx = c1.x - (isDisjoint ? 0 : offset * 0.85); ly = cy; }
                    else if (reg === 'right') { lx = c2.x + (isDisjoint ? 0 : offset * 0.85); ly = cy; }
                    else if (reg === 'center') { lx = width/2; ly = cy; }
                    else if (reg === 'outside') { lx = width - boxPad - 50; ly = height - boxPad - 50; }

                    const isWordList = arr.some(x => String(x).length > 1);
                    if (arr.length > 1) {
                         if (isWordList && arr.length <= 5) {
                             const stackSpacing = 32;
                             const startY = cy - ((arr.length - 1) * stackSpacing) / 2;
                             ly = startY + (i * stackSpacing);
                         } else {
                             // v7.9: Dynamic spread based on count and string length
                             const maxStrLen = Math.max(...arr.map(x => String(x).length));
                             const spreadBase = isMobile ? 16 : 20;
                             const countFactor = arr.length <= 3 ? 1 : Math.min(1.5, 1 + ((arr.length-3) / 8));
                             const lengthFactor = Math.max(1, Math.min(1.5, maxStrLen / 3));
                             const spread = spreadBase * countFactor * lengthFactor;

                             if (arr.length === 2) {
                                 lx += (i === 0 ? -spread : spread);
                             } else if (arr.length === 3) {
                                 const angle = (i === 0 ? -Math.PI/2 : (i === 1 ? Math.PI*1/6 : Math.PI*5/6));
                                 lx += Math.cos(angle) * spread;
                                 ly += Math.sin(angle) * spread;
                             } else {
                                 const angle = (i / arr.length) * Math.PI * 2;
                                 lx += Math.cos(angle) * spread;
                                 ly += Math.sin(angle) * spread;
                             }
                         }
                    }

                    const valToEval = currentStep.x_val;
                    const displayVal = evaluateExpr(v, valToEval);
                    const isEquation = v !== String(displayVal) || /^[0-9+\-*/().\s]*[a-z][0-9+\-*/().\s]*$/i.test(String(v));
                    
                    // v7.9: Only hide explicit placeholders in DIAGRAM_FILL mode
                    const isPlaceHolder = v === '?' || (currentStep.interaction === 'DIAGRAM_FILL' && Array.isArray(currentStep.inputs) && currentStep.inputs.some(inp => inp.region === reg && inp.expected === String(v)));
                    if (!isResolved && iZones.includes(reg) && isPlaceHolder) return; 

                    let baseSize = isMobile ? 22 : 28;
                    const strLen = String(displayVal).length;
                    if (isEquation) baseSize = isMobile ? 16 : 20;
                    else if (strLen > 4) baseSize = isMobile ? 14 : 16;
                    else if (strLen > 3) baseSize = isMobile ? 16 : 18;
                    else if (strLen > 2) baseSize = isMobile ? 18 : 22;

                    ctx.save(); 
                    if (isEquation) {
                        ctx.fillStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
                        ctx.beginPath(); ctx.roundRect(lx - (baseSize*1.5), ly - (baseSize*1.1), baseSize*3, baseSize*2.2, 12); ctx.fill();
                    }
                    ctx.fillStyle = isEquation ? (isDark ? "#fcd34d" : "#d97706") : colors.text; 
                    ctx.font = isEquation ? `800 ${baseSize}px 'Plus Jakarta Sans', ui-monospace, monospace` : `800 ${baseSize}px 'Plus Jakarta Sans', sans-serif`; 
                    ctx.textAlign="center"; ctx.fillText(displayVal, lx, ly + (baseSize * 0.35)); ctx.restore();
                });
            });
        };
        if (currentStep.retain_visuals && frozenZones) renderMembers(frozenZones);
        else if (currentStep.interaction !== 'DRAG_SORT' && data.zones) renderMembers(data.zones);
    }

    chips.forEach(c => {
        ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, Math.PI*2);
        ctx.fillStyle = isDark ? "#1e293b" : "#ffffff"; ctx.shadowBlur=10; ctx.shadowColor="rgba(0,0,0,0.2)"; ctx.fill();
        ctx.strokeStyle = isResolved ? "#16a34a" : (isDark?"#4b5563":"#cbd5e1"); ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle=colors.text; ctx.font="800 20px 'Plus Jakarta Sans', sans-serif"; ctx.textAlign="center"; ctx.fillText(c.val, c.x, c.y + 7); ctx.restore();
    });
  }, [computeLayout, canvasSize, isDark, selectedRegions, currentStep, chips, frozenZones, isTwoSet, activeSets, isResolved, userAnswers, data, isHintVisible]);


  // --- 🧠 LOGIC ENGINE (OmniVenn v7.0) ---
  const validate = useCallback(() => {
    let isCorrect = false; let corrected = "";

    if (currentStep.interaction === 'DRAG_SETS') {
        const d = Math.hypot(activeSets.a.x - activeSets.b.x, activeSets.a.y - activeSets.b.y);
        const rA = activeSets.a.r, rB = activeSets.b.r;
        const target = String(currentStep.items.find(it => it.target)?.target || "").toLowerCase();
        
        if (target.includes('inside') || target.includes('subset')) {
            // Subset: d + smaller_r < larger_r (Full containment)
            // v7.8: Added a 20px tactile buffer so it's easier to satisfy
            isCorrect = (d + Math.min(rA, rB)) < (Math.max(rA, rB) + 20);
        } else if (target.includes('disjoint')) {
            isCorrect = d > (rA + rB) - 15;
        } else if (target.includes('overlap')) {
            isCorrect = d < (rA + rB) - 15 && d > Math.abs(rA - rB) + 15;
        }
    } else if (currentStep.interaction === 'DRAG_SORT') {
        const l = computeLayout(); 
        isCorrect = chips.every(c => {
            let actual = "outside";
            const d1 = Math.hypot(c.x - l.c1.x, c.y - l.cy), d2 = Math.hypot(c.x - l.c2.x, c.y - l.cy);
            if (!l.isDisjoint && isTwoSet && d1 < l.r && d2 < l.r) actual = "center";
            else if (d1 < l.r) actual = "left"; else if (d2 < l.r && isTwoSet) actual = "right";
            return actual === c.target;
        });
    } else if (currentStep.interaction === 'CLICK_SUM' || currentStep.interaction === 'SHADE_REGION') {
        const expectedRegions = REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion];
        const selectedArr = Array.from(selectedRegions);
        isCorrect = selectedArr.length === expectedRegions.length && expectedRegions.every(r => selectedArr.includes(r));
        corrected = expectedRegions.join(', ');
    } else if (currentStep.interaction === 'CHOICE' || currentStep.interaction === 'BINARY') {
        isCorrect = normalize(getFirstUserAnswer()) === normalize(currentStep.expected);
        corrected = String(currentStep.expected);
    } else if (currentStep.interaction === 'DIAGRAM_FILL') {
        isCorrect = (currentStep.inputs || []).every(inp => {
             return normalize(userAnswers[inp.region] || '') === normalize(inp.expected);
        });
        corrected = (currentStep.inputs || []).map(inp => `${inp.region}:${inp.expected}`).join(' | ');
    } else if (['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET'].includes(currentStep.type) || ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.engineType)) {
        const expected = currentStep.type === 'ALGEBRA_SOLVE' ? (currentStep.expected_x !== undefined ? currentStep.expected_x : (currentStep.x_val !== undefined ? currentStep.x_val : currentStep.total)) : 
                       (['REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET'].includes(currentStep.type) ? currentStep.expected_val : undefined);
        
        if (expected !== undefined) {
             isCorrect = normalize(getFirstUserAnswer()) === normalize(String(expected));
             corrected = String(expected);
        } else {
             const targetZones = currentStep.targetZones || REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion || 'center'];
             
             if (currentStep.type === 'COUNT' || currentStep.type === 'SUBSET_COUNT' || currentStep.type === 'PROPER_SUBSET_COUNT' || (currentStep.engineType && currentStep.engineType.includes('COUNT'))) {
                 const count = targetZones.reduce((acc, z) => acc + (data.zones[z] || []).length, 0);
                 const expectedVal = currentStep.type === 'PROPER_SUBSET_COUNT' ? String(Math.pow(2, count) - 1) : (currentStep.type === 'SUBSET_COUNT' ? String(Math.pow(2, count)) : String(count));
                 isCorrect = normalize(getFirstUserAnswer()) === normalize(expectedVal);
                 corrected = expectedVal;
             } else if (currentStep.type === 'COUNT_SUM') {
                 const passVal = currentStep.x_val !== undefined ? currentStep.x_val : (getFirstUserAnswer() || 0);
                 const sum = targetZones.reduce((acc, z) => {
                     return acc + (data.zones[z] || []).reduce((inAcc, val) => inAcc + (parseFloat(evaluateExpr(val, passVal)) || 0), 0);
                 }, 0);
                 isCorrect = normalize(getFirstUserAnswer()) === normalize(String(sum));
                 corrected = String(sum);
             } else {
                 isCorrect = targetZones.every(zone => {
                     const input = userAnswers[zone] || getFirstUserAnswer(); // Fallback for single input
                     const truth = data.zones[zone] || [];
                     const expected = currentStep.x_val !== undefined ? truth.map(t => evaluateExpr(t, currentStep.x_val)).join(',') : truth.join(',');
                     return normalize(input) === normalize(expected);
                 });
                 corrected = targetZones.map(z => {
                     const truth = data.zones[z] || [];
                     return currentStep.x_val !== undefined ? truth.map(t => evaluateExpr(t, currentStep.x_val)).join(',') : truth.join(',');
                 }).join(' | ');
             }
        }
    } else {
        // v7.0: Multi-Slot Validation
        const targetZones = currentStep.targetZones || REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion || 'center'];
        isCorrect = targetZones.every(zone => {
           const input = userAnswers[zone];
           const truth = data.zones[zone] || [];
           const isCountQ = currentStep.type === 'COUNT' || currentStep.engineType?.includes('COUNT');
           const expected = isCountQ ? String(truth.length) : (currentStep.x_val !== undefined ? truth.map(t => evaluateExpr(t, currentStep.x_val)).join(',') : truth.join(','));
           return normalize(input) === normalize(expected);
        });
        corrected = targetZones.map(z => {
           const truth = data.zones[z] || [];
           return currentStep.x_val !== undefined ? truth.map(t => evaluateExpr(t, currentStep.x_val)).join(',') : truth.join(',');
        }).join(' | ');
    }
    return { isCorrect, corrected };
  }, [currentStep, userAnswers, chips, activeSets, computeLayout, data.zones, isTwoSet, selectedRegions]);

  const handleInteraction = useCallback(() => {
    if (isResolved) { 
        if (stepIdx < data.questions.length - 1) { 
            setStepIdx(p => p+1); 
            setUserAnswers({}); 
            setSelectedRegions(new Set());
            setIsResolved(false); 
            setFeedback({text:'', type:''}); 
            return; 
        }
        else { onComplete(); return; }
    }
    const { isCorrect, corrected } = validate();
    if (onResult) onResult({ isCorrect, selectedAnswer: Object.values(userAnswers).join('|'), correctAnswer: corrected, type: 'simulation' });
    if (isCorrect) { setIsResolved(true); setFeedback({ text: '🌟 EXCELLENT!', type: 'success' }); window.ManyaAudio?.correct(); }
    else { 
        setFeedback({ text: 'TRY AGAIN!', type: 'error' }); window.ManyaAudio?.wrong(); 
        setTimeout(() => setFeedback(prev => prev.type === 'error' ? {text:'', type:''} : prev), 2000);
    }
  }, [isResolved, stepIdx, data, validate, onComplete, onResult, userAnswers]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => { 
        if (entries[0] && entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0) {
            setCanvasSize({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }); 
        }
    }); 
    if (canvasRef.current) observer.observe(canvasRef.current); 
    return () => observer.disconnect(); 
  }, []);

  useEffect(() => {
    if (canvasSize.width === 0 || !currentStep) return;
    setSelectedRegions(new Set());
    setFrozenZones(null); // v8.4: Clear visual persistence cache on new steps
    if (currentStep.interaction === 'DRAG_SORT') {
        const l = computeLayout();
        setChips((currentStep.items || []).map((it, i) => ({ ...it, id: `chip-${i}`, x: normX(50 + i*60), y: l.height - 50 })));
    } else if (currentStep.interaction === 'DRAG_SETS' || currentStep.items) {
        const sA = currentStep.items?.[0], sB = currentStep.items?.[1];
        if (!sA) return;
        
        // v7.2: Smarter defaults for custom diagrams. Center if coords missing.
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;
        const r = sA.radius || 60;
        
        // v7.5 & v7.6: Relationship Positioning Logic (overlap, disjoint, subset)
        let offA = 0, offB = 0;
        if (sB) {
            // Check target property OR infer from expected answer if missing
            const normExpected = normalize(currentStep.expected);
            const target = sA.target || sB.target || 
                         (normExpected.includes('intersect') ? 'overlap' : 
                         (normExpected.includes('disjoint') ? 'disjoint' : 
                         (normExpected.includes('equal') ? 'equal' : "")));
            
            if (target === 'overlap') { offA = -r * 0.6; offB = r * 0.6; } 
            else if (target === 'disjoint') { offA = -r * 1.25; offB = r * 1.25; }
            else if (target === 'subset') { offA = -10; offB = 0; }
            else if (target === 'equal') { 
                // v7.7: For Equal Sets, we keep circles perfectly overlapping but nudge labels
                // We'll handle this by giving them slightly different label offsets
                sA.forced_label_dx = -25;
                sB.forced_label_dx = 25;
            }
        }

        setActiveSets({
            a: { 
                x: sA.x !== undefined ? normX(sA.x) : centerX + offA, 
                y: sA.y !== undefined ? normY(sA.y) : centerY, 
                r: r, 
                label: sA.val, 
                color: sA.color || "#16a34a", 
                locked: sA.locked, 
                label_dy: sA.label_dy,
                label_dx: sA.forced_label_dx || 0,
                id: 'a' 
            },
            b: sB ? { 
                x: sB.x !== undefined ? normX(sB.x) : centerX + offB, 
                y: sB.y !== undefined ? normY(sB.y) : centerY, 
                r: sB.radius || 60, 
                label: sB.val, 
                color: sB.color || "#ea580c", 
                locked: sB.locked, 
                label_dy: sB.label_dy,
                label_dx: sB.forced_label_dx || 0,
                id: 'b' 
            } : null
        });
    } else { setChips([]); setActiveSets({a:null, b:null}); }
  }, [stepIdx, canvasSize, currentStep]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = (cx - rect.left) * (canvasSize.width / rect.width), py = (cy - rect.top) * (canvasSize.height / rect.height);
    if (currentStep.interaction === 'DRAG_SETS') {
        const hit = [activeSets.b, activeSets.a].find(s => s && !s.locked && Math.hypot(px - s.x, py - s.y) < s.r);
        if (hit) { draggingRef.current = hit; dragOffsetRef.current = { x: px - hit.x, y: py - hit.y }; }
    } else if (currentStep.interaction === 'DRAG_SORT') {
        const chip = [...chips].reverse().find(c => Math.hypot(c.x - px, c.y - py) < 22);
        if (chip) { draggingRef.current = chip; dragOffsetRef.current = { x: px - chip.x, y: py - chip.y }; }
    } else if (currentStep.interaction === 'CLICK_SUM' || currentStep.interaction === 'SHADE_REGION') {
        const l = computeLayout();
        if (!l) return;
        const d1 = Math.hypot(px - l.c1.x, py - l.cy), d2 = Math.hypot(px - l.c2.x, py - l.cy);
        let tappedZone = null; 
        
        // v7.9: Precise hit detection for regions. 
        // Hierarchy: Priority to Center (Intersection) > Circles > Background.
        if (!l.isDisjoint && isTwoSet && d1 < l.r && d2 < l.r) tappedZone = 'center';
        else if (d1 < l.r) tappedZone = 'left';
        else if (d2 < l.r && isTwoSet) tappedZone = 'right';
        else tappedZone = 'outside'; // Click anywhere else in box hits background

        if (!tappedZone) return;

        setSelectedRegions(prev => {
             const next = new Set(prev);
             if (next.has(tappedZone)) next.delete(tappedZone); else next.add(tappedZone);
             return next;
        });
    }
  };

  const onMouseMove = (e) => {
    if (!draggingRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX, cy = e.touches ? e.touches[0].clientY : e.clientY;
    const px = Math.max(25, Math.min(canvasSize.width-25, (cx - rect.left) * (canvasSize.width / rect.width)));
    const py = Math.max(25, Math.min(canvasSize.height-25, (cy - rect.top) * (canvasSize.height / rect.height)));
    const dragTarget = draggingRef.current;
    if (currentStep.interaction === 'DRAG_SETS') {
        setActiveSets(prev => ({ ...prev, [dragTarget.id]: { ...prev[dragTarget.id], x: px - dragOffsetRef.current.x, y: py - dragOffsetRef.current.y } }));
    } else {
        setChips(prev => prev.map(c => c.id === dragTarget.id ? { ...c, x: px - dragOffsetRef.current.x, y: py - dragOffsetRef.current.y } : c));
    }
  };

  const getSlotPos = (zone) => {
    const l = computeLayout(); if (!l) return { x: 0, y: 0 };
    const { c1, c2, r, cy, width, height, offset } = l;
    if (zone === 'left') return { x: c1.x - (l.isDisjoint ? 0 : offset * 0.85), y: cy };
    if (zone === 'right') return { x: c2.x + (l.isDisjoint ? 0 : offset * 0.85), y: cy };
    if (zone === 'center' || zone === 'intersection') return { x: width/2, y: cy };
    if (zone === 'outside') return { x: width - (l.isMobile ? 10 : 20) - 50, y: height - (l.isMobile ? 10 : 20) - 55 };
    return { x: width/2, y: cy };
  };

  if (!currentStep || !data) return null;

  // v7.1 / v8.2: Single-Input requirements — REVERSE_SUBSET uses bottom-docked input
  const isSingleInput = ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT', 'REVERSE_SUBSET', 'REVERSE_PROPER_SUBSET'].includes(currentStep.type) || ['ALGEBRA_SOLVE', 'COUNT_SUM', 'COUNT', 'SUBSET_COUNT', 'PROPER_SUBSET_COUNT'].includes(currentStep.engineType);

  let interactiveZones = [];
  if (currentStep.interaction === 'DIAGRAM_FILL' && currentStep.inputs) {
      interactiveZones = currentStep.inputs.map(i => i.region);
  } else if (!isSingleInput && !['CHOICE', 'BINARY', 'SHADE_REGION', 'CLICK_SUM', 'DRAG_SORT', 'DRAG_SETS'].includes(currentStep.interaction)) {
      interactiveZones = ['left', 'center', 'right', 'outside'].filter(zone => {
        const expectedRegions = REGION_MAP[currentStep.targetRegion] || [currentStep.targetRegion];
        const isTarget = expectedRegions.includes(zone) || 
                        (currentStep.targetZones && currentStep.targetZones.includes(zone));
        const hasPrompt = (data.zones && data.zones[zone] && data.zones[zone].includes('?'));
        return isTarget || hasPrompt;
      });
  }

  const showFallback = isSingleInput || (!['BINARY','DRAG_SETS','DRAG_SORT','SHADE_REGION', 'CLICK_SUM', 'DIAGRAM_FILL'].includes(currentStep.interaction) && interactiveZones.length === 0);

  const isMobile = window.innerWidth <= 480;

  return (
    <div ref={containerRef} className={`flex flex-col items-center justify-center p-0 sm:p-4 h-full w-full ${isDark ? 'bg-[#0F172A]' : 'bg-[#FDFBF7]'} font-jakarta transition-colors duration-300 overflow-hidden min-h-0`}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`w-full max-w-xl flex-1 min-h-0 ${isDark ? 'bg-[#1E293B] border-white/10' : 'bg-white border-slate-100'} rounded-none sm:rounded-[2.5rem] shadow-2xl border relative flex flex-col overflow-hidden`} style={{ padding: 'clamp(12px, 2vh, 32px)' }}>
        {/* Header HUD */}
        <div className="flex gap-2 justify-center" style={{ marginBottom: 'clamp(4px, 1vh, 16px)' }}>{data.questions.map((_, i) => (<div key={i} className={`w-2 h-2 rounded-full transition-all ${i === stepIdx ? 'bg-amber-500 w-6' : (i < stepIdx ? 'bg-emerald-500' : (isDark ? 'bg-slate-700' : 'bg-slate-200'))}`} />))}</div>
        <div className="flex items-center justify-between" style={{ marginBottom: 'clamp(4px, 1vh, 16px)' }}>
            <div className="flex items-center gap-2">
                <Zap size={14} className="text-violet-500" />
                <div className="text-violet-500 font-black text-[10px] tracking-widest uppercase opacity-80">{data.topic} &bull; {stepIdx + 1} / {data.questions.length}</div>
            </div>
            {/* Hint trigger — popup won't shift layout */}
            <div className="relative">
                <button key="hint-btn" onClick={() => setIsHintVisible(!isHintVisible)} className={`p-2 rounded-xl transition-all ${isHintVisible ? 'bg-amber-500 text-white' : (isDark ? 'bg-slate-800' : 'bg-slate-100') + ' text-slate-400'}`}><Lightbulb size={18} /></button>

                {/* FLOATING HINT POPUP — zero DOM-flow impact */}
                <AnimatePresence>
                    {isHintVisible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -8 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            className={`absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl z-50 p-4 text-xs font-medium leading-relaxed ${ isDark ? 'bg-slate-800 border-amber-700/50 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}
                            style={{ boxShadow: isDark ? '0 20px 40px rgba(0,0,0,0.5)' : '0 20px 40px rgba(0,0,0,0.15)' }}
                        >
                            {/* Arrow pointer */}
                            <div className={`absolute -top-2 right-3 w-4 h-4 rotate-45 rounded-sm ${ isDark ? 'bg-slate-800 border-t border-l border-amber-700/50' : 'bg-amber-50 border-t border-l border-amber-200'}`} />
                            <span className="font-bold flex items-center gap-2 mb-2"><AlertCircle size={14} /> HINT</span>
                            {currentStep.hint || (data.universal_total ? `The sum of ALL zones (left, center, right, outside) must balance the Total: ${data.universal_total}.` : "Look closely at the overlap and counts!")}
                            <button onClick={() => setIsHintVisible(false)} className="mt-3 w-full text-center text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">Got it ✕</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        <h2 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} leading-snug`} style={{ fontSize: 'clamp(16px, 2.5vh, 22px)', marginBottom: 'clamp(6px, 1.5vh, 24px)' }} dangerouslySetInnerHTML={{ __html: currentStep.prompt }} />
        
        <div className={`relative w-full flex-1 min-h-0 rounded-3xl overflow-hidden ${isDark ? 'bg-slate-900 border-white/5' : 'bg-slate-50 border-slate-100'} border shadow-inner`} style={{ marginBottom: 'clamp(6px, 1.5vh, 24px)' }}>
            <AnimatePresence>
                {data.universal_total && !['DRAG_SETS','DRAG_SORT'].includes(currentStep.interaction) && (Object.values(userAnswers).some(v => v !== '')) && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-4 left-4 right-4 z-20 flex justify-center">
                        <div className={`${isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white/80 border-slate-200'} backdrop-blur-md px-4 py-2 rounded-full border shadow-lg flex items-center gap-3`}>
                            <Compass size={14} className="text-violet-500" />
                            <div className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} gap-1 flex items-center`}>
                                {data.zones && ['left','center','right','outside'].map(reg => {
                                    const val = data.zones[reg]?.[0]; if (!val) return null;
                                    const ev = evaluateExpr(val, currentStep.x_val !== undefined ? currentStep.x_val : (userAnswers[reg] || getFirstUserAnswer()));
                                    return isNaN(ev) ? null : ev;
                                }).filter(v => v !== null).join(' + ')}
                                <span className="text-violet-500 mx-2">=</span>
                                <span className={(data.zones && Math.abs((['left','center','right','outside'].reduce((acc, reg) => acc + (parseFloat(evaluateExpr(data.zones[reg]?.[0], currentStep.x_val !== undefined ? currentStep.x_val : (userAnswers[reg] || getFirstUserAnswer()))) || 0), 0)) - (data.universal_total || 0)) < 0.1) ? "text-emerald-500" : "text-slate-400"}>
                                    {data.zones ? ['left','center','right','outside'].reduce((acc, reg) => acc + (parseFloat(evaluateExpr(data.zones[reg]?.[0], currentStep.x_val !== undefined ? currentStep.x_val : (userAnswers[reg] || getFirstUserAnswer()))) || 0), 0) : '0'}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <canvas ref={canvasRef} className="w-full h-full block touch-none" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={() => draggingRef.current = null} onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={() => draggingRef.current = null} />
            
            {/* 🎯 GENTLE NEON HALO FOR TARGET (v7.1) */}
            {!isResolved && !isSingleInput && currentStep.type !== 'REVERSE_SUBSET' && interactiveZones.length > 0 && interactiveZones.map(zone => {
                const pos = getSlotPos(zone);
                return (
                    <motion.div key={`halo-${zone}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2, repeat: Infinity }} style={{ position: 'absolute', left: pos.x - (isMobile ? 32 : 45), top: pos.y - (isMobile ? 20 : 25) }} className={`${isMobile ? 'w-[64px] h-[40px]' : 'w-[90px] h-[50px]'} rounded-2xl border-2 border-violet-500/30 blur-sm pointer-events-none`} />
                );
            })}

            {/* 🎯 DISTRIBUTED INPUT SLOTS (OmniVenn v7.1 Revised) */}
            {!isResolved && !isSingleInput && currentStep.type !== 'REVERSE_SUBSET' && !['BINARY','DRAG_SETS','DRAG_SORT','SHADE_REGION', 'CLICK_SUM'].includes(currentStep.interaction) && (
                <div className="absolute inset-0 pointer-events-none">
                    {interactiveZones.map(zone => {
                        const pos = getSlotPos(zone); if (pos.x === 0) return null;
                        return (
                            <motion.div key={`slot-${zone}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ position: 'absolute', left: pos.x - (isMobile ? 28 : 40), top: pos.y - (isMobile ? 18 : 22) }} className="pointer-events-auto z-30">
                                <input type="text" autoFocus className={`${isMobile ? 'w-14 h-9 text-base' : 'w-20 h-11 text-lg'} rounded-xl text-center font-black outline-none ring-4 ring-violet-500/20 border-2 border-violet-500 shadow-2xl bg-slate-900/90 backdrop-blur-md text-white placeholder-violet-300/30 transition-all focus:scale-110 active:scale-95`} placeholder="?" value={userAnswers[zone] || ''} onChange={e => setUserAnswers(prev => ({ ...prev, [zone]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleInteraction()} />
                            </motion.div>
                        );
                    })}
                </div>
            )}

        </div>

        {/* 🛡️ FAIL-SAFE INPUT FIELD (v7.1) */}
        {!isResolved && (showFallback || (interactiveZones.length > 0 && isSingleInput)) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center">
                 {!['BINARY', 'CHOICE', 'DRAG_SETS','DRAG_SORT','SHADE_REGION', 'CLICK_SUM'].includes(currentStep.interaction) && (
                    <input type="text" className={`w-full h-16 rounded-2xl text-center font-black text-2xl outline-none focus:ring-4 ring-violet-500/20 border-2 transition-all ${isDark ? 'bg-slate-800 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-900'}`} placeholder="Type answer..." value={Object.values(userAnswers).join('')} onChange={e => setUserAnswers({ [interactiveZones[0] || 'center']: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleInteraction()} />
                 )}
            </motion.div>
        )}

        {!isResolved && (currentStep.interaction === 'BINARY' || currentStep.type === 'BINARY') && (<div className="grid grid-cols-2 gap-3" style={{ marginTop: 'clamp(4px, 1vh, 8px)' }}>{['Yes', 'No'].map(v => <button key={v} className={`h-14 rounded-2xl font-black text-xl border-2 transition-all ${getFirstUserAnswer()===v?'bg-violet-600 text-white border-violet-600' : (isDark ? 'bg-slate-800 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')}`} onClick={()=>setUserAnswers({ center: v })}>{v}</button>)}</div>)}
        {!isResolved && currentStep.interaction === 'CHOICE' && currentStep.options && (<div className="grid grid-cols-2 gap-3" style={{ marginTop: 'clamp(4px, 1vh, 8px)' }}>{currentStep.options.map(opt => <button key={opt} className={`h-14 rounded-2xl font-black text-xl border-2 transition-all ${getFirstUserAnswer()===opt?'border-violet-500 bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] scale-[1.02]' : (isDark ? 'bg-slate-800 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700') + ' active:scale-95'}`} onClick={()=>setUserAnswers({ center: opt })}>{opt}</button>)}</div>)}
        
        <button disabled={!isResolved && !Object.values(userAnswers).some(v => v !== '') && !['DRAG_SETS','DRAG_SORT','SHADE_REGION', 'CLICK_SUM'].includes(currentStep.interaction)} 
                className={`w-full rounded-[1.25rem] font-black text-xs tracking-widest uppercase transition-all shadow-xl flex items-center justify-center gap-2 flex-shrink-0 ${feedback.text && !isResolved ? (feedback.type==='success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20') : (isResolved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-violet-600 text-white shadow-violet-600/20 active:scale-95')}`}
                style={{ height: 'clamp(44px, 7vh, 56px)', marginTop: 'clamp(6px, 1.5vh, 24px)' }}
                onClick={handleInteraction}>
            {feedback.text && !isResolved ? feedback.text : (isResolved ? (stepIdx === data.questions.length - 1 ? 'CONTINUE' : 'NEXT STEP') : 'CHECK ANSWER')}
        </button>
      </motion.div>
    </div>
  );
};

export default SetTheoryEngine;
