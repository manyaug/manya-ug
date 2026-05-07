import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserPlus, LogIn, ShieldCheck, Globe } from 'lucide-react';
import '../styles/onboarding.css';

function LandingView() {
    const navigate = useNavigate();
    const { data: user } = useSelector(state => state.user);

    // 🛡️ AUTH PROTECTOR: If already logged in, don't show landing
    useEffect(() => {
        if (user?.uid) {
            if (user.onboarded) {
                navigate('/home');
            } else {
                navigate('/onboarding');
            }
        }
    }, [user, navigate]);

    return (
        <div className="premium-ob-shell landing-shell" data-theme="light">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container landing-container">
                <div className="landing-hero-area animate-in">
                    <div className="landing-logo-glitch">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" className="manya-main-logo" />
                    </div>
                    <h1 className="landing-title">MANYA</h1>
                    <p className="landing-subtitle">The Adaptive Knowledge Engine.</p>
                </div>

                <div className="landing-actions animate-up">
                    <button className="mobile-btn-elite primary" onClick={() => navigate('/onboarding')}>
                        GET STARTED
                    </button>
                    <button className="mobile-btn-elite secondary" onClick={() => navigate('/login')}>
                        LOG IN
                    </button>
                </div>

                <div className="landing-footer">
                    <div className="security-status pulse">
                        <ShieldCheck size={14} /> SECURE SESSION
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
                    margin-bottom: 30px; /* Reduced to avoid scroll */
                }
                .landing-logo-glitch {
                    width: 90px;
                    height: 90px;
                    margin: 0 auto 20px;
                    position: relative;
                }
                .manya-main-logo {
                    width: 100%;
                    filter: drop-shadow(0 0 20px rgba(124, 58, 237, 0.4));
                }
                .landing-title {
                    font-size: 32px;
                    font-weight: 900;
                    letter-spacing: 4px;
                    color: var(--ob-text);
                    margin-bottom: 8px;
                    text-shadow: 0 4px 10px rgba(245, 158, 11, 0.1);
                }
                .landing-subtitle {
                    font-size: 14px;
                    color: var(--ob-text-muted);
                    font-weight: 600;
                    letter-spacing: 1px;
                }
                .landing-actions {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 0 20px;
                }
                .mobile-btn-elite {
                    width: 100%;
                    padding: 18px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: none;
                    backdrop-filter: blur(10px);
                }
                .mobile-btn-elite.primary {
                    background: linear-gradient(135deg, #7c3aed 0%, #9061f9 100%);
                    color: white;
                    box-shadow: 0 10px 30px -10px rgba(124, 58, 237, 0.6);
                }
                .mobile-btn-elite.primary:active {
                    transform: scale(0.96);
                }
                .mobile-btn-elite.secondary {
                    background: var(--ob-btn-sec-bg);
                    color: var(--ob-text);
                    border: 1px solid var(--ob-border);
                }
                .mobile-btn-elite.secondary:active {
                    background: var(--ob-input-border);
                    transform: scale(0.96);
                }
                .landing-footer {
                    position: absolute;
                    bottom: 20px; /* Pull tighter */
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    align-items: center;
                    opacity: 0.8;
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
