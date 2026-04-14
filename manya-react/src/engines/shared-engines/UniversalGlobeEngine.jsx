import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { assetUrl } from '../../config/assetUrls';
import { 
  Map as MapIcon, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Puzzle,
  Navigation,
  Trophy,
  X
} from 'lucide-react';

/**
 * UNIVERSAL GLOBE ENGINE (React v1.0)
 * Optimized for Ultra-High Density Mobile Viewports
 */

const CONTINENT_MAP = {
  "africa": ["012","024","204","072","854","108","120","132","140","148","174","178","180","262","818","226","232","748","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","768","788","800","834","894","716","732"],
  "north_africa": ["012","818","434","504","729","788","732"],
  "west_africa": ["204","854","132","384","270","288","324","624","430","466","478","562","566","686","694","768"],
  "east_africa": ["108","174","262","232","231","404","450","454","480","508","646","690","706","728","800","834","894","716"],
  "central_africa": ["024","120","140","148","178","180","226","266","678"],
  "southern_africa": ["072","748","426","516","710"],
  "horn_africa": ["262","232","231","706"],
  "namerica": ["124","840","484","304","084","188","222","320","340","558","591","028","044","052","192","212","214","308","332","388","630","780"],
  "samerica": ["032","068","076","152","170","218","238","328","600","604","740","858","862","254"],
  "europe": ["008","020","040","112","056","070","100","191","203","208","233","246","250","276","300","348","352","372","380","428","438","440","442","470","498","499","528","807","578","616","620","642","643","674","688","703","705","724","752","756","804","826","336"],
  "asia": ["004","051","031","048","050","064","096","116","156","196","268","356","360","364","368","376","392","400","398","414","417","418","422","458","462","496","104","524","408","512","586","608","634","682","702","410","144","760","158","762","764","626","792","795","784","860","704","887"],
  "australia": ["036","242","554","598","090","548","882","296","583","584","585"],
  "antarctica": ["010","260"]
};

