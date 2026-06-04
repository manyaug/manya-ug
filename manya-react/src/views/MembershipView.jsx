import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, 
    Crown, 
    ShieldCheck, 
    HelpCircle, 
    X, 
    Sparkles, 
    Phone, 
    Check, 
    Smartphone, 
    Wifi, 
    AlertCircle, 
    ArrowRight 
} from 'lucide-react';
import { updateProfile, updateBalanceThunk } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { IMAGES } from '../config/assetUrls';
import { audioService } from '../infrastructure/audio/audioService.js';
import '../styles/membership.css';

const BENEFIT_DETAILS = {
    "2,500+ Practice Questions": {
        desc: "Unlock our entire exhaustive curriculum covering Math, Science, English, and Social Studies. Over 2,500+ high-quality adaptive questions designed strictly around the national syllabus to guarantee PLE excellence!",
        tip: "Each subject adapts dynamically to your learning speed so you spend time only where it's needed."
    },
    "Full Offline Access": {
        desc: "Study anywhere, anytime! All curriculum notes, question banks, and learning simulations are automatically pre-cached inside your local device. Perfect for rural learning, traveling, or high-data periods.",
        tip: "No active internet connection or data bundles required after the initial synchronization."
    },
    "Parent Progress Sync": {
        desc: "Bridges the gap between classroom and home! Parents receive instant access to weekly progress report summaries, performance charts, and direct SMS alerts whenever the student stabilizes a new topic.",
        tip: "Enables guardians to act as supportive academic sponsors with pure visibility."
    },
    "Hero Badge Unlocks": {
        desc: "Acquire exclusive cosmetic enhancements! Elite players unlock premium custom hero avatars, rare neon DNA seeds, custom rank border glows, and physical badges that showcase academic mastery to the community.",
        tip: "Includes a multiplier bonus on all daily streak streaks and reward chest unlocks."
    }
};

