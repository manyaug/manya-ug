import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { updateProfile } from '../store/userSlice';
import { setVolume, toggleMute } from '../store/audioSlice';
import { Volume2, VolumeX, Headphones } from 'lucide-react';
import '../styles/setting.css';

function SettingsView() {
  const user = useSelector((state) => state.user.data);
  const { volume, isMuted } = useSelector((state) => state.audio);
  const dispatch = useDispatch();
  const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [formState, setFormState] = useState({
        fullName: user?.fullName || '',
        nickname: user?.nickname || '',
        motto: user?.motto || '',
        theme: user?.theme || 'light',
        subject: user?.preferences?.likes?.[0] || 'Mathematics',
        grade_level: user?.grade_level || 'Primary 7',
        parent_email: user?.parent_email || user?.parent?.email || '',
        parent_phone: user?.parent_phone || user?.parent?.whatsapp || ''
    });

    const [selectedSeed, setSelectedSeed] = useState(user?.avatarSeed || 'Hero_1');
    const [labSeeds, setLabSeeds] = useState([]);

    const generateSeeds = () => {
        const base = formState.nickname || "Hero";
        const seeds = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
        setLabSeeds(seeds);
        if (!seeds.includes(selectedSeed)) setSelectedSeed(seeds[0]);
    };

    useEffect(() => {
        generateSeeds();
    }, []);

    const toggleTheme = () => {
        const newTheme = formState.theme === 'dark' ? 'light' : 'dark';
        setFormState(prev => ({ ...prev, theme: newTheme }));
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleLogout = async () => {
        try {
            await syncService.signOut();
            dispatch(addToast({ message: "Identity Decoupled. Goodbye, Hero.", type: "info" }));
            navigate('/login');
        } catch (err) {
            dispatch(addToast({ message: "Logout Failed", type: "error" }));
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("CRITICAL: This will permanently purge your Hero Identity and all progress from the Manya Council. Proceed?")) return;
        
        setLoading(true);
        try {
            await syncService.deleteAccount();
            dispatch(addToast({ message: "Identity Purged.", type: "warning" }));
            navigate('/onboarding');
        } catch (err) {
            dispatch(addToast({ message: "Purge Failed: Contact Council Support", type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    const saveHeroChanges = async () => {
        setLoading(true);
        try {
            const updatedProfile = {
                ...user,
                fullName: formState.fullName,
                nickname: formState.nickname,
                motto: formState.motto,
                theme: formState.theme,
                avatarSeed: selectedSeed,
                grade_level: formState.grade_level,
                parent_email: formState.parent_email,
                parent_phone: formState.parent_phone,
                preferences: { ...user?.preferences, likes: [formState.subject] }
            };

            // 1. Update Redux (triggers local save)
            dispatch(updateProfile(updatedProfile));
            
            // 2. Explicit Cloud Sync
            await syncService.uploadProfile(updatedProfile);

            dispatch(addToast({ message: "Identity Stabilized!", type: "success" }));
            navigate('/profile');
        } catch (err) {
            dispatch(addToast({ message: "Refraction Error: Sync failed", type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page animate-in">
            <div className="lab-header-row">
                <button className="manya-back-btn" onClick={() => navigate('/profile')}>
                    <ChevronLeft size={24} strokeWidth={4} />
                </button>
                <h2 style={{ fontWeight: 900, margin: 0 }}>Hero Lab</h2>
            </div>

            <div className="lab-toggle-pill" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span>{formState.theme === 'dark' ? '🌕' : '🌑'}</span>
                    <span style={{ fontWeight: 900, fontSize: '14px' }}>Night Mode</span>
                </div>
                <div className={`manya-switch ${formState.theme === 'dark' ? 'active' : ''}`}></div>
            </div>

            {/* IDENTITY MATRIX */}
            <div className="identity-matrix-grid">
                <div className="dna-vault">
                    <span className="vault-label">DNA SEQUENCE</span>
                    <div className="lab-grid">
                        {labSeeds.map(seed => (
                            <div key={seed} className={`lab-avatar-item ${selectedSeed === seed ? 'active' : ''}`} onClick={() => setSelectedSeed(seed)}>
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="avatar" />
                            </div>
                        ))}
                    </div>
                    <button className="btn-lab-shuffle" onClick={generateSeeds}>
                        <RefreshCw size={14} /> GENERATE NEW SEQUENCES
                    </button>
                </div>

                <div className="info-fields-stack">
                    <div className="lab-field">
                        <label className="field-label">Student Nickname</label>
                        <input type="text" className="lab-input-elite" value={formState.nickname} onChange={e => setFormState(p => ({...p, nickname: e.target.value}))} />
                    </div>

                    <div className="lab-field">
                        <label className="field-label">Grade Level</label>
                        <select className="lab-input-elite" value={formState.grade_level} onChange={e => setFormState(p => ({...p, grade_level: e.target.value}))}>
                            <option value="Primary 5">Primary 5</option>
                            <option value="Primary 6">Primary 6</option>
                            <option value="Primary 7">Primary 7</option>
                        </select>
                    </div>

                    <div className="lab-field">
                        <label className="field-label">Guardian's Email</label>
                        <input type="email" className="lab-input-elite" value={formState.parent_email} onChange={e => setFormState(p => ({...p, parent_email: e.target.value}))} />
                    </div>

                    <div className="lab-field">
                        <label className="field-label">Guardian's WhatsApp</label>
                        <input type="tel" className="lab-input-elite" value={formState.parent_phone} onChange={e => setFormState(p => ({...p, parent_phone: e.target.value}))} />
                    </div>
                </div>
            </div>

            <button className="btn-commit-identity" onClick={saveHeroChanges} disabled={loading}>
                {loading ? "STABILIZING..." : "Commit Identity"}
            </button>

            <div className="danger-zone">
                <h4 className="section-label" style={{ color: '#EF4444' }}>Security Clearing</h4>
                <div className="service-list-elite">
                    <div className="service-row" onClick={handleLogout}>
                        <div className="service-icon logout">🔓</div>
                        <div className="service-text">
                            <span className="s-title">Sign Out</span>
                            <span className="s-sub">Exit this Identity session</span>
                        </div>
                    </div>
                    <div className="service-row" onClick={handleDeleteAccount}>
                        <div className="service-icon delete">🗑️</div>
                        <div className="service-text">
                            <span className="s-title" style={{ color: '#EF4444' }}>Terminate Identity</span>
                            <span className="s-sub">Permanent account deletion</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsView;
