/**
 * Visual Script for Topic 1: Types of Skeletons
 * This file is loaded by the variable-slider-engine.js
 */

const RenderLogic = {
    // Helper colors
    colors: {
        wormHead: '#f472b6',
        wormBody: '#db2777',
        grassPrimary: '#65a30d',
        bone: '#1f2937'
    },

    drawWorm(ctx, x, y, p, canvasSize) {
        const segments = 22;
        const baseSize = (canvasSize * 0.03) + (p * canvasSize * 0.04);
        const spacing = (canvasSize * 0.015) + (p * canvasSize * 0.02);
        const time = Date.now() / 400;
        
        ctx.save();
        ctx.translate(x, y);
        
        for (let i = 0; i < segments; i++) {
            const wave = Math.sin(time + i * 0.4);
            const r = baseSize + (wave * (canvasSize * 0.005));
            const cx = (i - segments/2) * spacing;
            
            const isHead = i === segments - 1;
            const segmentColor = isHead ? this.colors.wormHead : this.colors.wormBody;
            
            const grad = ctx.createRadialGradient(cx - r/3, -r/3, r/10, cx, 0, r);
            grad.addColorStop(0, '#fce7f3');
            grad.addColorStop(0.7, segmentColor);
            grad.addColorStop(1, '#831843');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, 0, r, 0, Math.PI * 2);
            ctx.fill();

            if (isHead) {
                ctx.fillStyle = 'white';
                ctx.beginPath(); ctx.arc(cx + r/2, -r/3, r/4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath(); ctx.arc(cx + r/1.5, -r/3, r/10, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();
    },

    drawGrasshopper(ctx, x, y, p, canvasSize) {
        // Molting logic: Opacity changes between 45% and 70%
        const progressPercent = p * 100;
        const size = (canvasSize * 0.15) + (p * canvasSize * 0.35);
        const isMolting = progressPercent > 45 && progressPercent < 70;
        
        ctx.save();
        ctx.translate(x, y);

        const primary = isMolting ? '#bef264' : '#65a30d';
        const dark = isMolting ? '#a3e635' : '#365314';

        if (isMolting) {
            // Draw the old shell behind
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#4b5563';
            ctx.beginPath();
            ctx.ellipse(-10, -20, size/2, size/4, 0.2, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Body Segments
        for (let i = 0; i < 6; i++) {
            const sx = (i - 3) * (size / 8);
            const sr = (size/6) * (1 - Math.abs(i-3)/6);
            ctx.fillStyle = (i % 2 === 0) ? primary : dark;
            ctx.beginPath();
            ctx.ellipse(sx, -size/10, size/10, sr, 0, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Head & Eye
        ctx.fillStyle = primary;
        ctx.beginPath(); ctx.ellipse(size/2, -size/2.5, size/5, size/4.5, -0.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath(); ctx.ellipse(size/1.8, -size/2.2, size/15, size/10, 0, 0, Math.PI*2); ctx.fill();

        // Legs
        ctx.strokeStyle = dark;
        ctx.lineWidth = size/15;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -size/8); ctx.lineTo(-size/2.5, -size/2); ctx.stroke();
        ctx.lineWidth = size/30; ctx.lineTo(-size/4, 0); ctx.stroke();

        ctx.restore();
    },

    drawSkeleton(ctx, x, y, p, canvasSize) {
        const h = (canvasSize * 0.2) + (p * canvasSize * 0.65); 
        const w = h * 0.32;
        
        ctx.save();
        ctx.translate(x, y);

        // Aura
        const auraWidth = w * 1.5;
        const auraHeight = h * 1.05;
        const grad = ctx.createRadialGradient(0, -h * 0.5, 0, 0, -h * 0.5, h * 0.7);
        grad.addColorStop(0, 'rgba(147, 51, 234, 0.15)');
        grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(0, -h * 0.5, auraWidth, auraHeight * 0.5, 0, 0, Math.PI * 2); ctx.fill();

        // Stickman Logic
        ctx.strokeStyle = this.colors.bone;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1, (canvasSize * 0.005) + (p * canvasSize * 0.01));

        const skY = -h * 0.85;
        const skR = w * 0.3;

        // Head & Spine
        ctx.beginPath(); ctx.arc(0, skY, skR, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, skY + skR); ctx.lineTo(0, -h * 0.25); ctx.stroke();

        // Limbs & Joints
        const shY = skY + skR + h * 0.1;
        const hipY = -h * 0.25;
        
        // Arms
        ctx.beginPath(); ctx.moveTo(-w*0.5, shY); ctx.lineTo(-w*0.65, shY + h*0.2); ctx.lineTo(-w*0.75, shY + h*0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w*0.5, shY); ctx.lineTo(w*0.65, shY + h*0.2); ctx.lineTo(w*0.75, shY + h*0.4); ctx.stroke();
        
        // Legs
        ctx.beginPath(); ctx.moveTo(-w*0.3, hipY); ctx.lineTo(-w*0.4, hipY + h*0.15); ctx.lineTo(-w*0.45, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w*0.3, hipY); ctx.lineTo(w*0.4, hipY + h*0.15); ctx.lineTo(w*0.45, 0); ctx.stroke();

        ctx.restore();
    },

    // MAIN RENDER FUNCTION called by Engine
    render(ctx, width, height, state) {
        const p = state.sliderValue / 100;
        const centerX = width / 2;
        const centerY = height / 2;
        const canvasSize = Math.min(width, height);

        // State.tabIndex maps to 0, 1, 2 from the JSON config tabs
        if (state.tabIndex === 0) {
            this.drawWorm(ctx, centerX, centerY, p, canvasSize);
        } else if (state.tabIndex === 1) {
            // Adjust Center Y slightly for grasshopper
            const size = (canvasSize * 0.15) + (p * canvasSize * 0.35);
            this.drawGrasshopper(ctx, centerX, centerY + size/4, p, canvasSize);
        } else if (state.tabIndex === 2) {
            const currentH = (canvasSize * 0.2) + (p * canvasSize * 0.65);
            this.drawSkeleton(ctx, centerX, centerY + (currentH * 0.45), p, canvasSize);
        }
    }
};

// Make it globally available for the engine to find
window.CurrentVisualScript = RenderLogic;