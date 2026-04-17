/**
 * SET STUDY ENGINE LOGIC
 * Pure logic for particle systems and visual data derivations.
 */

export const initParticles = (width, height) => {
  return Array.from({ length: 15 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 8 + 2,
    opacity: Math.random() * 0.2 + 0.1
  }));
};

export const updateParticles = (particles, width, height, s) => {
  return particles.map(p => {
    let nx = p.x + p.vx * s;
    let ny = p.y + p.vy * s;
    if (nx < 0) nx = width; if (nx > width) nx = 0;
    if (ny < 0) ny = height; if (ny > height) ny = 0;
    return { ...p, x: nx, y: ny };
  });
};

/**
 * Visual Layout Constants
 */
export const THEMES = {
  dark: { bg: 'bg-[#0B101A]', stage: 'from-[#0F172A] to-[#0B101A]', card: 'bg-[#151921]', text: 'text-white', sub: 'text-slate-400', b: 'border-white/5', particle: (op) => `rgba(124, 58, 237, ${op})` },
  light: { bg: 'bg-[#F8FAFC]', stage: 'from-[#FFFBF5] to-[#F8F9FA]', card: 'bg-white', text: 'text-[#0f172a]', sub: 'text-[#475569]', b: 'border-slate-100', particle: (op) => `rgba(219, 39, 119, ${op * 0.4})` }
};
