import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProfile, resetUser } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../services/syncService';
import { setVolume, toggleMute } from '../store/audioSlice';
import { Volume2, VolumeX, Headphones, ChevronLeft, RefreshCw, LogOut, Trash2, ShieldCheck, User, Zap } from 'lucide-react';
import '../styles/setting.css';

function SettingsView() {
    const user = useSelector((state) => state.user.data);
    const { volume, isMuted } = useSelector((state) => state.audio);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [formState, setFormState] = useState({
        nickname: user?.nickname || '',
        grade_level: user?.grade_level || 'Primary 7',
        parent_email: user?.parent_email || '',
        parent_phone: user?.parent_phone || ''
    });

    const [selectedSeed, setSelectedSeed] = useState(user?.avatarSeed || 'Hero_1');
    const [labSeeds, setLabSeeds] = useState([]);

    const generateSeeds = () => {
        const base = formState.nickname || "Hero";
        const seeds = Array.from({length: 3}, () => `${base}_${Math.floor(Math.random()*99999)}`);
        setLabSeeds(seeds);
        if (!seeds.includes(selectedSeed)) setSelectedSeed(seeds[0]);
    };

    useEffect(() => {
        generateSeeds();
    }, []);

    const toggleTheme = () => {
        const newTheme = user?.theme === 'dark' ? 'light' : 'dark';
        dispatch(updateProfile({ ...user, theme: newTheme }));
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const handleLogout = async () => {
        try {
            await syncService.signOut();
            dispatch(resetUser());
            dispatch(addToast({ message: "Identity Decoupled. Returning to Earth.", type: "info" }));
            navigate('/');
        } catch (err) {
            dispatch(addToast({ message: "Logout Failed", type: "error" }));
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("CRITICAL: Permanent Identity Purge. All progress will be lost. Continue?")) return;
        
        setLoading(true);
        try {
            await syncService.deleteAccount();
            dispatch(resetUser());
            dispatch(addToast({ message: "Identity Purged.", type: "warning" }));
            navigate('/');
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
                nickname: formState.nickname,
                avatarSeed: selectedSeed,
                grade_level: formState.grade_level,
                parent_email: formState.parent_email,
                parent_phone: formState.parent_phone
            };

            dispatch(updateProfile(updatedProfile));
            await syncService.uploadProfile(updatedProfile);

            dispatch(addToast({ message: "Identity Stabilized!", type: "success" }));
            navigate('/profile');
        } catch (err) {
            dispatch(addToast({ message: "Sync Refraction Error", type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="premium-ob-shell">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container settings-container">
                <div className="ob-top-nav">
                    <button className="ob-back-btn" onClick={() => navigate('/profile')}>
                        <ChevronLeft size={24} />
                    </button>
                    <div className="ob-logo-area">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" />
                    </div>
                </div>

                <div className="ob-main-card lab-card">
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><Zap size={40} /></div>
                        <h3>Hero Lab</h3>
                        <p>Adjust your Identity DNA and Security clearing.</p>

                        <div className="lab-section">
                            <span className="vault-label">DNA SEQUENCE</span>
                            <div className="lab-grid-ob">
                                {labSeeds.map(seed => (
                                    <div key={seed} className={`lab-item-ob ${selectedSeed === seed ? 'active' : ''}`} onClick={() => setSelectedSeed(seed)}>
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="avatar" />
                                    </div>
                                ))}
                            </div>
                            <button className="btn-lab-shuffle" onClick={generateSeeds}>
                                <RefreshCw size={14} /> NEW SEQUENCES
                            </button>
                        </div>

                        <div className="info-fields-stack">
                            <div className="input-with-icon">
                                <User className="i-icon" size={18} />
                                <input type="text" placeholder="Nickname" value={formState.nickname} onChange={e => setFormState(p => ({...p, nickname: e.target.value}))} />
                            </div>

                            <select className="premium-ob-select" value={formState.grade_level} onChange={e => setFormState(p => ({...p, grade_level: e.target.value}))}>
                                <option value="Primary 5">Primary 5</option>
                                <option value="Primary 6">Primary 6</option>
                                <option value="Primary 7">Primary 7</option>
                            </select>

                            <div className="input-with-icon" style={{ marginTop: '10px' }}>
                                <ShieldCheck className="i-icon" size={18} />
                                <input type="email" placeholder="Guardian Email" value={formState.parent_email} onChange={e => setFormState(p => ({...p, parent_email: e.target.value}))} />
                            </div>
                        </div>

                        <button className="ob-next-btn" style={{ marginTop: '20px' }} onClick={saveHeroChanges} disabled={loading}>
                            {loading ? "STABILIZING..." : "COMMIT IDENTITY"}
                        </button>

                        <div className="danger-zone-elite">
                            <div className="danger-row" onClick={handleLogout}>
                                <LogOut size={18} />
                                <span>Sign Out Session</span>
                            </div>
                            <div className="danger-row delete" onClick={handleDeleteAccount}>
                                <Trash2 size={18} />
                                <span>Terminate Identity</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsView;
