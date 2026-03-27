import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { updateProfile, completeOnboarding } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../services/syncService';
import { ChevronRight, ChevronLeft, ShieldCheck, Mail, Lock, User, GraduationCap, Phone } from 'lucide-react';
import '../styles/onboarding.css';

function OnboardingView() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Premium Profile State
    const [profile, setProfile] = useState({
        nickname: '',
        grade_level: 'Primary 7',
        goal: 'Agg 4-8',
        parent: { name: '', whatsapp: '', email: '' },
        avatarSeed: `Hero_${Math.floor(Math.random()*999)}`,
        auth: { email: '', password: '' }
    });

    const [avatarOptions, setAvatarOptions] = useState([]);

    const generateSeeds = (baseName) => {
        const base = baseName || "Hero";
        const seeds = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
        setAvatarOptions(seeds);
        setProfile(p => ({ ...p, avatarSeed: seeds[0] }));
    };

    useEffect(() => {
        if (step === 3 && avatarOptions.length === 0) {
            generateSeeds(profile.nickname);
        }
    }, [step, profile.nickname, avatarOptions.length]);

    const handleNext = async () => {
        // Validation Logic
        if (step === 1) {
            if (!profile.nickname || profile.nickname.length < 2) {
                dispatch(addToast({ message: "Names make Heroes! Give us a nickname.", type: "error" }));
                return;
            }
        }
        
        if (step === 2) {
             if (!profile.parent.email || !profile.parent.whatsapp) {
                dispatch(addToast({ message: "Guardian details are required for security.", type: "error" }));
                return;
            }
        }

        if (step === 4) {
            if (!profile.auth.email || profile.auth.password.length < 6) {
                dispatch(addToast({ message: "Secure your Hero with an email and 6-char password.", type: "error" }));
                return;
            }

            setLoading(true);
            dispatch(addToast({ message: "Forging your Identity in the Council Database...", type: "info" }));
            
            try {
                // 1. SIGN UP TO SUPABASE
                const { data, error } = await syncService.signUp(
                    profile.auth.email, 
                    profile.auth.password,
                    { full_name: profile.nickname, avatar_url: profile.avatarSeed }
                );

                if (error) throw error;

                // 2. SYNC PROFILE EXTRA DATA
                await syncService.uploadProfile({
                    ...profile,
                    uid: data.user.id
                });

                // 3. UPDATE LOCAL STATE
                dispatch(updateProfile({ ...profile, onboarded: true }));
                dispatch(completeOnboarding());

                dispatch(addToast({ message: "Welcome to Manya, Hero!", type: "success" }));
                navigate('/home');

            } catch (err) {
                dispatch(addToast({ message: `Forging Failed: ${err.message}`, type: "error" }));
            } finally {
                setLoading(false);
            }
            return;
        }

        setStep(step + 1);
    };

    const renderStep = () => {
        switch(step) {
            case 1: // Identity
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><User size={40} /></div>
                        <h3>Every Hero needs a Name</h3>
                        <p>What shall we call you on the World Stage?</p>
                        <input 
                            type="text" 
                            className="premium-ob-input" 
                            placeholder="Hero Nickname" 
                            value={profile.nickname} 
                            onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))} 
                            autoFocus 
                        />
                        
                        <div className="ob-select-group">
                            <label><GraduationCap size={16} /> Select your Current Level</label>
                            <select 
                                className="premium-ob-select"
                                value={profile.grade_level}
                                onChange={e => setProfile(p => ({ ...p, grade_level: e.target.value }))}
                            >
                                <option value="Primary 5">Primary 5</option>
                                <option value="Primary 6">Primary 6</option>
                                <option value="Primary 7">Primary 7</option>
                            </select>
                        </div>
                    </div>
                );
            case 2: // Guardian
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><ShieldCheck size={40} /></div>
                        <h3>Secure your Account</h3>
                        <p>We need your Guardian's contact for safety and reports.</p>
                        <div className="input-with-icon">
                            <Mail className="i-icon" size={18} />
                            <input 
                                type="email" 
                                placeholder="Guardian Email" 
                                value={profile.parent.email} 
                                onChange={e => setProfile(p => ({ ...p, parent: { ...p.parent, email: e.target.value } }))} 
                            />
                        </div>
                        <div className="input-with-icon">
                            <Phone className="i-icon" size={18} />
                            <input 
                                type="tel" 
                                placeholder="WhatsApp Number" 
                                value={profile.parent.whatsapp} 
                                onChange={e => setProfile(p => ({ ...p, parent: { ...p.parent, whatsapp: e.target.value } }))} 
                            />
                        </div>
                    </div>
                );
            case 3: // Avatar (DNA)
                return (
                    <div className="ob-step-content animate-in">
                        <h3>Hero DNA Sequence</h3>
                        <p>Select your visual identity. You can shuffle these anytime.</p>
                        <div className="lab-grid-ob">
                            {avatarOptions.map(seed => (
                                <div key={seed} className={`lab-item-ob ${profile.avatarSeed === seed ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, avatarSeed: seed }))}>
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="Avatar" />
                                </div>
                            ))}
                        </div>
                        <button className="btn-lab-shuffle" onClick={() => generateSeeds(profile.nickname)}>
                            🔄 SHUFFLE DNA
                        </button>
                    </div>
                );
            case 4: // Auth
                return (
                    <div className="ob-step-content animate-in">
                        <h3>Secure the Vault</h3>
                        <p>Final step: Set up your secret access credentials.</p>
                        <div className="input-with-icon">
                            <Mail className="i-icon" size={18} />
                            <input 
                                type="email" 
                                placeholder="My Educational Email" 
                                value={profile.auth.email} 
                                onChange={e => setProfile(p => ({ ...p, auth: { ...p.auth, email: e.target.value } }))} 
                            />
                        </div>
                        <div className="input-with-icon">
                            <Lock className="i-icon" size={18} />
                            <input 
                                type="password" 
                                placeholder="Create Secret Password" 
                                value={profile.auth.password} 
                                onChange={e => setProfile(p => ({ ...p, auth: { ...p.auth, password: e.target.value } }))} 
                            />
                        </div>
                        <div className="auth-helper">Min 6 characters. Use something memorable!</div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="premium-ob-shell">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container">
                <div className="ob-top-nav">
                    {step > 1 && (
                        <button className="ob-back-btn" onClick={() => setStep(step-1)}>
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div className="ob-logo-area">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" />
                    </div>
                    <div className="ob-login-link">
                         <Link to="/login">Sign In</Link>
                    </div>
                </div>

                <div className="ob-main-card">
                    <div className="ob-progress-dots">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`dot ${step >= i ? 'active' : ''}`}></div>
                        ))}
                    </div>

                    <div className="ob-view-portal">
                        {renderStep()}
                    </div>
                </div>

                <div className="ob-footer-actions">
                    <button 
                        className={`ob-next-btn ${loading ? 'loading' : ''}`} 
                        onClick={handleNext}
                        disabled={loading}
                    >
                        {loading ? "COMMITTING..." : step === 4 ? "INITIALIZE HERO →" : "CONTINUE PATH →"}
                    </button>
                    {step === 4 && <p className="terms-notice">By initializing, you agree to the Manya Scholar Protocol.</p>}
                </div>
            </div>
        </div>
    );
}

export default OnboardingView;