const UniversalGlobeEngine = ({ data, onComplete, onResult, onAttempt }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [worldData, setWorldData] = useState(null);
  const [placedPieces, setPlacedPieces] = useState([]);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [selectedQuizOpt, setSelectedQuizOpt] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const [isD3Ready, setIsD3Ready] = useState(false);
  
  const startTimeRef = useRef(Date.now());
  const globalStartTimeRef = useRef(Date.now());
  const mistakesRef = useRef(0);

  const canvasRef = useRef(null);
  const projectionRef = useRef(null);
  const pathRef = useRef(null);
  const rotationRef = useRef(data?.initialRotation || [0, -10]);
  const scaleRef = useRef(1);
  const isDraggingRef = useRef(false);

  // Robust Theme Detection
  useEffect(() => {
    const check = () => {
      const dark = document.documentElement.classList.contains('dark') || 
                   document.body.classList.contains('dark') ||
                   document.documentElement.getAttribute('data-theme') === 'dark';
      setIsDark(dark);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Load Map Data
  useEffect(() => {
    fetch(assetUrl('data/world-atlas.json'))
      .then(res => res.json())
      .then(json => {
        setWorldData(json);
        setIsD3Ready(true);
      })
      .catch(err => {
        console.error("Failed to load map data", err);
        // Fallback or retry logic can go here
      });
  }, []);

  // Sync Globe Perspective
  useEffect(() => {
    if (!isD3Ready) return;
    if (data.mode === 'study' && data.cases[activeTab]) {
      const cur = data.cases[activeTab];
      focusOn(cur.initialRotation || [0, 0], cur.zoomFactor || 1);
    } else if (data.mode === 'quiz' && data.questions[activeTab]) {
      const q = data.questions[activeTab];
      if (q.initialRotation) focusOn(q.initialRotation, q.zoomFactor || 1);
    }
  }, [activeTab, data, isD3Ready]);

  const focusOn = (rot, zoom = 1) => {
    if (!projectionRef.current) return;
    const startRotate = projectionRef.current.rotate();
    const startScale = projectionRef.current.scale();

    d3.transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .tween("move", () => {
        const r = d3.interpolate(startRotate, rot);
        const s = d3.interpolate(startScale, scaleRef.current * zoom * (data.zoomFactor || 1));
        return (t) => {
          projectionRef.current.rotate(r(t));
          projectionRef.current.scale(s(t));
          rotationRef.current = r(t);
          draw();
        };
      });
  };

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !worldData || !projectionRef.current || !pathRef.current) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 2;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const projection = projectionRef.current;
    const path = pathRef.current;
    
    ctx.clearRect(0, 0, width, height);

    // 1. Ocean Sphere (Vibrant Playful Blue)
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

    // 2. Graticule (Always show, very subtle)
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(30, 58, 138, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    path(d3.geoGraticule()());
    ctx.stroke();

    // 3. Countries (Solid Kiddish Look)
    const countries = topojson.feature(worldData, worldData.objects.countries);
    ctx.beginPath();
    path(countries);
    ctx.fillStyle = isDark ? "#1e293b" : "#f8fafc";
    ctx.fill();
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // 4. Overlays & Highlights (Includes Drag & Drop Puzzle support)
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
          itemsToHighlight.push({ id: id, color: "rgba(34, 197, 94, 0.8)" }); // SHARP GREEN FOR PUZZLE
      });
    }

    // Draw all highlights
    itemsToHighlight.forEach(h => {
        const ids = CONTINENT_MAP[h.id] || [h.id];
        const feat = { 
            type: "FeatureCollection", 
            features: countries.features.filter(f => f.id && (ids.includes(String(f.id).padStart(3, '0')) || ids.includes(String(f.id)))) 
        };
        ctx.beginPath(); 
        path(feat);
        ctx.fillStyle = h.color; 
        ctx.fill();
        ctx.strokeStyle = h.color.replace('0.4', '1').replace('0.8', '1'); 
        ctx.lineWidth = 1.5; 
        ctx.stroke();
    });

    // 4.0. Overlays (Gulfs, Straits, etc.)
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

    // 4.1. Climate Zones
    if (curCase?.zones && Array.isArray(curCase.zones)) {
      curCase.zones.forEach(zone => {
          const coords = [];
          for(let i=180; i>=-180; i-=5) coords.push([i, zone.toLat]);
          for(let i=-180; i<=180; i+=5) coords.push([i, zone.fromLat]);
          coords.push(coords[0]);
          ctx.beginPath(); path({type: "Polygon", coordinates: [coords]});
          ctx.fillStyle = zone.color || "rgba(251, 191, 36, 0.18)"; 
          ctx.fill();
          ctx.strokeStyle = (zone.color || "rgba(251, 191, 36, 0.18)").replace('0.18', '0.4');
          ctx.lineWidth = 1;
          ctx.stroke();
      });
    }

    // 4.2. Specialized Lines (Equator, Tropics, etc.)
    if (curCase?.lines && Array.isArray(curCase.lines)) {
      curCase.lines.forEach(l => {
          let coords = [];
          if (l.type === 'lat') for(let i=-180; i<=180; i+=5) coords.push([i, l.value]);
          else for(let i=90; i>=-90; i-=5) coords.push([l.value, i]);
          
          ctx.beginPath(); 
          path({type: "LineString", coordinates: coords});
          ctx.strokeStyle = l.color || (isDark ? "#fbbf24" : "#f59e0b"); 
          ctx.lineWidth = l.width || 3.5;
          ctx.lineCap = "round";
          
          if(l.dashed) ctx.setLineDash([10, 8]); 
          
          ctx.shadowBlur = 4;
          ctx.shadowColor = l.color || (isDark ? "#fbbf24" : "#f59e0b");
          ctx.stroke(); 
          ctx.shadowBlur = 0;
          ctx.setLineDash([]);
          
          if (l.label && !isDraggingRef.current) {
              const center = projection.invert([width/2, height/2]);
              const labelPoint = l.type === 'lat' ? [center[0], l.value] : [l.value, center[1]];
              if (d3.geoDistance(center, labelPoint) < 1.4) {
                  const pos = projection(labelPoint);
                  if(pos) {
                      ctx.beginPath();
                      ctx.fillStyle = l.color || (isDark ? "#fbbf24" : "#f59e0b"); 
                      ctx.font = "900 11px 'Plus Jakarta Sans'";
                      ctx.textAlign = "center"; 
                      ctx.shadowBlur = 8;
                      ctx.shadowColor = isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)";
                      ctx.fillText(l.label.toUpperCase(), pos[0], pos[1] - 8);
                      ctx.shadowBlur = 0;
                  }
              }
          }
      });
    }

    // 4.3. Connections (Great Circles)
    const conns = curCase?.connections || (curCase?.connection ? [curCase.connection] : []);
    conns.forEach(c => {
      if (!c.from || !c.to) return;
      ctx.beginPath();
      path({ type: "LineString", coordinates: [c.from, c.to] });
      ctx.strokeStyle = c.color || "#6366f1";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.setLineDash(c.dashed ? [8, 6] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // 5. Markers & Labels
    const pts = curCase?.markers || curCase?.points || [];
    pts.forEach(p => {
      const coords = [p.lon ?? p.lng ?? 0, p.lat ?? 0];
      const gDistance = d3.geoDistance(coords, projection.invert([width/2, height/2]));
      if (gDistance > 1.57) return; 

      const [x, y] = projection(coords);
      
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = (p.color || "#0ea5e9") + "33";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = p.color || "#0ea5e9";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      if (p.label) {
        ctx.fillStyle = isDark ? "#fff" : "#0f172a";
        ctx.font = "black 12px 'Plus Jakarta Sans'";
        ctx.textAlign = "center";
        ctx.shadowBlur = 6;
        ctx.shadowColor = isDark ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.8)";
        ctx.fillText(p.label, x, y - 14);
        ctx.shadowBlur = 0;
      }
    });

    // 6. Atmospheric Shine
    ctx.beginPath();
    path({type: "Sphere"});
    const shine = ctx.createRadialGradient(width/2 - 40, height/2 - 40, 0, width/2, height/2, scaleRef.current);
    shine.addColorStop(0, "rgba(255,255,255,0.05)");
    shine.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = shine;
    ctx.fill();

    // 7. Outer Border Glow (Subject Themed)
    ctx.beginPath();
    path({type: "Sphere"});
    ctx.strokeStyle = "#f59e0b"; /* SST AMBER */
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Add a soft glow behind the globe
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(245, 158, 11, 0.3)";
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [worldData, activeTab, placedPieces, isDark, data]);

  useEffect(() => {
    if (!isD3Ready || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    
    const init = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      const baseScale = Math.min(rect.width, rect.height) / 1.6;
      scaleRef.current = baseScale;

      const projection = d3.geoOrthographic()
        .scale(baseScale * (data.zoomFactor || 1))
        .translate([rect.width / 2, rect.height / 2])
        .rotate(rotationRef.current);

      projectionRef.current = projection;
      pathRef.current = d3.geoPath(projection, ctx);
      
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
    ro.observe(parent);
    init();
    return () => ro.disconnect();
  }, [isD3Ready, worldData]); 

  // Secondary effect to re-draw when state changes
  useEffect(() => {
    if (isD3Ready && worldData) draw();
  }, [draw]);

  const handleQuizAnswer = (opt) => {
    if (quizFeedback?.type === 'success') return;
    setSelectedQuizOpt(opt);
    setQuizFeedback(null);
  };

  const submitQuizAnswer = () => {
    if (!selectedQuizOpt || quizFeedback?.type === 'success') return;
    const q = data.questions[activeTab];
    const isCorrect = selectedQuizOpt === q.correctAnswer;
    const duration = Date.now() - startTimeRef.current;

    // ── RECORD GRANULAR ATTEMPT ──
    if (onAttempt) {
        onAttempt({
            isCorrect,
            label: `Globe Quiz: ${activeTab + 1}`,
            duration,
            mistakes: isCorrect ? 0 : 1
        });
    }

    if (isCorrect) {
      if (onResult) {
        onResult({
          isCorrect: true,
          score: 1,
          total: 1,
          type: 'quiz',
          selectedAnswer: selectedQuizOpt,
          correctAnswer: q.correctAnswer
        });
      }
      setQuizFeedback({ type: 'success', text: "Correct!" });
      setTimeout(() => {
        if (activeTab < data.questions.length - 1) {
          setActiveTab(prev => prev + 1);
          setQuizFeedback(null);
          setSelectedQuizOpt(null);
          startTimeRef.current = Date.now();
        } else {
          if (onComplete) onComplete({
            isCorrect: mistakesRef.current === 0,
            accuracy: Math.max(0, (data.questions.length - mistakesRef.current) / data.questions.length),
            score: data.questions.length - mistakesRef.current,
            total: data.questions.length,
            mistakes: mistakesRef.current,
            duration: Date.now() - globalStartTimeRef.current,
            type: 'simulation',
            engineType: 'GLOBE_QUIZ'
          });
        }
      }, 1500);
    } else {
      if (onResult) {
        onResult({
          isCorrect: false,
          score: 0,
          total: 1,
          type: 'quiz',
          selectedAnswer: selectedQuizOpt,
          correctAnswer: q.correctAnswer,
          duration: Date.now() - startTimeRef.current,
          mistakes: 1
        });
      }
      mistakesRef.current += 1;
      setQuizFeedback({ type: 'error', text: q.explanation || "Try again!", selectedOpt: selectedQuizOpt });
    }
  };

  const handleDragStart = (e, piece) => {
    const uv = e.touches ? e.touches[0] : e;
    const ghost = document.createElement('div');
    ghost.className = 'fixed pointer-events-none z-[9999] px-4 py-2 bg-amber-500 text-white rounded-xl font-bold shadow-lg';
    ghost.style.left = `${uv.clientX}px`;
    ghost.style.top = `${uv.clientY}px`;
    ghost.innerText = piece.label;
    document.body.appendChild(ghost);

    const move = (m) => {
      const mv = m.touches ? m.touches[0] : m;
      ghost.style.left = `${mv.clientX}px`;
      ghost.style.top = `${mv.clientY}px`;
    };

    const up = (u) => {
      const uv_up = u.changedTouches ? u.changedTouches[0] : u;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
      ghost.remove();
      const rect = canvasRef.current.getBoundingClientRect();
      if (uv_up.clientX >= rect.left && uv_up.clientX <= rect.right && uv_up.clientY >= rect.top && uv_up.clientY <= rect.bottom) {
        const coords = projectionRef.current.invert([uv_up.clientX - rect.left, uv_up.clientY - rect.top]);
        const isCorrect = d3.geoDistance(coords, piece.target) < 0.45;
        const duration = Date.now() - startTimeRef.current;

        if (isCorrect) {
          // ── RECORD GRANULAR ATTEMPT ──
          if (onAttempt) {
            onAttempt({
                isCorrect: true,
                label: `Globe Puzzle Piece: ${piece.label}`,
                duration,
                mistakes: 0
            });
          }

          setPlacedPieces(p => {
             const n = [...p, piece.id];
             if (n.length === data.pieces.length) {
                if (onResult) onResult({ isCorrect: true, score: n.length, total: data.pieces.length, type: 'puzzle' });
                if (onComplete) setTimeout(() => onComplete({
                    isCorrect: true,
                    score: data.pieces.length,
                    total: data.pieces.length,
                    type: 'puzzle'
                }), 1500);
             }
             return n;
          });
          startTimeRef.current = Date.now();
        } else {
          // Record mistake
          mistakesRef.current += 1;
          if (onAttempt) {
            onAttempt({
                isCorrect: false,
                label: `Globe Puzzle Piece: ${piece.label}`,
                duration,
                mistakes: 1
            });
          }
        }
      }
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  };

  return (
      <div className="globe-engine-root flex flex-col h-full bg-[#fffbeb] dark:bg-[#0f172a] overflow-hidden">
        <style>{`
          .globe-engine-root { font-family: 'Plus Jakarta Sans', sans-serif; }
          .sheet-toy { 
            background: #fff;
            border-top: 5px solid #f59e0b;
            box-shadow: 0 -15px 50px rgba(0,0,0,0.1);
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
  
        <div className="relative w-full h-[45vh] flex-shrink-0 flex items-center justify-center overflow-hidden">
          {/* Subtle atmospheric gradient behind globe */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-400/20 to-transparent dark:from-sky-900/20 dark:to-transparent pointer-events-none" />
          <canvas ref={canvasRef} className="w-full h-full drop-shadow-2xl" />
          <div className="absolute top-4 right-4">
             <button onClick={() => focusOn([0, 0], 1.2)} className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-black/20 backdrop-blur-md shadow-lg border border-white/20 dark:border-white/10 flex items-center justify-center text-sky-500 active:scale-90 transition-transform">
               <Navigation className="w-5 h-5 drop-shadow-md" />
             </button>
          </div>
        </div>

      <div className="sheet-toy flex-1 rounded-t-[3rem] relative z-30 flex flex-col overflow-hidden">
        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mt-5 mb-2" />

        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-12 space-y-5 no-scrollbar">
          {data.mode === 'study' && (
            <div className="flex overflow-x-auto gap-2 px-1 py-1 no-scrollbar sticky top-0 z-10 bg-white shadow-sm mb-4">
              {data.cases.map((c, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveTab(i)} 
                  className={`uppercase text-[10px] whitespace-nowrap px-5 py-2.5 font-black rounded-xl transition-all active:scale-95 border-b-[4px] ${
                    activeTab === i 
                      ? 'bg-amber-500 border-amber-700 text-white shadow-md shadow-amber-500/30' 
                      : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                >
                  {c.tabTitle}
                </button>
              ))}
            </div>
          )}

          {data.mode === 'study' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mcq-q-card border-[4.5px] border-amber-500 bg-white">
                <div className="toy-card-gloss" />
                <h1 className="text-[17px] uppercase font-black tracking-wide leading-tight text-center text-amber-600 relative z-10">
                  {data.cases[activeTab].title}
                </h1>
              </div>
              
              <div className="space-y-3 mt-4">
                {data.cases[activeTab].steps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start p-4 rounded-2xl bg-white border-[3.5px] border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="toy-card-gloss opacity-30" />
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-[12px] shadow-lg shadow-amber-500/20 relative z-10">
                      {i + 1}
                    </div>
                    <p className="text-[13px] font-bold leading-relaxed text-slate-700 pt-0.5 relative z-10" dangerouslySetInnerHTML={{ __html: step }} />
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => {
                  if (onComplete) onComplete({
                    isCorrect: true,
                    score: data.cases.length,
                    total: data.cases.length,
                    type: 'study'
                  });
                }}
                className="mcq-btn-solid w-full py-4 bg-amber-500 border-b-[6px] border-amber-700 text-white rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-xl shadow-amber-500/30 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
              >
                <div className="toy-card-gloss" />
                FINISH ACTIVITY
              </button>
            </div>
          )}

          {data.mode === 'quiz' && (
            <div className="space-y-5 animate-in slide-in-from-right-4 duration-400">
              <div className="flex flex-col items-center">
                 <div className="mcq-hint-badge px-4 py-1.5 bg-amber-500 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-2">
                    <Trophy size={14} className="animate-bounce" />
                    <span className="font-black text-[10px] tracking-widest uppercase">STAGE {activeTab + 1}</span>
                 </div>
              </div>
              
              <div className="mcq-q-card border-[4.5px] border-amber-500 shadow-xl relative overflow-hidden bg-white">
                <div className="toy-card-gloss" />
                <p className="text-[15px] font-black leading-relaxed text-center relative z-10 text-slate-800">
                  {data.questions[activeTab].question}
                </p>
              </div>

              <div className="grid gap-3">
                {data.questions[activeTab].options.map((opt, i) => {
                  const isSelected = selectedQuizOpt === opt;
                  const isCorrect = quizFeedback?.type === 'success' && opt === data.questions[activeTab].correctAnswer;
                  const isWrong = quizFeedback?.type === 'error' && opt === quizFeedback.selectedOpt;

                  let cardClass = "mcq-option bg-white py-4 px-5 rounded-2xl border-[3.5px] transition-all relative overflow-hidden";
                  let borderStyle = isSelected ? { borderColor: '#f59e0b' } : { borderColor: '#f1f5f9' };

                  if (isCorrect) borderStyle = { borderColor: '#22c55e', backgroundColor: '#f0fdf4' };
                  if (isSelected && !isCorrect && !isWrong) borderStyle = { borderColor: '#f59e0b', backgroundColor: '#fffbeb', transform: 'translateY(-2px)' };
                  if (isWrong) borderStyle = { borderColor: '#f43f5e', backgroundColor: '#fff1f2' };

                  return (
                    <button
                      key={i}
                      disabled={quizFeedback?.type === 'success'}
                      onClick={() => handleQuizAnswer(opt)}
                      className={cardClass}
                      style={borderStyle}
                    >
                      <div className="toy-card-gloss opacity-40" />
                      <div className="flex items-center justify-between relative z-10">
                        <span className={`font-black text-[13px] ${isCorrect ? 'text-green-700' : isWrong ? 'text-rose-700' : isSelected ? 'text-amber-700' : 'text-slate-600'}`}>
                           {opt}
                        </span>
                        {isCorrect && <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg"><CheckCircle2 size={14} /></div>}
                        {isWrong && <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg"><X size={14} /></div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedQuizOpt && !quizFeedback && (
                <button
                  onClick={submitQuizAnswer}
                  className="mcq-btn-solid bg-amber-500 border-b-[6px] border-amber-700 text-white rounded-2xl py-4 font-black text-[14px] uppercase tracking-widest shadow-xl shadow-amber-500/30 mt-4 active:scale-95 active:border-b-0 transition-all relative overflow-hidden"
                >
                   <div className="toy-card-gloss" />
                   SUBMIT ANSWER
                </button>
              )}
            </div>
          )}

          {data.mode === 'puzzle' && (
             <div className="grid grid-cols-2 gap-4 pt-4">
                {data.pieces?.map((p, i) => (
                  <div key={i} onMouseDown={e => handleDragStart(e, p)} onTouchStart={e => handleDragStart(e, p)}
                       className={`p-4 rounded-2xl text-center font-black text-[12px] border-[3.5px] uppercase transition-all shadow-md active:scale-90 select-none cursor-grab active:cursor-grabbing relative overflow-hidden ${
                         placedPieces.includes(p.id) 
                           ? 'bg-green-500/10 border-green-500/30 text-green-600 opacity-50 scale-95' 
                           : 'bg-white border-slate-100 text-slate-700 active:border-amber-500'
                       }`}>
                    <div className="toy-card-gloss opacity-40" />
                    <span className="relative z-10">{p.label}</span>
                  </div>
                ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default UniversalGlobeEngine;
