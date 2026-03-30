import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from '../store/userSlice';
import { setVolume, toggleMute as toggleAudioMute } from '../store/audioSlice';
import { syncService } from '../services/syncService';
import { addToast } from '../store/toastSlice';
import { IMAGES } from '../config/assetUrls';
import { 
    ChevronLeft, 
    Moon, 
    Sun, 
    Volume2, 
    VolumeX, 
    RefreshCw, 
    ShieldCheck, 
    Sliders,
    Zap,
    Cloud
} from 'lucide-react';
import '../styles/preferences.css';

function PreferencesView() {
    const user = useSelector((state) => state.user.data);
    const { volume, isMuted } = useSelector((state) => state.audio);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState(navigator.onLine ? '100% SECURE' : 'OFFLINE (QUEUED)');
    const [resetConfirmMode, setResetConfirmMode] = useState(false);

    // ── NETWORK HOOK ──────────────────────────────────────────────────────────
    useState(() => {
        const handleOnline = () => { setIsOnline(true); setSyncStatus('100% SECURE'); };
        const handleOffline = () => { setIsOnline(false); setSyncStatus('OFFLINE (QUEUED)'); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // ── PREFERENCES MAP ───────────────────────────────────────────────────────
    const prefs = user?.preferences || {};
    const notifsEnabled = prefs.notifications !== false; // Default true
    const hapticsEnabled = prefs.haptics !== false;      // Default true
    const reducedMotion = prefs.reducedMotion === true;  // Default false
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    const toggleTheme = async () => {
        setIsSyncing(true);
        setSyncStatus('SYNCING...');
        const newTheme = user?.theme === 'dark' ? 'light' : 'dark';
        const updatedProfile = { ...user, theme: newTheme };
        
        dispatch(updateProfile(updatedProfile));
        document.documentElement.setAttribute('data-theme', newTheme);

        try {
            await syncService.uploadProfile(updatedProfile);
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (err) {
            setSyncStatus('OFFLINE (QUEUED)');
            console.warn("Theme sync deferred");
        } finally {
            setTimeout(() => setIsSyncing(false), 500);
        }
    };

    const togglePref = async (key, currentValue) => {
        setIsSyncing(true);
        setSyncStatus('SYNCING...');
        const updatedPrefs = { ...prefs, [key]: !currentValue };
        const updatedProfile = { ...user, preferences: updatedPrefs };
        
        dispatch(updateProfile(updatedProfile));

        // Attempt physical haptic feedback test if enabled
        if (key === 'haptics' && !currentValue && window.navigator.vibrate) {
            window.navigator.vibrate(50);
        }

        try {
            await syncService.uploadProfile(updatedProfile);
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (err) {
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setTimeout(() => setIsSyncing(false), 500);
        }
    };

    const saveVolumePref = async (newVol) => {
        setSyncStatus('SYNCING...');
        const updatedPrefs = { ...prefs, master_volume: newVol };
        const updatedProfile = { ...user, preferences: updatedPrefs };
        dispatch(updateProfile(updatedProfile));
        try {
            await syncService.uploadProfile(updatedProfile);
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch(e) {
            setSyncStatus('OFFLINE (QUEUED)');
        }
    };

    const triggerManualSync = async () => {
        setIsSyncing(true);
        setSyncStatus('SYNCING...');
        try {
            await syncService.processSyncQueue();
            dispatch(addToast({ message: "Cloud Identity Synchronized", type: "success" }));
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (err) {
            dispatch(addToast({ message: "Sync Error", type: "error" }));
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pref-view"
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
                <h2 className="arena-title">System Preferences</h2>
                <p className="arena-subtitle">Environmental Tuning & Sync</p>
            </div>

            {/* 2. PRESTIGE STATUS BANNER */}
            <motion.div variants={itemVariants} className="league-banner-elite status-banner">
                <div className="league-medal-orb status-orb">
                    <ShieldCheck size={32} style={{ color: '#7c3aed', filter: 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.5))' }} />
                    <div className="orb-thor-glow"></div>
                </div>
                <div className="league-content">
                    <div className="league-name-row">
                        <span className="l-title">Identity State</span>
                        <span className="l-timer" style={{ 
                            background: !isOnline ? '#fee2e2' : syncStatus === 'SYNCING...' ? '#fef9c3' : 'rgba(124, 58, 237, 0.1)', 
                            color: !isOnline ? '#ef4444' : syncStatus === 'SYNCING...' ? '#ca8a04' : '#7c3aed', 
                            border: `1px solid ${!isOnline ? '#fca5a5' : syncStatus === 'SYNCING...' ? '#fde047' : 'rgba(124, 58, 237, 0.2)'}` 
                        }}>
                            {syncStatus}
                        </span>
                    </div>
                    <div className="league-promo-track">
                        {syncStatus === 'SYNCING...' ? (
                            <div className="promo-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #facc15, #fef08a)' }}></div>
                        ) : (
                            <div className="promo-fill" style={{ width: '100%', background: !isOnline ? '#ef4444' : 'linear-gradient(90deg, #7c3aed, #a78bfa)' }}></div>
                        )}
                    </div>
                    <div className="league-status-msg">All changes are synced to the <b>Cloud Council</b>.</div>
                </div>
            </motion.div>

            {/* 3. SETTINGS GROUP (LEADERBOARD CARD STYLE) */}
            <motion.div variants={itemVariants} className="leaderboard-card-elite prefs-main-card">
                <div className="list-header">
                    <span>INTERFACE & AUDIO</span>
                    <span>CONTROL</span>
                </div>

                {/* NIGHT MODE ROW */}
                <div className="rank-row-elite pref-row" onClick={toggleTheme}>
                    <div className="r-avatar pref-avatar" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                        {user?.theme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}
                        <div className="icon-thor-halo"></div>
                    </div>
                    <div className="r-info">
                        <span className="r-name">Night Mode</span>
                        <span className="r-xp">High-contrast visuals</span>
                    </div>
                    <div className="r-stat">
                        <div className={`theme-toggle-elite ${user?.theme === 'dark' ? 'active' : ''}`}>
                            <div className="toggle-thumb">{user?.theme === 'dark' ? '🌙' : '☀️'}</div>
                        </div>
                    </div>
                </div>

                {/* VOLUME CONTROLLER */}
                <div className="rank-row-elite pref-row no-interact">
                    <div className="r-avatar pref-avatar" style={{ background: '#FFF1F2', color: '#E11D48' }}>
                        <Zap size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Master Energy</span>
                        <span className="r-xp nowrap">Main audio level</span>
                    </div>
                    <div className="r-stat volume-stat">
                        <div className="slider-wrapper-elite">
                            <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={volume} 
                                onChange={(e) => dispatch(setVolume(parseFloat(e.target.value)))}
                                onMouseUp={() => saveVolumePref(volume)}
                                onTouchEnd={() => saveVolumePref(volume)}
                                className="manya-range-elite"
                                style={{ '--progress': `${volume * 100}%` }}
                            />
                            <button 
                                className={`vol-mute-trigger ${isMuted ? 'muted' : ''}`}
                                onClick={() => {
                                    dispatch(toggleAudioMute());
                                    saveVolumePref(isMuted ? 1 : 0); // rough approximation logic
                                }}
                            >
                                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* NOTIFICATIONS PULSE */}
                <div className="rank-row-elite pref-row" onClick={() => togglePref('notifications', notifsEnabled)}>
                    <div className="r-avatar pref-avatar" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                        <Sliders size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Notification Pulse</span>
                        <span className="r-xp nowrap">Real-time alerts</span>
                    </div>
                    <div className="r-stat">
                        <div className="premium-toggle-wrapper">
                            <input type="checkbox" readOnly checked={notifsEnabled} className="premium-toggle-input" />
                            <label className="premium-toggle-label">
                                <span className="toggle-inner"></span>
                                <span className="toggle-switch"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* ADAPTIVE HAPTICS */}
                <div className="rank-row-elite pref-row" onClick={() => togglePref('haptics', hapticsEnabled)}>
                    <div className="r-avatar pref-avatar" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                        <Zap size={22} style={{ fill: hapticsEnabled ? '#16A34A' : 'none' }} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Adaptive Haptics</span>
                        <span className="r-xp nowrap">Device vibrations</span>
                    </div>
                    <div className="r-stat">
                        <div className="premium-toggle-wrapper">
                            <input type="checkbox" readOnly checked={hapticsEnabled} className="premium-toggle-input" />
                            <label className="premium-toggle-label">
                                <span className="toggle-inner"></span>
                                <span className="toggle-switch"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* REDUCED MOTION (FOCUS MODE) */}
                <div className="rank-row-elite pref-row" onClick={() => togglePref('reducedMotion', reducedMotion)}>
                    <div className="r-avatar pref-avatar" style={{ background: '#F8FAFC', color: '#475569' }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Focus Mode</span>
                        <span className="r-xp nowrap">Reduced visual motion</span>
                    </div>
                    <div className="r-stat">
                        <div className="premium-toggle-wrapper">
                            <input type="checkbox" readOnly checked={reducedMotion} className="premium-toggle-input" />
                            <label className="premium-toggle-label">
                                <span className="toggle-inner"></span>
                                <span className="toggle-switch"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* CLOUD PULSE SYNC */}
                <div className="rank-row-elite pref-row" onClick={triggerManualSync}>
                    <div className="r-avatar pref-avatar" style={{ background: '#ECFDF5', color: '#059669' }}>
                        <Cloud size={22} />
                    </div>
                    <div className="r-info">
                        <span className="r-name">Cloud Pulse Sync</span>
                        <span className="r-xp">Push local data</span>
                    </div>
                    <div className="r-stat">
                        <motion.div 
                            animate={isSyncing ? { rotate: 360 } : {}}
                            transition={isSyncing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
                            className="sync-action-icon"
                        >
                            <RefreshCw size={20} color={isSyncing ? '#059669' : 'var(--text-secondary)'} />
                        </motion.div>
                    </div>
                </div>

                {/* RESET PORTAL (Action) */}
                <div className="rank-row-elite pref-row" onClick={() => {
                    if (!resetConfirmMode) {
                        setResetConfirmMode(true);
                        dispatch(addToast({ message: "Tap again to CONFIRM CACHE PURGE", type: "warning" }));
                        setTimeout(() => setResetConfirmMode(false), 4000);
                    } else {
                        window.location.reload();
                    }
                }}>
                    <div className="r-avatar pref-avatar" style={{ background: resetConfirmMode ? '#FEF2F2' : '#FFF7ED', color: resetConfirmMode ? '#EF4444' : '#F59E0B' }}>
                        <RefreshCw size={22} className={resetConfirmMode ? "animate-spin" : ""} />
                    </div>
                    <div className="r-info">
                        <span className="r-name" style={{ color: resetConfirmMode ? '#EF4444' : '' }}>Reset Learning Portal</span>
                        <span className="r-xp">{resetConfirmMode ? 'Tap to confirm purge!' : 'Clear portal cache'}</span>
                    </div>
                    <div className="r-stat">
                        <Zap size={18} color={resetConfirmMode ? '#EF4444' : '#F59E0B'} />
                    </div>
                </div>
            </motion.div>

            <div className="rank-footer">
                <img src={IMAGES.manya_icon} alt="Manya Council" />
                <p>Manya System Preferences v50.0</p>
            </div>
        </motion.div>
    );
}

export default PreferencesView;