function MembershipView() {
    const user = useSelector((state) => state.user.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // --- MAIN STATES ---
    const [currentTier, setCurrentTier] = useState('Scholar'); // 'Starter' or 'Scholar'
    const [activeProvider, setActiveProvider] = useState(null); // 'MTN' or 'Airtel' or null
    const [phoneInput, setPhoneInput] = useState(user?.parent_whatsapp || user?.parent_phone || '');
    
    // --- STAGES: 'idle' | 'phone-entry' | 'handshake' | 'ussd-pin' | 'processing' | 'success' ---
    const [checkoutStage, setCheckoutStage] = useState('idle');
    const [pinInput, setPinInput] = useState('');
    
    // --- BENEFITS DRAWER ---
    const [activeBenefit, setActiveBenefit] = useState(null);

    // --- PROMO CODE SYSTEM ---
    const [promoCode, setPromoCode] = useState('');
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [appliedCode, setAppliedCode] = useState('');
    const [discountAmount, setDiscountAmount] = useState(0); // in UGX

    // --- CALCULATIONS ---
    const getBasePrice = (tier) => {
        return tier === 'Starter' ? 5000 : 20000;
    };

    const getFinalPrice = (tier) => {
        const base = getBasePrice(tier);
        if (!isPromoApplied) return base;
        
        // Handle specific codes
        if (appliedCode === 'FREE' || appliedCode === 'HERO99') return 0;
        if (appliedCode === 'MANYA2026' || appliedCode === 'ELITE') return Math.max(0, base - base * 0.5); // 50% off
        return Math.max(0, base - base * 0.3); // 30% off standard discount
    };

    // --- AUDIO HELPER ---
    const playTap = () => {
        try { audioService.tap(); } catch(e) {}
    };

    // --- PROMO CODE HANDLERS ---
    const handleApplyPromo = () => {
        playTap();
        const code = promoCode.trim().toUpperCase();
        
        if (!code) {
            dispatch(addToast({ message: "Please enter a valid Hero Code.", type: "warning" }));
            return;
        }

        const validCodes = ['MANYA2026', 'ELITE', 'HERO99', 'FREE', 'PLEPREP'];
        if (validCodes.includes(code)) {
            setIsPromoApplied(true);
            setAppliedCode(code);
            
            // Play positive chimes
            try { 
                audioService.success();
            } catch(e) {}

            dispatch(addToast({ message: `Promo Code ${code} Stabilized! Discount Applied!`, type: "success" }));
        } else {
            try { audioService.error(); } catch(e) {}
            dispatch(addToast({ message: "Invalid Hero Code. Check spelling!", type: "error" }));
        }
    };

    const handleClearPromo = () => {
        playTap();
        setIsPromoApplied(false);
        setAppliedCode('');
        setPromoCode('');
        dispatch(addToast({ message: "Promo Code Decoupled.", type: "info" }));
    };

    // --- MOMO FLOW ---
    const handleStartMomo = (provider) => {
        playTap();
        setActiveProvider(provider);
        setCheckoutStage('phone-entry');
    };

    const handleConfirmPhone = () => {
        playTap();
        const cleanPhone = phoneInput.trim();
        if (!cleanPhone || cleanPhone.length < 9) {
            try { audioService.error(); } catch(e) {}
            dispatch(addToast({ message: "Please enter a valid Mobile Money number.", type: "error" }));
            return;
        }

        // Handshake transition simulation
        setCheckoutStage('handshake');
        setTimeout(() => {
            setCheckoutStage('ussd-pin');
            setPinInput('');
        }, 1800);
    };

    // --- KEYPAD INPUTS ---
    const handleKeypadPress = (num) => {
        playTap();
        if (pinInput.length < 4) {
            setPinInput(prev => prev + num);
        }
    };

    const handleKeypadDelete = () => {
        try { audioService.pop(); } catch(e) {}
        setPinInput(prev => prev.slice(0, -1));
    };

    const handleKeypadCancel = () => {
        try { audioService.pop(); } catch(e) {}
        setCheckoutStage('phone-entry');
        setPinInput('');
    };

    // --- PAYMENT AUTHENTICATION ---
    const handleConfirmPayment = () => {
        playTap();
        if (pinInput.length !== 4) {
            try { audioService.error(); } catch(e) {}
            dispatch(addToast({ message: "Please enter a complete 4-digit PIN.", type: "error" }));
            return;
        }

        setCheckoutStage('processing');

        // Multi-stage simulated telecom verification
        setTimeout(() => {
            try { audioService.success(); } catch(e) {}
            
            // Commit to cloud balance database ledger
            dispatch(updateBalanceThunk({
                currency: 'gem_overall',
                amount: 50,
                type: 'MEMBERSHIP_UPGRADE',
                contextId: 'membership'
            }));

            // Update local profile status
            dispatch(updateProfile({
                status: "Elite Hero",
                membershipTier: currentTier === 'Starter' ? 'Starter Weekly' : 'Termly Legend'
            }));
            
            setCheckoutStage('success');
            
            // Play victory tunes
            try {
                audioService.playSFX('epic');
            } catch(e) {}
            
        }, 3000);
    };

    const handleFinishUnlock = () => {
        playTap();
        dispatch(addToast({ message: "Welcome to Elite! Your cloud DNA is upgraded.", type: "success" }));
        navigate('/profile');
    };

    // --- TESTIMONIAL CYCLER ---
    const testimonials = [
        { name: "Meda, P.7 Scholar", text: "Upgrading to Elite was the best decision for my PLE prep. I love the offline mode!", icon: "💜" },
        { name: "Kato, Math Wizard", text: "The offline quizzes saved me! I scored 99% in my school assessment using Manya Termly.", icon: "🌟" },
        { name: "Alimah, Primary 6 Hero", text: "My parents track my progress via SMS, which makes them super proud of my streak levels!", icon: "🔥" }
    ];
    const [testIndex, setTestIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTestIndex(prev => (prev + 1) % testimonials.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // --- ANIMATIONS ---
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { y: 15, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="membership-page font-main"
        >
            {/* 🌌 AURORA AMBIENCE */}
            <div className="aurora-engine">
                <div className="blob aurora-1"></div>
                <div className="blob aurora-2" style={{ background: 'var(--manya-gold)' }}></div>
            </div>

            {/* 👑 PREMIUM MOBILE HEADER */}
            <header className="pref-header-elite mb-6 !p-6">
                <div className="toy-card-gloss" />
                <div className="flex items-center gap-4 relative z-20">
                    <button className="pref-back-btn btn-toy" onClick={() => { playTap(); navigate('/profile'); }}>
                        <div className="toy-card-gloss" />
                        <ChevronLeft size={28} strokeWidth={3.5} />
                    </button>
                    <div className="text-left flex-1">
                        <span className="pref-breadcrumb flex items-center gap-1 font-black">
                            <Crown size={12} className="text-amber-500 fill-amber-500" /> 
                            ELITE POWER HUB
                        </span>
                        <h1 className="pref-main-title">Manya Elite</h1>
                    </div>
                </div>
            </header>

            {/* 📣 PLAYFUL SLIDING SOCIAL PROOF */}
            <motion.div variants={itemVariants} className="leaderboard-card-elite mem-testimonial-card relative overflow-hidden">
                <div className="toy-card-gloss" />
                <AnimatePresence mode="wait">
                    <motion.div
                        key={testIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center text-center gap-3 relative z-10"
                    >
                        <div className="test-avatar-wrap">
                            <span className="text-2xl">{testimonials[testIndex].icon}</span>
                            <div className="test-glow" />
                        </div>
                        <p className="test-text">
                            "{testimonials[testIndex].text}"
                        </p>
                        <span className="test-name">{testimonials[testIndex].name}</span>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* 💸 TIER SUBSCRIPTION PACKS */}
            <motion.div variants={itemVariants} className="tier-stack">
                {/* Starter Card */}
                <div
                    className={`tier-card-elite ${currentTier === 'Starter' ? 'selected' : ''}`}
                    onClick={() => { playTap(); setCurrentTier('Starter'); }}
                >
                    <div className="card-glass-glow"></div>
                    <span className="tier-title-small">Hero Weekly</span>
                    <div className="tier-cost">
                        {isPromoApplied ? (
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-400 line-through font-bold">UGX 5,000</span>
                                <span className="text-amber-500 font-black">UGX {getFinalPrice('Starter').toLocaleString()}</span>
                            </div>
                        ) : (
                            <span>UGX 5,000</span>
                        )}
                        <span className="period">/wk</span>
                    </div>
                </div>

                {/* Termly Card */}
                <div
                    className={`tier-card-elite elite-tier ${currentTier === 'Scholar' ? 'selected' : ''}`}
                    onClick={() => { playTap(); setCurrentTier('Scholar'); }}
                >
                    <div className="best-value-ribbon flex items-center gap-1 font-black">
                        <Crown size={12} className="fill-white" /> MOST POPULAR
                    </div>
                    <div className="card-glass-glow" style={{ background: 'var(--manya-gold)', opacity: 0.15 }}></div>
                    <span className="tier-title-small" style={{ color: 'var(--manya-gold)' }}>Termly Legend</span>
                    <div className="tier-cost">
                        {isPromoApplied ? (
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-slate-400 line-through font-bold">UGX 20,000</span>
                                <span className="text-amber-500 font-black">UGX {getFinalPrice('Scholar').toLocaleString()}</span>
                            </div>
                        ) : (
                            <span style={{ color: 'var(--manya-gold)' }}>UGX 20,000</span>
                        )}
                        <span className="period">/tm</span>
                    </div>
                </div>
            </motion.div>

            {/* 📊 INTERACTIVE BENEFITS LIST */}
            <motion.div variants={itemVariants} className="leaderboard-card-elite feature-compare-card">
                <div className="toy-card-gloss" />
                <div className="list-header">
                    <span>ELITE BENEFITS</span>
                    <span>DETAILS</span>
                </div>
                {Object.keys(BENEFIT_DETAILS).map((benefit, idx) => (
                    <div 
                        key={idx} 
                        className="rank-row-elite mem-feature-row cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                        onClick={() => { playTap(); setActiveBenefit(benefit); }}
                    >
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="check-elite" size={20} />
                            <span className="r-name font-bold">{benefit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <HelpCircle size={16} className="text-slate-300 dark:text-slate-600 hover:text-violet-500" />
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* 🏷️ FUNCTIONAL DISCOUNT PROMO BOX */}
            <motion.div variants={itemVariants} className="promo-box-elite relative overflow-hidden">
                <div className="toy-card-gloss" />
                <p className="promo-label flex items-center gap-1.5 font-black">
                    <Sparkles size={12} className="text-violet-500" /> HERO PROMO CODE
                </p>
                <div className="promo-input-row">
                    <input 
                        type="text" 
                        className="promo-input" 
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter Code (e.g. MANYA2026)" 
                        disabled={isPromoApplied}
                    />
                    {isPromoApplied ? (
                        <button className="promo-apply-btn !bg-rose-500 hover:!bg-rose-600" onClick={handleClearPromo}>
                            REMOVE
                        </button>
                    ) : (
                        <button className="promo-apply-btn" onClick={handleApplyPromo}>
                            APPLY
                        </button>
                    )}
                </div>
                {isPromoApplied && (
                    <div className="mt-3 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                        <Check size={16} className="shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider">
                            Code "{appliedCode}" active (slashed {appliedCode === 'FREE' || appliedCode === 'HERO99' ? '100' : '50'}% off!)
                        </span>
                    </div>
                )}
            </motion.div>

            {/* 💳 DOCK FOR PAYMENT OR CHECKOUT FLOW */}
            <motion.div variants={itemVariants} className="momo-dock-elite" id="momo-mount">
                <div className="toy-card-gloss" />
                
                {checkoutStage === 'phone-entry' && (
                    <div className="momo-checkout-active relative z-20">
                        <h4>UPGRADING VIA {activeProvider}</h4>
                        <p className="checkout-total">
                            Total amount: <b>UGX {getFinalPrice(currentTier).toLocaleString()}</b>
                        </p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                                <Phone size={16} />
                            </span>
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="Enter MoMo Number (e.g. 077...)"
                                className="momo-phone-input !pl-12"
                            />
                        </div>
                        <button className="momo-confirm-btn" onClick={handleConfirmPhone}>
                            INITIATE MoMo PUSH
                        </button>
                        <button className="momo-cancel-btn" onClick={() => { playTap(); setCheckoutStage('idle'); setActiveProvider(null); }}>
                            ← CHOOSE PROVIDER
                        </button>
                    </div>
                )}

                {checkoutStage === 'idle' && (
                    <div className="momo-checkout-idle relative z-20">
                        <h4>SECURE MOBILE MONEY</h4>
                        <div className="momo-grid">
                            <div className="momo-btn-elite mtn" onClick={() => handleStartMomo('MTN')}>
                                <div className="provider-logo shadow-lg">MTN</div>
                                <span>MTN MoMo</span>
                            </div>
                            <div className="momo-btn-elite airtel" onClick={() => handleStartMomo('Airtel')}>
                                <div className="provider-logo shadow-lg">airtel</div>
                                <span>Airtel Money</span>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* 📄 BENEFITS DRAWER DETAILED BOTTOM SHEET */}
            <AnimatePresence>
                {activeBenefit && (
                    <div className="benefit-drawer-backdrop z-[9000]" onClick={() => { playTap(); setActiveBenefit(null); }}>
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                            className="benefit-drawer-sheet z-[9001]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="drawer-handle" />
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="drawer-title flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-500 fill-emerald-500/20" size={24} />
                                    {activeBenefit}
                                </h3>
                                <button className="drawer-close" onClick={() => { playTap(); setActiveBenefit(null); }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="drawer-body">
                                <p className="drawer-desc leading-relaxed mb-6">
                                    {BENEFIT_DETAILS[activeBenefit].desc}
                                </p>
                                <div className="drawer-tip-card flex items-start gap-3">
                                    <span className="text-xl">💡</span>
                                    <div>
                                        <h5 className="font-black text-xs text-indigo-500 uppercase tracking-widest mb-1">PRO-TIP</h5>
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            {BENEFIT_DETAILS[activeBenefit].tip}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 📱 IMMERSIVE USSD TELECOM OVERLAY SIMULATOR */}
            <AnimatePresence>
                {checkoutStage === 'handshake' && (
                    <div className="ussd-overlay flex flex-col items-center justify-center p-6 z-[9500]">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="ussd-handshake-card flex flex-col items-center text-center p-8 gap-6 z-[9501] relative overflow-hidden"
                        >
                            <div className="toy-card-gloss" />
                            <div className="w-16 h-16 rounded-full border-4 border-t-amber-500 border-r-transparent border-slate-700 animate-spin flex items-center justify-center">
                                <Smartphone size={24} className="text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase text-amber-500 tracking-wider">MoMo Push Pending</h3>
                                <p className="text-xs font-bold text-slate-400 mt-2">
                                    Establishing secure handshaking credentials with {activeProvider} API gateway...
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-xl text-[10px] font-mono tracking-widest text-slate-500 border border-slate-700/50">
                                <Wifi size={10} className="" /> SIMULATOR MODE ACTIVE
                            </div>
                        </motion.div>
                    </div>
                )}

                {checkoutStage === 'ussd-pin' && (
                    <div className="ussd-overlay flex flex-col items-center justify-end z-[9500] pb-6 px-4 md:justify-center">
                        {/* USSD Telecom Prompt Dialogue */}
                        <motion.div 
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -50, opacity: 0 }}
                            className={`ussd-dialogue-box z-[9501] mb-6 ${activeProvider?.toLowerCase()}-style`}
                        >
                            <div className="ussd-dialogue-header">
                                <Crown size={14} className="fill-white" />
                                <span>{activeProvider === 'MTN' ? 'MTN MoMo Pay' : 'Airtel Money Push'}</span>
                            </div>
                            <div className="ussd-dialogue-body">
                                <p className="ussd-prompt">
                                    Authorize transaction of <b>UGX {getFinalPrice(currentTier).toLocaleString()}</b> to <b>MANYA PREP HUB</b>?
                                </p>
                                <p className="ussd-sub-prompt">Enter 4-Digit Mobile Money PIN:</p>
                                <div className="ussd-pin-dots">
                                    {[0, 1, 2, 3].map((idx) => (
                                        <span 
                                            key={idx} 
                                            className={`pin-dot ${pinInput.length > idx ? 'filled' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="ussd-dialogue-footer">
                                <button className="ussd-dialogue-btn cancel" onClick={handleKeypadCancel}>
                                    CANCEL
                                </button>
                                <button 
                                    className="ussd-dialogue-btn authorize" 
                                    onClick={handleConfirmPayment}
                                    disabled={pinInput.length !== 4}
                                >
                                    SEND
                                </button>
                            </div>
                        </motion.div>

                        {/* Immersive Tactile Keypad */}
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="ussd-keypad-panel z-[9501] relative"
                        >
                            <div className="toy-card-gloss" />
                            <div className="keypad-grid">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button 
                                        key={num} 
                                        className="key-btn"
                                        onClick={() => handleKeypadPress(num.toString())}
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button className="key-btn special cancel" onClick={handleKeypadCancel}>
                                    ←
                                </button>
                                <button 
                                    className="key-btn" 
                                    onClick={() => handleKeypadPress('0')}
                                >
                                    0
                                </button>
                                <button className="key-btn special delete" onClick={handleKeypadDelete}>
                                    DEL
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {checkoutStage === 'processing' && (
                    <div className="ussd-overlay flex flex-col items-center justify-center p-6 z-[9500]">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="ussd-handshake-card flex flex-col items-center text-center p-8 gap-6 z-[9501] relative overflow-hidden"
                        >
                            <div className="toy-card-gloss" />
                            <div className="w-16 h-16 rounded-full border-4 border-t-emerald-500 border-r-transparent border-slate-700 animate-spin flex items-center justify-center">
                                <Wifi size={24} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase text-emerald-500 tracking-wider">Securing Transaction</h3>
                                <p className="text-xs font-bold text-slate-400 mt-2">
                                    Verifying authorization signature and syncing credentials with Manya Core Cloud...
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}

                {checkoutStage === 'success' && (
                    <div className="ussd-overlay flex flex-col items-center justify-center p-4 z-[9600]">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="victory-checkout-card flex flex-col items-center text-center p-8 z-[9601] relative overflow-hidden max-w-sm w-full"
                        >
                            <div className="toy-card-gloss" />
                            
                            {/* Crown / Sparkle decoration */}
                            <div className="crown-victory-halo mb-4 relative">
                                <div className="absolute inset-0 bg-amber-400 filter blur-xl opacity-40 rounded-full" />
                                <Crown size={60} className="text-amber-500 fill-amber-400 relative z-10" />
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Upgrade Complete!</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mb-6">
                                Status: ELITE HERO UNLOCKED
                            </p>

                            <div className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-slate-800 rounded-3xl p-4 mb-6 text-left flex flex-col gap-3 font-mono text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">PROVIDER</span>
                                    <span className="font-bold text-slate-700">{activeProvider} Mobile Money</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">TRANS-ID</span>
                                    <span className="font-bold text-slate-700">MNY-{Math.floor(100000 + Math.random() * 900000)}</span>
                                </div>
                                <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-800 pt-3">
                                    <span className="text-slate-400">UNLOCKED TIER</span>
                                    <span className="font-bold text-violet-500 uppercase">{currentTier} Tier</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">BONUS REWARDS</span>
                                    <span className="font-bold text-amber-500 flex items-center gap-1">
                                        + 50 Diamonds 💎
                                    </span>
                                </div>
                            </div>

                            <button className="w-full btn-toy btn-toy-purple h-16 text-[12px]" onClick={handleFinishUnlock}>
                                ENTER ELITE REALM
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default MembershipView;
