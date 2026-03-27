import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, ShieldCheck, Globe } from 'lucide-react';
import '../styles/onboarding.css';

function LandingView() {
    const navigate = useNavigate();

    return (
        <div className="premium-ob-shell landing-shell">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container landing-container">
                <div className="landing-hero-area animate-in">
                    <div className="landing-logo-glitch">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" className="manya-main-logo" />
                    </div>
                    <h1 className="landing-title">MANYA COUNCIL</h1>
                    <p className="landing-subtitle">The Adaptive Knowledge Engine for Elite Heroes.</p>
                </div>

                <div className="landing-choices animate-up">
                    <div className="choice-card create" onClick={() => navigate('/onboarding')}>
                        <div className="choice-icon"><UserPlus size={28} /></div>
                        <div className="choice-text">
                            <h3>NEW HERO</h3>
                            <span>Construct a new Identity DNA</span>
                        </div>
                    </div>

                    <div className="choice-card login" onClick={() => navigate('/login')}>
                        <div className="choice-icon"><LogIn size={28} /></div>
                        <div className="choice-text">
                            <h3>RE-ENTRY</h3>
                            <span>Connect existing Hero Identity</span>
                        </div>
                    </div>
                </div>

                <div className="landing-footer">
                    <div className="security-status pulse">
                        <ShieldCheck size={14} /> COUNCIL ENCRYPTED SESSION
                    </div>
                    <div className="region-info">
                        <Globe size={14} /> MANYA-UG SECTOR
                    </div>
                </div>
            </div>

            <style>{`
                .landing-shell {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .landing-container {
                    justify-content: center;
                    align-items: center;
                    text-align: center;
                }
                .landing-hero-area {
                    margin-bottom: 60px;
                }
                .landing-logo-glitch {
                    width: 120px;
                    height: 120px;
                    margin: 0 auto 20px;
                    position: relative;
                }
                .manya-main-logo {
                    width: 100%;
                    filter: drop-shadow(0 0 20px rgba(129, 140, 248, 0.6));
                }
                .landing-title {
                    font-size: 32px;
                    font-weight: 900;
                    letter-spacing: 4px;
                    color: white;
                    margin-bottom: 8px;
                    text-shadow: 0 0 20px rgba(129, 140, 248, 0.4);
                }
                .landing-subtitle {
                    font-size: 14px;
                    color: #94a3b8;
                    font-weight: 600;
                    letter-spacing: 1px;
                }
                .landing-choices {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .choice-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 24px;
                    background: rgba(30, 41, 59, 0.6);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(129, 140, 248, 0.2);
                    border-radius: 24px;
                    cursor: pointer;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .choice-card:hover {
                    transform: translateY(-5px) scale(1.02);
                    background: rgba(129, 140, 248, 0.1);
                    border-color: var(--ob-accent);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                }
                .choice-icon {
                    width: 56px;
                    height: 56px;
                    background: rgba(129, 140, 248, 0.1);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--ob-accent);
                }
                .choice-text {
                    text-align: left;
                }
                .choice-text h3 {
                    font-size: 18px;
                    font-weight: 900;
                    margin: 0;
                    letter-spacing: 1px;
                }
                .choice-text span {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 700;
                }
                .landing-footer {
                    position: absolute;
                    bottom: 40px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    align-items: center;
                    opacity: 0.6;
                }
                .security-status, .region-info {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    color: #94a3b8;
                }
                .pulse {
                    animation: subtlePulse 2s infinite;
                }
                @keyframes subtlePulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; color: #4ade80; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}

export default LandingView;
