import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateProfile, resetUser } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { IMAGES } from '../config/assetUrls';
import {
    ChevronLeft,
    User,
    ShieldCheck,
    Trash2,
    LogOut,
    GraduationCap,
    Mail,
    Edit3,
    RefreshCw
} from 'lucide-react';
import '../styles/setting.css';

function SettingsView() {
    const user = useSelector((state) => state.user.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [mutating, setMutating] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState(navigator.onLine ? '100% SECURE' : 'OFFLINE (QUEUED)');

    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); setSyncStatus('100% SECURE'); };
        const handleOffline = () => { setIsOnline(false); setSyncStatus('OFFLINE (QUEUED)'); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const [formState, setFormState] = useState({
        nickname: user?.nickname || '',
        grade_level: user?.grade_level || 'Primary 7',
        parent_email: user?.parent_email || '',
        parent_phone: user?.parent_phone || ''
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    const handleLogout = async () => {
        try {
            await syncService.signOut();
            dispatch(resetUser());
            dispatch(addToast({ message: "Identity Decoupled Successfully.", type: "info" }));
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
            dispatch(addToast({ message: "Purge Failed: Contact Council", type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    const shuffleDNA = async () => {
        setMutating(true);
        setSyncStatus('SYNCING...');
        const newSeed = Math.random().toString(36).substring(7);
        const updatedProfile = { ...user, avatarSeed: newSeed };

        try {
            await syncService.uploadProfile(updatedProfile);
            dispatch(updateProfile(updatedProfile));
            dispatch(addToast({ message: "Identity Matrix Scrambled!", type: "info" }));
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (err) {
            dispatch(updateProfile(updatedProfile));
            dispatch(addToast({ message: "Shuffle Queued for Resync", type: "warning" }));
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setTimeout(() => setMutating(false), 600);
        }
    };

    const pickDNA = async (variant) => {
        setMutating(true);
        setSyncStatus('SYNCING...');
        const newSeed = `${user?.avatarSeed}${variant}`;
        const updatedProfile = { ...user, avatarSeed: newSeed };

        try {
            await syncService.uploadProfile(updatedProfile);
            dispatch(updateProfile(updatedProfile));
            dispatch(addToast({ message: `DNA Branch ${variant} Stabilized!`, type: "success" }));
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (err) {
            dispatch(updateProfile(updatedProfile));
            dispatch(addToast({ message: "DNA Setup Queued", type: "warning" }));
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setTimeout(() => setMutating(false), 600);
        }
    };

    const saveHeroChanges = async () => {
        if (formState.parent_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.parent_email)) {
            dispatch(addToast({ message: "CRITICAL: Invalid Guardian Email Format", type: "error" }));
            return;
        }

        setLoading(true);
        setSyncStatus('SYNCING...');
        try {
            const updatedProfile = {
                ...user,
                nickname: formState.nickname,
                grade_level: formState.grade_level,
                parent_email: formState.parent_email,
                parent_phone: formState.parent_phone
            };

            dispatch(updateProfile(updatedProfile));
            await syncService.uploadProfile(updatedProfile);

            setSyncStatus('100% SECURE');
            dispatch(addToast({ message: "Identity DNA Stabilized!", type: "success" }));
            navigate('/profile');
        } catch (err) {
            dispatch(addToast({ message: "Sync Refraction: Changes Queued", type: "warning" }));
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="sett-view"
        >
            {/* 0. DYNAMIC AURORA ENGINE */}
            <div className="aurora-engine">
                <div className="blob aurora-1"></div>
                <div className="blob aurora-2"></div>
            </div>

            {/* 1. ARENA-STYLE HEADER */}
            <div className="rank-arena-header">
                <button className="back-btn-elite" onClick={() => navigate('/profile')}>
                    <ChevronLeft size={24} />
                </button>
                <h2 className="arena-title">Profile Settings</h2>
                <p className="arena-subtitle">Identity DNA & Metadata</p>
            </div>

            {/* 2. USER STATUS BANNER (IDENTITY VAULT) */}
            <motion.div variants={itemVariants} className="league-banner-elite identity-vault-banner">
                <div className="vault-grid">
                    <motion.div
                        whileHover={{ y: -5, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => pickDNA('v1')}
                        className="vault-slot side"
                    >
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed}v1`} alt="DNA 1" />
                        <div className="slot-glow"></div>
                    </motion.div>

                    <div className="vault-slot main">
                        {mutating ? (
                            <div className="w-20 h-20 rounded-2xl border-4 border-dashed border-[#6366F1] animate-spin opacity-50 m-auto" style={{ gridArea: '1/1' }}></div>
                        ) : (
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed || 'Hero'}`} alt="DNA Main" />
                        )}
                        <div className="orb-thor-glow"></div>
                        <div className="active-dna-tag">ACTIVE DNA</div>
                    </div>

                    <motion.div
                        whileHover={{ y: -5, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => pickDNA('v2')}
                        className="vault-slot side"
                    >
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.avatarSeed}v2`} alt="DNA 2" />
                        <div className="slot-glow"></div>
                    </motion.div>
                </div>

                <div className="vault-info">
                    <div className="vault-header-row">
                        <span className="v-title">{user?.nickname || 'Hero Candidate'}</span>
                        <button className="premium-shuffle-btn btn-toy btn-toy-slate" onClick={shuffleDNA}>
                            <div className="btn-toy-gloss" />
                            <RefreshCw size={14} style={{ zIndex: 2 }} />
                            <span>Shuffle DNA</span>
                        </button>
                    </div>
                    <div className="vault-sync-status">
                        <div className={`sync-pulse ${syncStatus === 'SYNCING...' ? 'syncing' : isOnline ? 'active' : 'offline'}`}></div>
                        <span style={{ color: !isOnline ? '#f87171' : syncStatus === 'SYNCING...' ? '#facc15' : '#10b981', fontWeight: 700 }}>
                            Identity Sync: {syncStatus}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* 3. INPUT GROUPS (LEADERBOARD CARD STYLE) */}
            <motion.div variants={itemVariants} className="leaderboard-card-elite settings-main-card">
                <div className="list-header">
                    <span>IDENTITY FIELDS</span>
                    <span>EDIT MODE</span>
                </div>

                <div className="rank-row-elite input-row">
                    <div className="r-avatar input-icon-box" style={{ background: '#EEF2FF', color: '#6366F1' }}>
                        <User size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Hero Nickname</span>
                        <input
                            type="text"
                            className="input-toy premium-glass-input"
                            value={formState.nickname}
                            onChange={e => setFormState(p => ({ ...p, nickname: e.target.value }))}
                            placeholder="Enter Nickname"
                        />
                    </div>
                </div>

                <div className="rank-row-elite input-row">
                    <div className="r-avatar input-icon-box" style={{ background: '#ECFDF5', color: '#10B981' }}>
                        <GraduationCap size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Academic Grade</span>
                        <select
                            className="input-toy premium-glass-select"
                            value={formState.grade_level}
                            onChange={e => setFormState(p => ({ ...p, grade_level: e.target.value }))}
                        >
                            <option value="Primary 5">Primary 5</option>
                            <option value="Primary 6">Primary 6</option>
                            <option value="Primary 7">Primary 7</option>
                        </select>
                    </div>
                </div>

                <div className="rank-row-elite input-row">
                    <div className="r-avatar input-icon-box" style={{ background: '#FFF7ED', color: '#F59E0B' }}>
                        <Mail size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Guardian Contact</span>
                        <input
                            type="email"
                            className="input-toy premium-glass-input"
                            value={formState.parent_email}
                            onChange={e => setFormState(p => ({ ...p, parent_email: e.target.value }))}
                            placeholder="Parent Email"
                        />
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="save-hero-btn btn-toy btn-toy-purple"
                    onClick={saveHeroChanges}
                    disabled={loading}
                >
                    <div className="btn-toy-gloss" />
                    <span>{loading ? "STABILIZING DNA..." : "COMMIT IDENTITY DNA"}</span>
                </motion.button>
            </motion.div>

            {/* 4. DANGER ZONE */}
            <motion.div variants={itemVariants} className="danger-zone-elite-v2">
                <div className="danger-header">SECURITY CLEARANCE & PURGE</div>

                <div className="danger-actions-row">
                    <button className="danger-action-btn btn-toy btn-toy-slate logout" onClick={handleLogout}>
                        <div className="btn-toy-gloss" />
                        <LogOut size={18} style={{ zIndex: 2 }} />
                        <span>Sign Out</span>
                    </button>
                    <button className="danger-action-btn btn-toy btn-toy-crimson delete" onClick={handleDeleteAccount}>
                        <div className="btn-toy-gloss" />
                        <Trash2 size={18} style={{ zIndex: 2 }} />
                        <span>Purge Identity</span>
                    </button>
                </div>
            </motion.div>


        </motion.div>
    );
}

export default SettingsView;
