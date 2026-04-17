import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Zap, Star, Sparkles, BookOpen, Layers, Trophy } from 'lucide-react';

const CharacterMap = {
    math:    { name: 'Manya',  image: '/assets/images/manya.png' },
    science: { name: 'Kiki',   image: '/assets/images/kiki.png' },
    english: { name: 'Polly',  image: '/assets/images/polly-removebg-preview.png' },
    sst:     { name: 'Zany',   image: '/assets/images/zany.png' },
    default: { name: 'Manya',  image: '/assets/images/manya.png' }
};

const MilestoneMap = {
    WARMUP: {
        pass: { title: 'Adventure Begins!', sub: 'Your journey through the subject has started.', icon: Zap },
        fail: { title: 'Needs Warming!', sub: 'Don\'t worry, the gears are just getting started.', icon: Zap }
    },
    EXPLORE: {
        pass: { title: 'Knowledge Unlocked!', sub: 'You\'ve explored a new chapter of wisdom.', icon: BookOpen },
        fail: { title: 'Mystery Awaits!', sub: 'Some secrets are still hidden. Let\'s find them.', icon: BookOpen }
    },
    PRACTICE: {
        pass: { title: 'Skill Sharpened!', sub: 'Your practice is paying off. Keep it up!', icon: Layers },
        fail: { title: 'Forge Ahead!', sub: 'Every mistake is a lesson. Forge your skills!', icon: Layers }
    },
    REINFORCE: {
        pass: { title: 'Strong Foundations!', sub: 'Your understanding is becoming rock solid.', icon: Sparkles },
        fail: { title: 'Building Strength!', sub: 'Consistency is key to a powerful mind.', icon: Sparkles }
    },
    MASTERY: {
        pass: { title: 'Absolute Legend!', sub: 'You have mastered this quest completely!', icon: Trophy },
        fail: { title: 'Almost There!', sub: 'The final crown is within your reach. Retry!', icon: Trophy }
    },
    DEFAULT: {
        pass: { title: 'Congratulations!', sub: 'You just reached a new milestone!', icon: Star },
        fail: { title: 'Good Effort!', sub: 'Keep at it and you\'ll pass next time!', icon: Star }
    }
};

const Ribbon = ({ text }) => (
    <div className="ribbon-3d-wrapper">
        <div className="ribbon-3d-fold-left" />
        <div className="ribbon-3d-main">{text}</div>
        <div className="ribbon-3d-fold-right" />
    </div>
);

const WorldClassConfetti = () => {
    const canvasRef = React.useRef(null);

    React.useEffect(() => {
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
                    ctx.ellipse(0, 0, this.size/2, Math.abs(shimmer/2), 0, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(-this.size/2, -shimmer/2, this.size, shimmer);
                }
                ctx.restore();
            }
        }

        let particles = [];
        
        const fire = (count = 40) => {
            if (!isActive) return;
            // 4 Corners
            const corners = [
                { x: 0,            y: canvas.height, aRange: [-80, -20] }, // Bottom Left (Up/Right)
                { x: canvas.width, y: canvas.height, aRange: [-160, -100] }, // Bottom Right (Up/Left)
                { x: 0,            y: 0,             aRange: [20, 80] },    // Top Left (Down/Right)
                { x: canvas.width, y: 0,             aRange: [100, 160] }   // Top Right (Down/Left)
            ];

            corners.forEach(c => {
                for(let i=0; i<count; i++) {
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

const CelebrationView = ({ 
    subject = 'default',
    nodeType = 'PRACTICE',
    mastery = 0,
    score = 0,
    total = 0,
    gemsEarned = 0,
    onCollect 
}) => {
    const char = CharacterMap[subject.toLowerCase()] || CharacterMap.default;
    const isPassing = mastery >= 60;
    const milestone = MilestoneMap[nodeType.toUpperCase()] || MilestoneMap.DEFAULT;
    const msg = isPassing ? milestone.pass : milestone.fail;

    return (
        <div className="celebration-arena-overlay">
            <WorldClassConfetti />
            
            <motion.div 
                className="celebration-card-container"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 100 }}
            >
                {/* Close Button */}
                <button className="celebration-close-x" onClick={onCollect}>
                    <X size={20} strokeWidth={4} />
                </button>

                {/* Hero Mascot */}
                <div className="celebration-hero-blob">
                    <motion.img 
                        src={char.image} 
                        alt={char.name} 
                        className="celebration-mascot-hero"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                </div>

                {/* Badge Ribbon */}
                <Ribbon text={`${nodeType} COMPLETE`} />

                <h1 className="celebration-title-premium">{msg.title}</h1>
                <p className="celebration-subtext-premium">{msg.sub}</p>

                {/* Stats Card */}
                <div className="premium-mastery-card">
                    <div className="premium-mastery-circle">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                            <motion.circle 
                                cx="50" cy="50" r="45" fill="none" 
                                stroke={isPassing ? '#10b981' : '#f43f5e'} 
                                strokeWidth="10"
                                strokeDasharray="283"
                                initial={{ strokeDashoffset: 283 }}
                                animate={{ strokeDashoffset: 283 - (283 * mastery) / 100 }}
                                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm font-black text-slate-800 leading-none">{mastery}%</span>
                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Mastery</span>
                        </div>
                    </div>

                    <div className="premium-stats-list">
                        <div className="stat-row-premium">
                            <span>Questions Correct:</span>
                            <span className="val">{score}/{total}</span>
                        </div>
                        <div className="stat-row-premium">
                            <span>Gems Earned:</span>
                            <span className="val text-amber-500">+{gemsEarned} ✨</span>
                        </div>
                        <div className="stat-row-premium">
                            <span>XP Bonus:</span>
                            <span className="val text-indigo-500">+100 XP</span>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button className="btn-collect-3d" onClick={onCollect}>
                    <div className="btn-gloss-highlight" />
                    <span>COLLECT REWARDS</span>
                    <ArrowRight size={20} strokeWidth={3} />
                </button>
            </motion.div>
        </div>
    );
};

export default CelebrationView;
