import React, { useRef, useEffect } from 'react';

export const Ribbon = ({ text, variant = 'success' }) => (
    <div className={`ribbon-3d-wrapper variant-${variant}`}>
        <div className="ribbon-3d-fold-left" />
        <div className="ribbon-3d-main">{text}</div>
        <div className="ribbon-3d-fold-right" />
    </div>
);

export const WorldClassConfetti = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let isActive = true;

        const colors = ['#fde047', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#ffffff'];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor(x, y, angle, type = 'square', explosiveMultiplier = 1) {
                this.x = x;
                this.y = y;
                // Faster initial burst
                const speed = (Math.random() * 25 + 15) * explosiveMultiplier;
                this.vx = Math.cos(angle * Math.PI / 180) * speed;
                this.vy = Math.sin(angle * Math.PI / 180) * speed;

                this.gravity = 0.35; // Better gravity feel
                this.friction = 0.95; // More realistic air drag
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.size = Math.random() * 14 + 8;
                this.rotation = Math.random() * 360;
                this.rSpeed = (Math.random() - 0.5) * 20;
                this.opacity = 1;
                this.type = type;
                
                // For stars
                this.spikes = 4 + Math.floor(Math.random() * 3);
                this.innerRadius = this.size / 2.5;
            }

            update() {
                this.vx *= this.friction;
                this.vy *= this.friction;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rSpeed;

                if (this.y > canvas.height * 0.7) {
                    this.opacity -= 0.015;
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI / 180);
                ctx.globalAlpha = Math.max(0, this.opacity);
                ctx.fillStyle = this.color;

                if (this.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                } else if (this.type === 'star') {
                    ctx.beginPath();
                    let rot = Math.PI / 2 * 3;
                    let x = 0, y = 0;
                    let step = Math.PI / this.spikes;
                    ctx.moveTo(0, -this.size);
                    for (let i = 0; i < this.spikes; i++) {
                        x = Math.cos(rot) * this.size;
                        y = Math.sin(rot) * this.size;
                        ctx.lineTo(x, y);
                        rot += step;
                        x = Math.cos(rot) * this.innerRadius;
                        y = Math.sin(rot) * this.innerRadius;
                        ctx.lineTo(x, y);
                        rot += step;
                    }
                    ctx.lineTo(0, -this.size);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    const shimmer = Math.cos(this.rotation * 0.1) * this.size;
                    ctx.fillRect(-this.size / 2, -shimmer / 2, this.size, Math.abs(shimmer) || 1);
                }
                ctx.restore();
            }
        }

        let particles = [];

        const fire = (count = 50, isExplosive = false) => {
            if (!isActive) return;
            // Center explosion + Corners
            const origins = [
                { x: canvas.width / 2, y: canvas.height * 0.6, aRange: [-180, 0], multiplier: 1.5 }, // Center blast
                { x: 0, y: canvas.height, aRange: [-80, -20], multiplier: 1 },
                { x: canvas.width, y: canvas.height, aRange: [-160, -100], multiplier: 1 }
            ];

            origins.forEach(c => {
                const burstCount = c.multiplier > 1 ? count * 2 : count;
                for (let i = 0; i < burstCount; i++) {
                    const angle = Math.random() * (c.aRange[1] - c.aRange[0]) + c.aRange[0];
                    const rand = Math.random();
                    const type = rand > 0.8 ? 'star' : rand > 0.4 ? 'circle' : 'square';
                    particles.push(new Particle(c.x, c.y, angle, type, isExplosive ? c.multiplier : 0.6));
                }
            });
        };

        // Massive Intro Burst
        fire(60, true);

        // Sustained bursts for celebration
        const startTime = Date.now();
        const duration = 12000; // 12 seconds of celebration

        const sustainInterval = setInterval(() => {
            if (Date.now() - startTime < duration) {
                fire(20, false);
            } else {
                clearInterval(sustainInterval);
            }
        }, 800);

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = particles.filter(p => p.opacity > 0 && p.y < canvas.height + 50);
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            if (isActive) {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            isActive = false;
            clearInterval(sustainInterval);
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
};
