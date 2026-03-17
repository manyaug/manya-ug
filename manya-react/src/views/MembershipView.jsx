import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { updateProfile } from '../store/userSlice';
import '../styles/membership.css';

function MembershipView() {
  const [currentTier, setCurrentTier] = useState('Scholar');
  const [activeProvider, setActiveProvider] = useState(null); // 'MTN' or 'Airtel' or null
  const [phoneInput, setPhoneInput] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleApplyPromo = () => {
    // TODO: Dispatch Toast Notification "Invalid Hero Code. Check spelling!"
    alert("Invalid Hero Code System. Check spelling!");
  };

  const handleStartMomo = (provider) => {
    setActiveProvider(provider);
  };

  const handleFinalCommit = () => {
    // TODO: Dispatch Toast "Connecting to Network..."
    alert("Connecting to Network...");
    
    // Simulate network delay
    setTimeout(() => {
        dispatch(updateProfile({
            status: "Elite Hero",
            membershipTier: currentTier
        }));
        
        // TODO: Dispatch Toast "WELCOME TO ELITE!"
        navigate('/profile');
    }, 3000);
  };

  return (
    <div className="membership-page animate-in">
        {/* 1. HEADER (FIXED BACK BUTTON) */}
        <div className="mem-header-row" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
            <button 
                className="manya-back-btn" 
                onClick={() => navigate('/profile')} 
                style={{ width:'45px', height:'45px', borderRadius:'15px', border:'2px solid var(--border-color)', background:'var(--bg-card)', cursor:'pointer', color:'var(--manya-purple)', display:'flex', alignItems:'center', justifyContent:'center'}}
            >
                <ChevronLeft size={24} strokeWidth={3} />
            </button>
            <div>
                <h2 style={{ fontWeight: 900, margin: 0, fontSize: '22px', color: 'var(--text-main)' }}>Manya Elite Hub</h2>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Unlock Your P.7 Potential</p>
            </div>
        </div>

        {/* 2. SOCIAL PROOF */}
        <div className="testimonial-card">
            <img src="/assets/images/manya_icon.png" className="test-av" alt="Testimonial" />
            <div className="test-text">
                "Upgrading to Elite was the best decision for my PLE prep. I love the offline mode!"
                <span className="test-name">Meda, P.7 Scholar</span>
            </div>
        </div>

        {/* 3. TIER STACK */}
        <div className="tier-stack">
            <div 
                className={`tier-card-elite ${currentTier === 'Starter' ? 'selected' : ''}`} 
                onClick={() => setCurrentTier('Starter')}
            >
                <span className="tier-title-small">Hero Weekly</span>
                <div className="tier-cost">UGX 5,000<span>/week</span></div>
            </div>

            <div 
                className={`tier-card-elite ${currentTier === 'Scholar' ? 'selected' : ''}`} 
                onClick={() => setCurrentTier('Scholar')}
            >
                <div className="best-value-ribbon">🏆 MOST POPULAR</div>
                <span className="tier-title-small">Termly Legend</span>
                <div className="tier-cost">UGX 20,000<span>/term</span></div>
            </div>
        </div>

        {/* 4. FEATURE GRID */}
        <div className="feature-compare-card">
            <h4>ELITE BENEFITS</h4>
            <div className="feature-row"><span>2,500+ Practice Questions</span> <span className="check-elite">✔</span></div>
            <div className="feature-row"><span>Full Offline Access</span> <span className="check-elite">✔</span></div>
            <div className="feature-row"><span>Parent Progress Sync</span> <span className="check-elite">✔</span></div>
            <div className="feature-row"><span>Hero Badge Unlocks</span> <span className="check-elite">✔</span></div>
        </div>

        {/* 5. PROMO AREA */}
        <div className="promo-box">
            <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px' }}>PROMO CODE</p>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="promo-input" placeholder="Enter Code" />
                <button 
                    onClick={handleApplyPromo} 
                    style={{ background: 'var(--manya-purple)', color: 'white', border: 'none', borderRadius: '12px', padding: '0 15px', fontWeight: 900, cursor: 'pointer' }}
                >
                    APPLY
                </button>
            </div>
        </div>

        {/* 6. MOMO DOCK */}
        <div className="momo-dock" id="momo-mount">
            {activeProvider ? (
                <>
                    <h4 style={{ color: '#FBBF24' }}>UPGRADING VIA {activeProvider}</h4>
                    <p style={{ color: 'white', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>
                        Total: UGX {currentTier === 'Starter' ? '5,000' : '20,000'}
                    </p>
                    <input 
                        type="tel" 
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="07... Number" 
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '2px solid rgba(255,255,255,0.2)', width: '100%', padding: '15px', borderRadius: '15px', marginBottom: '15px' }} 
                    />
                    <button 
                        onClick={handleFinalCommit} 
                        style={{ width: '100%', height: '60px', borderRadius: '24px', background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: 'white', border: 'none', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer' }}
                    >
                        CONFIRM PAYMENT
                    </button>
                    <button 
                        onClick={() => setActiveProvider(null)} 
                        style={{ width: '100%', background: 'none', border: 'none', color: '#94A3B8', marginTop: '15px', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                    >
                        ← CANCEL
                    </button>
                </>
            ) : (
                <>
                    <h4>SECURE CHECKOUT</h4>
                    <div className="momo-grid">
                        <div className="momo-btn-elite" onClick={() => handleStartMomo('MTN')}>
                            <div className="provider-logo" style={{ background: '#FFCC00', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px' }}>MTN</div>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: '11px' }}>MTN MoMo</span>
                        </div>
                        <div className="momo-btn-elite" onClick={() => handleStartMomo('Airtel')}>
                            <div className="provider-logo" style={{ background: '#FF0000', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '11px' }}>Airtel</div>
                            <span style={{ color: 'white', fontWeight: 900, fontSize: '11px' }}>Airtel Money</span>
                        </div>
                    </div>
                </>
            )}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.3 }}>
            <img src="/assets/images/manya_icon.png" style={{ width: '50px' }} alt="Manya Council" />
        </div>
    </div>
  );
}

export default MembershipView;
