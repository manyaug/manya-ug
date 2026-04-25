import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Crown, ShieldCheck } from 'lucide-react';
import { updateProfile } from '../store/userSlice';
import { IMAGES } from '../config/assetUrls';
import '../styles/membership.css';

function MembershipView() {
  const [currentTier, setCurrentTier] = useState('Scholar');
  const [activeProvider, setActiveProvider] = useState(null); // 'MTN' or 'Airtel' or null
  const [phoneInput, setPhoneInput] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- MOTION VARIANTS ---
  const containerVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const handleApplyPromo = () => {
    alert("Invalid Hero Code System. Check spelling!");
  };

  const handleStartMomo = (provider) => {
    setActiveProvider(provider);
  };

  const handleFinalCommit = () => {
    alert("Connecting to Network...");
    setTimeout(() => {
        dispatch(updateProfile({
            status: "Elite Hero",
            membershipTier: currentTier
        }));
        navigate('/profile');
    }, 3000);
  };

  return (
    <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="membership-page"
    >
        {/* 0. DYNAMIC AURORA ENGINE */}
        <div className="aurora-engine">
            <div className="blob aurora-1"></div>
            <div className="blob aurora-2" style={{ background: '#f59e0b' }}></div>
        </div>

        {/* 1. ARENA-STYLE HEADER (UNITED) */}
        <header className="pref-header-elite mb-10 !p-6">
            <div className="toy-card-gloss" />
            <div className="flex items-center gap-4 relative z-20">
                <button className="pref-back-btn btn-toy" onClick={() => navigate('/profile')}>
                    <div className="toy-card-gloss" />
                    <ChevronLeft size={28} strokeWidth={3.5} />
                </button>
                <div className="text-left">
                    <span className="pref-breadcrumb">ELITE HUB</span>
                    <h1 className="pref-main-title">Unlock Potential</h1>
                </div>
            </div>
        </header>

        {/* 2. SOCIAL PROOF (GLASSMORPHIC) */}
        <motion.div variants={itemVariants} className="leaderboard-card-elite mem-testimonial-card">
            <div className="test-avatar-wrap">
                <img src={IMAGES.manya_icon} alt="Testimonial" />
                <div className="test-glow"></div>
            </div>
            <div className="test-text">
                "Upgrading to Elite was the best decision for my PLE prep. I love the offline mode!"
                <span className="test-name">Meda, P.7 Scholar</span>
            </div>
        </motion.div>

        {/* 3. TIER STACK */}
        <motion.div variants={itemVariants} className="tier-stack">
            <div 
                className={`tier-card-elite ${currentTier === 'Starter' ? 'selected' : ''}`} 
                onClick={() => setCurrentTier('Starter')}
            >
                <div className="card-glass-glow"></div>
                <span className="tier-title-small">Hero Weekly</span>
                <div className="tier-cost">UGX 5,000<span className="period">/wk</span></div>
            </div>

            <div 
                className={`tier-card-elite ${currentTier === 'Scholar' ? 'selected' : ''} elite-tier`} 
                onClick={() => setCurrentTier('Scholar')}
            >
                {/* Fixed "MOST POPULAR" Ribbon inside card to stop overlap */}
                <div className="best-value-ribbon">
                    <Crown size={12} color="#fff" style={{ marginRight: '4px' }} /> MOST POPULAR
                </div>
                <div className="card-glass-glow" style={{ background: '#f59e0b', opacity: 0.15 }}></div>
                <span className="tier-title-small" style={{ color: '#f59e0b' }}>Termly Legend</span>
                <div className="tier-cost">UGX 20,000<span className="period">/tm</span></div>
            </div>
        </motion.div>

        {/* 4. FEATURE GRID */}
        <motion.div variants={itemVariants} className="leaderboard-card-elite feature-compare-card">
            <div className="list-header">
                <span>ELITE BENEFITS</span>
                <span>STATUS</span>
            </div>
            <div className="rank-row-elite mem-feature-row">
                <span className="r-name">2,500+ Practice Questions</span>
                <div className="r-stat"><ShieldCheck className="check-elite" size={20} /></div>
            </div>
            <div className="rank-row-elite mem-feature-row">
                <span className="r-name">Full Offline Access</span>
                <div className="r-stat"><ShieldCheck className="check-elite" size={20} /></div>
            </div>
            <div className="rank-row-elite mem-feature-row">
                <span className="r-name">Parent Progress Sync</span>
                <div className="r-stat"><ShieldCheck className="check-elite" size={20} /></div>
            </div>
            <div className="rank-row-elite mem-feature-row" style={{ borderBottom: 'none' }}>
                <span className="r-name">Hero Badge Unlocks</span>
                <div className="r-stat"><ShieldCheck className="check-elite" size={20} /></div>
            </div>
        </motion.div>

        {/* 5. PROMO AREA */}
        <motion.div variants={itemVariants} className="promo-box-elite">
            <p className="promo-label">PROMO CODE</p>
            <div className="promo-input-row">
                <input type="text" className="promo-input" placeholder="Enter Hero Code" />
                <button className="promo-apply-btn" onClick={handleApplyPromo}>APPLY</button>
            </div>
        </motion.div>

        {/* 6. MOMO DOCK */}
        <motion.div variants={itemVariants} className="momo-dock-elite" id="momo-mount">
            {activeProvider ? (
                <div className="momo-checkout-active">
                    <h4>UPGRADING VIA {activeProvider}</h4>
                    <p className="checkout-total">
                        Total: <b>UGX {currentTier === 'Starter' ? '5,000' : '20,000'}</b>
                    </p>
                    <input 
                        type="tel" 
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="07... Number" 
                        className="momo-phone-input"
                    />
                    <button className="momo-confirm-btn" onClick={handleFinalCommit}>
                        CONFIRM SECURE PAYMENT
                    </button>
                    <button className="momo-cancel-btn" onClick={() => setActiveProvider(null)}>
                        ← CANCEL
                    </button>
                </div>
            ) : (
                <div className="momo-checkout-idle">
                    <h4>SECURE CHECKOUT</h4>
                    <div className="momo-grid">
                        <div className="momo-btn-elite mtn" onClick={() => handleStartMomo('MTN')}>
                            <div className="provider-logo">MTN</div>
                            <span>MTN MoMo</span>
                        </div>
                        <div className="momo-btn-elite airtel" onClick={() => handleStartMomo('Airtel')}>
                            <div className="provider-logo">airtel</div>
                            <span>Airtel Money</span>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
        
        <div className="rank-footer">
            <img src={IMAGES.manya_icon} alt="Manya Council" />
            <p>Manya Elite Hub</p>
        </div>
    </motion.div>
  );
}

export default MembershipView;

