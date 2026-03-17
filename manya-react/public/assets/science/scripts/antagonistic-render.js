export const AntagonisticRender = {
     draw: (ctx, w, h, state, hitRegions) => {
        const p = state.flexion;
        const cx = w * 0.22, cy = h * 0.55, uLen = 150, fLen = 130, angle = p * -2.2;

        // 1. Draw Shoulder & Stationary Bone
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath(); ctx.roundRect(cx - 30, cy - 35, 45, 70, 15); ctx.fill();
        hitRegions.push({id: 'ORIGIN', x: cx, y: cy, r: 35});

        // Humerus
        const g = ctx.createLinearGradient(cx, cy, cx + uLen, cy);
        g.addColorStop(0, "#f8fafc"); g.addColorStop(1, "#cbd5e1");
        ctx.strokeStyle = g; ctx.lineWidth = 24; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + uLen, cy); ctx.stroke();
        hitRegions.push({id: 'HUMERUS', x: cx + uLen/2, y: cy, r: 30});

        // 2. Draw Moving Forearm & Hand
        ctx.save();
        ctx.translate(cx + uLen, cy); ctx.rotate(angle);
        ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(fLen, -5); ctx.stroke(); // Radius
        ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(fLen, 5); ctx.stroke();   // Ulna

        // Medical Hand
        ctx.fillStyle = "#fcd34d"; ctx.beginPath();
        ctx.moveTo(fLen, -10); ctx.lineTo(fLen + 15, -20); ctx.quadraticCurveTo(fLen + 35, -30, fLen + 35, -15);
        ctx.quadraticCurveTo(fLen + 25, -5, fLen + 20, -5); ctx.lineTo(fLen + 50, -5); ctx.quadraticCurveTo(fLen + 60, 5, fLen + 50, 15);
        ctx.lineTo(fLen, 10); ctx.fill();
        ctx.restore();

        // 3. Antagonistic Muscles (Calculated Hitboxes)
        const biInsX = (cx + uLen) + Math.cos(angle) * 45;
        const biInsY = cy + Math.sin(angle) * 45;
        const biBulge = 18 + (p * 28);
        drawMuscle(ctx, cx + 25, cy - 12, biInsX, biInsY, biBulge, true);
        hitRegions.push({ id: 'BICEPS', x: (cx + 25 + biInsX)/2, y: (cy - 12 + biInsY)/2, r: biBulge + 15 });

        const triBulge = 18 + ((1 - p) * 20);
        drawMuscle(ctx, cx + 35, cy + 12, (cx + uLen) - 10, cy + 12, triBulge, false);
        hitRegions.push({ id: 'TRICEPS', x: (cx + 35 + cx + uLen)/2, y: cy + 12, r: triBulge + 15 });
    }
};

function drawMuscle(ctx, x1, y1, x2, y2, bulge, isUpper) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx + dy*dy);
    const nx = -dy / len, ny = dx / len, dir = isUpper ? 1 : -1, cx = mx + nx * bulge * dir, cy = my + ny * bulge * dir;
    const p = new Path2D(); p.moveTo(x1, y1); p.quadraticCurveTo(cx, cy, x2, y2); p.quadraticCurveTo(mx + nx * 5 * dir, my + ny * 5 * dir, x1, y1);
    const grad = ctx.createRadialGradient(cx, cy, 2, mx, my, bulge); grad.addColorStop(0, "#fca5a5"); grad.addColorStop(0.6, "#e11d48"); grad.addColorStop(1, "#9f1239");
    ctx.fillStyle = grad; ctx.fill(p); ctx.strokeStyle = "#9f1239"; ctx.lineWidth = 1; ctx.stroke(p);
}