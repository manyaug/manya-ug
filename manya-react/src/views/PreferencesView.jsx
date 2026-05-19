import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProfile, syncUserData } from '../store/userSlice';
import { setVolume, toggleMute as toggleAudioMute, setRainy } from '../store/audioSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { audioService } from '../infrastructure/audio/audioService.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
import { addToast } from '../store/toastSlice';
import { 
    ChevronLeft, 
    Moon, 
    Sun, 
    Volume2, 
    VolumeX, 
    RefreshCw, 
    Zap, 
    Bell, 
    Database,
    CloudRain,
    Sparkles
} from 'lucide-react';
import '../styles/preferences.css';

function PreferencesView() {
    const user = useSelector((state) => state.user.data);
    const { volume, isMuted, isRainy } = useSelector((state) => state.audio);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [isSyncing, setIsSyncing] = useState(false);
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

    const currentTheme = user?.theme || 'dark';
    const pulseEnabled = user?.pulseEnabled !== false; // Default true

    const toggleTheme = (e) => {
        if (e) e.stopPropagation();
        audioService.tap();
        const next = currentTheme === 'dark' ? 'light' : 'dark';
        const updated = { ...user, theme: next };
        dispatch(updateProfile(updated));
        document.documentElement.setAttribute('data-theme', next);
        dispatch(syncUserData());
    };

    const togglePulse = (e) => {
        if (e) e.stopPropagation();
        audioService.tap();
        const updated = { ...user, pulseEnabled: !pulseEnabled };
        dispatch(updateProfile(updated));
        dispatch(syncUserData());
    };

    const toggleRain = (e) => {
        if (e) e.stopPropagation();
        audioService.tap();
        dispatch(setRainy(!isRainy));
    };

    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        dispatch(setVolume(val));
    };

    const handleMuteToggle = (e) => {
        if (e) e.stopPropagation();
        audioService.tap();
        dispatch(toggleAudioMute());
    };

    const handleClearCache = async (e) => {
        if (e) e.stopPropagation();
        audioService.pop();
        if (window.confirm("CRITICAL: Prune cached quest files? (Your scores and progress will NOT be lost)")) {
            try {
                await ManyaDB.clearQuestionCache();
                audioService.success();
                dispatch(addToast({ message: "Curriculum Cache Pruned!", type: "success" }));
            } catch (err) {
                audioService.error();
                dispatch(addToast({ message: "Failed to prune cache", type: "error" }));
            }
        }
    };

    const triggerManualSync = async () => {
        audioService.tap();
        setIsSyncing(true);
        setSyncStatus('SYNCING...');
        try {
            await syncService.processSyncQueue();
            audioService.success();
            dispatch(addToast({ message: "Cloud Identity Stabilized", type: "success" }));
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (err) {
            audioService.error();
            dispatch(addToast({ message: "Sync Handshake Failed", type: "error" }));
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="pref-view font-main px-4">
            {/* 🔙 ELITE HEADER (MATCHES IDENTITY VAULT METADATA CONSOLE) */}
            <header className="pref-header-elite mb-8 !p-6">
                <div className="toy-card-gloss" />
                <div className="flex items-center gap-4 relative z-20">
                    <button onClick={() => navigate('/profile')} className="pref-back-btn btn-toy">
                        <div className="toy-card-gloss" />
                        <ChevronLeft size={28} strokeWidth={3.5} />
                    </button>
                    <div>
                        <span className="pref-breadcrumb">PREFERENCES</span>
                        <h1 className="pref-main-title">Vault Settings</h1>
                    </div>
                </div>
            </header>

            {/* mobile row-based settings list */}
            <div className="pref-row-list !p-0">
                
                {/* NIGHT MODE (ROW) */}
                <div className="pref-row-card cursor-pointer" onClick={toggleTheme}>
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box icon-box-purple">
                        {currentTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div className="pref-row-info">
                        <span className="pref-row-title">Night Mode</span>
                        <span className="pref-row-desc">Switch between dark & light themes</span>
                    </div>
                    <div className="premium-toggle-wrapper">
                        <input 
                            type="checkbox" 
                            className="premium-toggle-input" 
                            checked={currentTheme === 'dark'}
                            readOnly
                        />
                        <div className="premium-toggle-label">
                            <div className="toggle-switch"></div>
                            <div className="toggle-gloss"></div>
                        </div>
                    </div>
                </div>

                {/* NOTIFICATION PULSE (ROW) */}
                <div className="pref-row-card cursor-pointer" onClick={togglePulse}>
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box icon-box-green">
                        <Bell size={20} />
                    </div>
                    <div className="pref-row-info">
                        <span className="pref-row-title">Pulse System</span>
                        <span className="pref-row-desc">Receive instant in-app alerts</span>
                    </div>
                    <div className="premium-toggle-wrapper">
                        <input 
                            type="checkbox" 
                            className="premium-toggle-input toggle-green" 
                            checked={pulseEnabled}
                            readOnly
                        />
                        <div className="premium-toggle-label">
                            <div className="toggle-switch"></div>
                            <div className="toggle-gloss"></div>
                        </div>
                    </div>
                </div>

                {/* AMBIENT ATMOSPHERE: RAIN SOUNDS (ROW) */}
                <div className="pref-row-card cursor-pointer" onClick={toggleRain}>
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box icon-box-amber">
                        <CloudRain size={20} />
                    </div>
                    <div className="pref-row-info">
                        <span className="pref-row-title">Rain Ambience</span>
                        <span className="pref-row-desc">Fades cozy rain background loop</span>
                    </div>
                    <div className="premium-toggle-wrapper">
                        <input 
                            type="checkbox" 
                            className="premium-toggle-input toggle-amber" 
                            checked={isRainy}
                            readOnly
                        />
                        <div className="premium-toggle-label">
                            <div className="toggle-switch"></div>
                            <div className="toggle-gloss"></div>
                        </div>
                    </div>
                </div>

                {/* MASTER ENERGY (ROW DECK WITH SLIDER) */}
                <div className="pref-row-card no-hover-card flex-col gap-4">
                    <div className="toy-card-gloss" />
                    <div className="flex items-center w-full relative z-20">
                        <div className="pref-icon-box icon-box-pink mb-0">
                            <Zap size={20} />
                        </div>
                        <div className="pref-row-info flex-1 ml-3">
                            <span className="pref-row-title">Master Volume</span>
                            <span className="pref-row-desc">Adjust sound effects & music</span>
                        </div>
                        <button 
                            className={`manya-mute-btn ${isMuted ? 'active' : ''}`}
                            onClick={handleMuteToggle}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                    </div>

                    <div className="manya-slider-container w-full mt-1 relative z-20">
                        <div 
                            className="slider-fill-track" 
                            style={{ width: `${volume * 100}%` }}
                        />
                        <input 
                            type="range" 
                            min="0" max="1" step="0.01"
                            value={volume}
                            onChange={handleVolume}
                            className="manya-range-elite"
                        />
                    </div>
                </div>

                {/* ENGINE DIAGNOSTICS: CLEAR CACHE (ROW) */}
                <div className="pref-row-card cursor-pointer" onClick={handleClearCache}>
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box icon-box-teal">
                        <Sparkles size={20} />
                    </div>
                    <div className="pref-row-info flex-1">
                        <span className="pref-row-title">Diagnostics</span>
                        <span className="pref-row-desc">Clear local quest cache safely</span>
                    </div>
                    <button className="btn-toy btn-toy-white text-[9px] px-3.5 py-1.5 bg-white border border-slate-200 rounded-full font-black uppercase tracking-wider z-10">
                        Prune
                    </button>
                </div>

                {/* AUDIO DIAGNOSTICS: TEST SPEAKER (ROW) */}
                <div className="pref-row-card cursor-pointer" onClick={() => {
                    try {
                        const url = 'https://cdn.jsdelivr.net/gh/manyaug/manya-react-assets@v3.0.13/audios/ui-click.mp3';
                        console.log("🔊 Playing test sound directly at 100% volume:", url);
                        const testAudio = new Audio(url);
                        testAudio.volume = 1.0;
                        testAudio.play()
                            .then(() => {
                                dispatch(addToast({ message: "Test Sound Fired successfully at 100% Volume!", type: "success" }));
                            })
                            .catch(err => {
                                console.error("❌ Audio playback failed:", err);
                                dispatch(addToast({ message: `Playback failed: ${err.message}`, type: "error" }));
                            });
                    } catch (e) {
                        dispatch(addToast({ message: `Initiation error: ${e.message}`, type: "error" }));
                    }
                }}>
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box icon-box-teal">
                        <Volume2 size={20} />
                    </div>
                    <div className="pref-row-info flex-1">
                        <span className="pref-row-title">Test Speakers</span>
                        <span className="pref-row-desc">Play diagnostic beep at 100% volume</span>
                    </div>
                    <button className="btn-toy btn-toy-white text-[9px] px-3.5 py-1.5 bg-white border border-slate-200 rounded-full font-black uppercase tracking-wider z-10">
                        Test
                    </button>
                </div>

                {/* SYSTEM SYNC (ROW) */}
                <div className="pref-row-card cursor-pointer" onClick={triggerManualSync}>
                     <div className="toy-card-gloss" />
                     <div className="flex items-center gap-4 w-full relative z-20">
                         <div className="pref-icon-box icon-box-blue mb-0">
                             <RefreshCw className={isSyncing ? "animate-spin" : ""} size={20} />
                         </div>
                         <div className="flex-1 ml-3">
                             <span className="pref-row-title">Cloud Handshake</span>
                             <span className="pref-row-desc">Backup user identity matrix</span>
                         </div>
                         <div className={`manya-badge-sync ${isSyncing ? 'syncing' : (!isOnline ? 'offline' : '')}`}>
                            {syncStatus}
                         </div>
                     </div>
                </div>

            </div>

            {/* 3. VAULT ENTRANCE ACTION */}
            <div className="mt-8 px-6 text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[4px] mb-6">Credential Management</p>
                 <button 
                    onClick={() => {
                        audioService.click();
                        navigate('/settings');
                    }}
                    className="w-full btn-toy btn-toy-white h-14 text-[11px] text-slate-600 uppercase tracking-widest flex items-center justify-center gap-3"
                 >
                    <Database size={16} /> Open Identity Vault →
                 </button>
            </div>

            <div className="text-center opacity-30 font-black uppercase text-[10px] tracking-[0.3em] py-12">
                Manya World Arena // Stabilized
            </div>
        </div>
    );
}

export default PreferencesView;
