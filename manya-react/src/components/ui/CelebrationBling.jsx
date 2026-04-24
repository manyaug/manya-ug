import React, { useRef, useEffect } from 'react';

export const Ribbon = ({ text }) => (
    <div className="ribbon-3d-wrapper">
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

        const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor(x, y, angle, type = 'square') {
                this.x = x;
                this.y = y;
                const speed = Math.random() * 20 + 10;
                this.vx = Math.cos(angle * Math.PI / 180) * speed;
                this.vy = Math.sin(angle * Math.PI / 180) * speed;

                this.gravity = 0.25; // Slower fall
                this.friction = 0.99; // Less air drag
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.size = Math.random() * 12 + 6;
                this.rotation = Math.random() * 360;
                this.rSpeed = (Math.random() - 0.5) * 8;
                this.wobbles = Math.random() * 10;
                this.opacity = 1;
                this.type = type;
            }

            update() {
                this.vx *= this.friction;
                this.vy *= this.friction;
                this.vy += this.gravity;
                this.x += this.vx + Math.sin(this.wobbles) * 0.3;
                this.y += this.vy;
                this.rotation += this.rSpeed;
                this.wobbles += 0.05;

                // Extremely slow decay for the "50 second" stay
                if (this.y > canvas.height * 0.8) {
                    this.opacity -= 0.005;
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation * Math.PI / 180);
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = this.color;

                const shimmer = Math.cos(this.rotation * 0.05) * this.size;
                if (this.type === 'circle') {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.size / 2, Math.abs(shimmer / 2), 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-this.size / 2, -shimmer / 2, this.size, shimmer);
                }
                ctx.restore();
            }
        }

        let particles = [];

        const fire = (count = 40) => {
            if (!isActive) return;
            // 4 Corners
            const corners = [
                { x: 0, y: canvas.height, aRange: [-80, -20] }, // Bottom Left (Up/Right)
                { x: canvas.width, y: canvas.height, aRange: [-160, -100] }, // Bottom Right (Up/Left)
                { x: 0, y: 0, aRange: [20, 80] },    // Top Left (Down/Right)
                { x: canvas.width, y: 0, aRange: [100, 160] }   // Top Right (Down/Left)
            ];

            corners.forEach(c => {
                for (let i = 0; i < count; i++) {
                    const angle = Math.random() * (c.aRange[1] - c.aRange[0]) + c.aRange[0];
                    particles.push(new Particle(c.x, c.y, angle, i % 2 === 0 ? 'square' : 'circle'));
                }
            });
        };

        // Massive Intro Burst
        fire(80);

        // Sustained bursts for 50 seconds
        const startTime = Date.now();
        const duration = 50000; // 50 seconds

        const sustainInterval = setInterval(() => {
            if (Date.now() - startTime < duration) {
                fire(15); // Smaller micro-bursts
            } else {
                clearInterval(sustainInterval);
            }
        }, 3000);

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = particles.filter(p => p.opacity > 0 && p.y < canvas.height + 100);
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            if (isActive || particles.length > 0) {
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
            className="fixed inset-0 pointer-events-none z-[5]"
            style={{ width: '100vw', height: '100vh' }}
        />
    );
};
