import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import splashHero from '../assets/ui/splash_hero.png';
import '../styles/splash.css';

function SplashScreen({ onFinish }) {
    return (
        <AnimatePresence>
            <motion.div
                key="splash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ 
                    opacity: 0, 
                    y: -20,
                    transition: { duration: 0.5, ease: "easeIn" }
                }}
                className="splash-screen"
            >
                <div className="splash-hero-container">
                    {/* Hand-Drawn Hero Illustration */}
                    <motion.img 
                        src={splashHero} 
                        alt="Welcome to Manya" 
                        className="splash-hero-img"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    />

                    {/* Simplistic Text Stack */}
                    <motion.div 
                        className="splash-text-block"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                    >
                        <h1 className="splash-title-simplistic">Journey with Manya</h1>
                        <p className="splash-tagline-simplistic">
                            A world of playful learning and heroic discoveries starts here.
                        </p>
                    </motion.div>

                    {/* Premium Glossy Action Button */}
                    <motion.div 
                        className="splash-action-zone"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 12 }}
                    >
                        <button className="btn-lets-go" onClick={onFinish}>
                            <div className="btn-lets-go-glow" />
                            Let's go! <span className="btn-icon-star">✨</span>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default SplashScreen;
