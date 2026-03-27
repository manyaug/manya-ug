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

                // 2. SYNC PROFILE EXTRA DATA (CRITICAL FIX: Passing manualUid)
                await syncService.uploadProfile({
                    ...profile,
                    parent_email: profile.parent.email,
                    parent_phone: profile.parent.whatsapp
                }, data.user.id);

                // 3. UPDATE LOCAL STATE
                dispatch(updateProfile({ 
                    ...profile, 
                    onboarded: true,
                    parent_email: profile.parent.email,
                    parent_phone: profile.parent.whatsapp
                }));
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
            case 1: // Identity & Level
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><ShieldCheck size={44} /></div>
                        <h3>Identity Initialization</h3>
                        <p>Welcome to the Manya Council. What name shall be etched in our archives?</p>
                        
                        <div className="input-with-icon">
                            <User className="i-icon" size={20} />
                            <input 
                                type="text" 
                                placeholder="Enter Hero Nickname" 
                                value={profile.nickname} 
                                onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))} 
                                autoFocus 
                            />
                        </div>

                        <div className="ob-select-group">
                            <label><GraduationCap size={16} /> Current Academic Sector</label>
                            <select 
                                className="premium-ob-select"
                                value={profile.grade_level}
                                onChange={e => setProfile(p => ({ ...p, grade_level: e.target.value }))}
                            >
                                <option value="Primary 5">Sector Primary 5</option>
                                <option value="Primary 6">Sector Primary 6</option>
                                <option value="Primary 7">Sector Primary 7</option>
                            </select>
                        </div>
                    </div>
                );
            case 2: // Guardian (Reports)
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Mail size={40} /></div>
                        <h3>The Guardian Shield</h3>
                        <p>Link your Mentor's contact for safety and academic strategy reports.</p>
                        <div className="input-with-icon">
                            <Mail className="i-icon" size={18} />
                            <input 
                                type="email" 
                                placeholder="Mentor's Email Address" 
                                value={profile.parent.email} 
                                onChange={e => setProfile(p => ({ ...p, parent: { ...p.parent, email: e.target.value } }))} 
                            />
                        </div>
                        <div className="input-with-icon">
                            <Phone className="i-icon" size={18} />
                            <input 
                                type="tel" 
                                placeholder="WhatsApp (for alerts)" 
                                value={profile.parent.whatsapp} 
                                onChange={e => setProfile(p => ({ ...p, parent: { ...p.parent, whatsapp: e.target.value } }))} 
                            />
                        </div>
                    </div>
                );
            case 3: // Avatar (DNA Sequence)
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Zap size={40} /></div>
                        <h3>Visual Identity DNA</h3>
                        <p>Construct your physical avatar through DiceBear sequences.</p>
                        <div className="lab-grid-ob">
                            {avatarOptions.map(seed => (
                                <div key={seed} className={`lab-item-ob ${profile.avatarSeed === seed ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, avatarSeed: seed }))}>
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="DNA Sequence" />
                                </div>
                            ))}
                        </div>
                        <button className="btn-lab-shuffle" onClick={() => generateSeeds(profile.nickname)}>
                            🔄 SHUFFLE DNA SEQUENCES
                        </button>
                    </div>
                );
            case 4: // Auth (Security Vault)
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Lock size={40} /></div>
                        <h3>Secure the Vault</h3>
                        <p>Establish your secret encrypted access credentials.</p>
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
                                placeholder="Create Access PIN" 
                                value={profile.auth.password} 
                                onChange={e => setProfile(p => ({ ...p, auth: { ...p.auth, password: e.target.value } }))} 
                            />
                        </div>
                        <p className="terms-notice">Access PIN must be at least 6 characters.</p>
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
                    {step > 1 ? (
                        <button className="ob-back-btn" onClick={() => setStep(step-1)}>
                            <ChevronLeft size={24} />
                        </button>
                    ) : (
                        <div style={{ width: 44 }}></div> // Placeholder for symmetry
                    )}
                    <div className="ob-logo-area">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya Council" />
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

                    <div className="ob-view-portal" style={{ width: '100%' }}>
                        {renderStep()}
                    </div>
                </div>

                <div className="ob-footer-actions">
                    <button 
                        className={`ob-next-btn ${loading ? 'loading' : ''}`} 
                        onClick={handleNext}
                        disabled={loading}
                    >
                        {loading ? "INITIALIZING DNA..." : step === 4 ? "COMPLETE INITIALIZATION →" : "CONTINUE PATH →"}
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '20px', opacity: 0.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 900 }}>
                            <ShieldCheck size={12} /> SECURE VAULT
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 900 }}>
                            <Globe size={12} /> UGANDA SECTOR
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OnboardingView;
