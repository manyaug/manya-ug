import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { updateProfile, completeOnboarding } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { ChevronRight, ChevronLeft, ShieldCheck, Mail, Lock, User, GraduationCap, Phone, Zap, Globe, Rocket } from 'lucide-react';
import '../styles/onboarding.css';

function OnboardingView() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.user.data);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Premium Profile State
    const [profile, setProfile] = useState({
        nickname: '',
        grade_level: 'Primary 7',
        goal: 'Agg 4-8',
        parent_name: '',
        parent_whatsapp: '',
        parent_pin: '',          // raw 4-digit PIN (only used locally, hashed via RPC before save)
        report_enabled: true,
        avatarSeed: `Hero_${Math.floor(Math.random()*999)}`,
        auth: { email: '', password: '' }
    });

    // Auto-detect logged-in user with unfinished onboarding business
    useEffect(() => {
        if (user) {
            const uid = user.uid || user.id;
            setProfile(p => ({
                ...p,
                nickname: p.nickname || user.nickname || '',
                grade_level: p.grade_level || user.grade_level || 'Primary 7',
                goal: p.goal || user.goal || 'Agg 4-8',
                parent_name: p.parent_name || user.parent_name || '',
                parent_whatsapp: p.parent_whatsapp || user.parent_whatsapp || '',
                // Never pre-fill the raw PIN input from the stored hash
                parent_pin: '',
                report_enabled: p.report_enabled !== undefined ? p.report_enabled : (user.report_enabled !== undefined ? user.report_enabled : true),
                avatarSeed: p.avatarSeed && !p.avatarSeed.startsWith('Hero_') ? p.avatarSeed : (user.avatarSeed || p.avatarSeed),
                uid: uid
            }));
            
            if (uid && !user.onboarded) {
                setStep(5);
            }
        }
    }, [user]);

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
        if (step === 1) {
            // Goal step - no validation needed as it's a select
        }
        
        if (step === 2) {
            if (!profile.nickname || profile.nickname.length < 2) {
                dispatch(addToast({ message: "Names make Heroes! Give us a nickname.", type: "error" }));
                return;
            }
        }

        if (step === 3) {
             // Avatar is always selected by default
        }

        if (step === 4) {
            if (!profile.auth.email || profile.auth.password.length < 6) {
                dispatch(addToast({ message: "Secure your Hero with an email and 6-char password.", type: "error" }));
                return;
            }

            setLoading(true);
            try {
                // 1. Sign Up (Returns user object)
                const user = await syncService.signUp(
                    profile.auth.email, 
                    profile.auth.password,
                    { full_name: profile.nickname, avatar_url: profile.avatarSeed }
                );

                if (!user) throw new Error("Authentication failed");

                // Save auth ID in profile state to use in step 5
                setProfile(p => ({ ...p, uid: user.id }));
                
                // Move to Step 5 (Parent Portal)
                setStep(5);
            } catch (err) {
                dispatch(addToast({ message: `Sign up failed: ${err.message}`, type: "error" }));
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step === 5) {
            // Parent Portal Step
            // Validate: if parent_whatsapp is provided, require PIN and name
            if (profile.parent_whatsapp) {
                if (!profile.parent_name) {
                    dispatch(addToast({ message: "Please provide a Guardian Name for WhatsApp updates.", type: "error" }));
                    return;
                }
                if (!profile.parent_pin || profile.parent_pin.length !== 4 || isNaN(Number(profile.parent_pin))) {
                    dispatch(addToast({ message: "Please establish a 4-digit Parent Security PIN.", type: "error" }));
                    return;
                }
            }

            setLoading(true);
            try {
                const userId = profile.uid;

                // If a PIN was set, hash it server-side via RPC before uploading profile.
                // We never store raw PIN digits — the RPC calls crypt(pin, gen_salt('bf')).
                if (profile.parent_pin) {
                    const { error: pinError } = await syncService.callRpc?.('set_parent_pin', {
                        p_user_id: userId,
                        p_pin: profile.parent_pin
                    }) || await (async () => {
                        const { supabase } = await import('../infrastructure/remote/supabaseClient.js');
                        return supabase.rpc('set_parent_pin', { p_user_id: userId, p_pin: profile.parent_pin });
                    })();
                    if (pinError) throw new Error(`PIN setup failed: ${pinError.message}`);
                }

                // Upload profile (without raw PIN — it was hashed above)
                const { parent_pin, ...profileToUpload } = profile;
                await syncService.uploadProfile({
                    ...profileToUpload,
                    parent_pin_hash: profile.parent_pin ? '__hashed__' : '',
                    onboarded: true
                }, userId);

                dispatch(updateProfile({ 
                    ...profileToUpload, 
                    uid: userId,
                    parent_pin_hash: profile.parent_pin ? '__hashed__' : '',
                    onboarded: true
                }));
                dispatch(completeOnboarding());

                dispatch(addToast({ message: `Welcome aboard, ${profile.nickname}!`, type: "success" }));
                navigate('/home');
            } catch (err) {
                dispatch(addToast({ message: `Profile save failed: ${err.message}`, type: "error" }));
            } finally {
                setLoading(false);
            }
            return;
        }

        setStep(step + 1);
    };

    const renderStep = () => {
        switch(step) {
            case 1: 
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Rocket size={32} /></div>
                        <h3>Set Your Target</h3>
                        <p>We'll tailor your quests to help you reach your academic goals.</p>
                        
                        <div className="ob-select-group">
                            <label><Zap size={14} /> ACADEMIC GOAL</label>
                            <select 
                                className="premium-ob-select"
                                value={profile.goal}
                                onChange={e => setProfile(p => ({ ...p, goal: e.target.value }))}
                            >
                                <option value="Grade 1 (Top Score)">Grade 1 (Top Score)</option>
                                <option value="Grade 2 (Great Score)">Grade 2 (Great Score)</option>
                                <option value="Grade 3+ (Steady Progress)">Grade 3+ (Steady Progress)</option>
                            </select>
                        </div>

                        <div className="ob-select-group">
                            <label><GraduationCap size={14} /> GRADE LEVEL</label>
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
            case 2:
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><User size={28} /></div>
                        <h3>Identity</h3>
                        <p>What should we call you in the Manya World?</p>
                        
                        <div className="input-with-icon">
                            <User className="i-icon" size={18} />
                            <input 
                                type="text" 
                                placeholder="Your Nickname" 
                                value={profile.nickname} 
                                onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))} 
                                autoFocus 
                            />
                        </div>
                        <p className="helper-text">This will be your name on the Leaderboards!</p>
                    </div>
                );
            case 3:
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Zap size={28} /></div>
                        <h3>Hero Appearance</h3>
                        <p>Select an avatar for your Manya ID.</p>
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
            case 4:
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Lock size={28} /></div>
                        <h3>Secure Your Progress</h3>
                        <p>Create an account to save your achievements and sync across devices.</p>
                        <div className="input-with-icon">
                            <Mail className="i-icon" size={18} />
                            <input 
                                type="email" 
                                placeholder="Your Email" 
                                value={profile.auth.email} 
                                onChange={e => setProfile(p => ({ ...p, auth: { ...p.auth, email: e.target.value } }))} 
                            />
                        </div>
                        <div className="input-with-icon">
                            <Lock className="i-icon" size={18} />
                            <input 
                                type="password" 
                                placeholder="Password (6+ chars)" 
                                value={profile.auth.password} 
                                onChange={e => setProfile(p => ({ ...p, auth: { ...p.auth, password: e.target.value } }))} 
                            />
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Phone size={28} /></div>
                        <h3>Parent Progress Portal</h3>
                        <p>Link a parent's WhatsApp to send weekly progress reports and study tips.</p>
                        
                        <div className="input-with-icon">
                            <User className="i-icon" size={18} />
                            <input 
                                type="text" 
                                placeholder="Parent / Guardian Name" 
                                value={profile.parent_name} 
                                onChange={e => setProfile(p => ({ ...p, parent_name: e.target.value }))} 
                            />
                        </div>
                        <div className="input-with-icon" style={{ marginTop: '12px' }}>
                            <Phone className="i-icon" size={18} />
                            <input 
                                type="tel" 
                                placeholder="Parent WhatsApp (e.g. +256700000000)" 
                                value={profile.parent_whatsapp} 
                                onChange={e => setProfile(p => ({ ...p, parent_whatsapp: e.target.value }))} 
                            />
                        </div>
                        <div className="input-with-icon" style={{ marginTop: '12px' }}>
                            <Lock className="i-icon" size={18} />
                            <input 
                                type="password" 
                                maxLength={4}
                                placeholder="4-Digit Parent Security PIN" 
                                value={profile.parent_pin} 
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setProfile(p => ({ ...p, parent_pin: val }));
                                }} 
                            />
                        </div>
                        
                        {profile.parent_whatsapp && (
                            <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-left text-[11px] text-amber-700 dark:text-amber-300">
                                <b>⚠️ OPT-IN REQUIRED:</b> Parents must send your Twilio sandbox keyword (e.g. <code>join manya-ug</code>) to <b>+1 734 349 3088</b> on WhatsApp to activate updates.
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="premium-ob-shell" data-theme="light">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container">
                <div className="ob-top-nav">
                    {step > 1 && !profile.uid ? (
                        <button className="ob-back-btn" onClick={() => setStep(step-1)}>
                            <ChevronLeft size={24} />
                        </button>
                    ) : (
                        <div style={{ width: 44 }}></div> // Placeholder for symmetry
                    )}
                    <div className="ob-logo-area">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" />
                    </div>
                    <div className="ob-login-link">
                         <Link to="/login">Sign In</Link>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="ob-progress-track">
                    <div className="ob-progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
                </div>

                <div className="ob-main-card">
                    <div className="ob-view-portal" style={{ width: '100%' }}>
                        {renderStep()}
                    </div>
                </div>

                <footer className="ob-footer-actions">
                    <button 
                        className={`ob-next-btn ${loading ? 'loading' : ''}`} 
                        onClick={handleNext}
                        disabled={loading}
                    >
                        {loading ? "PREPARING..." : step === 5 ? "BEGIN JOURNEY →" : "CONTINUE →"}
                    </button>
                    
                    <div className="security-badge">
                        <ShieldCheck size={12} /> SECURE IDENTITY VAULT
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default OnboardingView;
