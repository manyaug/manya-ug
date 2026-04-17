/**
 * SET CLASSIFIER LOGIC
 * Pure logic for scene deduction and particle physics.
 */

export const getDeductedScene = (q) => {
    if (!q) return 'default';
    if (q.scene && q.scene !== 'default') return q.scene;
    
    const text = (q.prompt || "").toLowerCase();
    if (text.includes("uganda") && !text.includes("school")) return 'map';
    if (text.includes("school") && !text.includes("pupil")) return 'schools';
    if (text.includes("district") || text.includes("geography")) return 'map';
    if (text.includes("integer") || text.includes("whole number") || text.includes("negative") || text.includes("count")) return 'integers';
    if (text.includes("multiples") || text.includes("set of numbers") || text.includes("numeric")) return 'rain';
    if (text.includes("stars") || text.includes("points") || text.includes("infinite") || text.includes("universe")) return 'stars';
    if (text.includes("pupils") || text.includes("children") || text.includes("people") || text.includes("teacher")) return 'class';
    if (text.includes("cow") || text.includes("kraal") || text.includes("animals")) return 'cows';
    if (text.includes("fish") || text.includes("ocean") || text.includes("lake")) return 'fish';
    if (text.includes("vowels")) return 'vowels';
    if (text.includes("letters") || text.includes("mathematics") || text.includes("'")) return 'letters';
    if (text.includes("leaves") || text.includes("tree") || text.includes("forest")) return 'leaves';
    if (text.includes("sand") || text.includes("beach") || text.includes("grains")) return 'sand';
    
    return q.scene || 'default';
};

export const initBrandedParticles = (scene, w, h, currentQ) => {
    const p = [];
    const spawn = (count, logic) => { 
        for (let i = 0; i < count; i++) {
            const base = logic();
            p.push({ 
                ...base, 
                vx: base.vx ?? (Math.random()-0.5)*0.3, 
                vy: base.vy ?? (Math.random()-0.5)*0.3, 
                id: i 
            }); 
        }
    };

    if (scene === 'map') spawn(25, () => ({ x: w/2 + (Math.random()-0.5)*w*0.5, y: h/2 + (Math.random()-0.5)*h*0.5, type: 'pin' }));
    else if (scene === 'stars') spawn(120, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'star', z: Math.random()*3+0.5 }));
    else if (scene === 'rain' || scene === 'integers') {
        const isInt = scene === 'integers';
        spawn(30, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'rain', vy: -0.2 - Math.random()*0.3, label: isInt ? Math.floor(Math.random()*200 - 100) : Math.floor(Math.random()*10)*5 }));
    } else if (scene === 'class') spawn(15, () => ({ x: w/2 + (Math.random()-0.5)*w*0.6, y: h/2 + (Math.random()-0.5)*h*0.6, type: 'student', char: Math.random()>0.5?'🧒':'👧', size: 40 }));
    else if (scene === 'vowels' || scene === 'letters' || scene === 'default') {
        const labels = scene === 'vowels' ? "AEIOU".split('') : (currentQ?.prompt?.toUpperCase().includes("MATHEMATICS") ? "MATHS".split('') : "ABC".split(''));
        labels.forEach((l, i) => p.push({ x: w/2 + (Math.random()-0.5)*w*0.6, y: h/2 + (Math.random()-0.5)*h*0.5, type: 'label', label: l, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, size: 30, id: i }));
    } else if (scene === 'schools') spawn(20, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'emoji', char: '🏫', size: 40 }));
    else if (scene === 'sand') spawn(300, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'grain', size: Math.random()*2+1 }));
    else if (scene === 'leaves') spawn(20, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'emoji', char: '🍃', size: 30, vy: 0.15 + Math.random()*0.2 }));
    else {
        const char = scene === 'cows' ? '🐄' : (scene === 'fish' ? '🐟' : '✨');
        spawn(12, () => ({ x: Math.random()*w, y: Math.random()*h, type: 'emoji', char, size: 50 }));
    }
    return p;
};

export const THEMES = {
    dark: { bg: 'bg-[#0B101A]', stage: 'from-[#0F172A] to-[#0B101A]', card: 'bg-[#151921]', text: 'text-white', sub: 'text-slate-400', b: 'border-white/5' },
    light: { bg: 'bg-[#F8FAFC]', stage: 'from-[#FFFFFF] to-[#F9FBFD]', card: 'bg-white', text: 'text-[#0f172a]', sub: 'text-[#475569]', b: 'border-slate-100' }
};
