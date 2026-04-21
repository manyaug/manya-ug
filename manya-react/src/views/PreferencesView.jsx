import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateProfile } from '../store/userSlice';
import { setVolume, toggleMute as toggleAudioMute } from '../store/audioSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { addToast } from '../store/toastSlice';
import { IMAGES } from '../config/assetUrls';
import { 
    ChevronLeft, 
    Moon, 
    Sun, 
    Volume2, 
    VolumeX, 
    RefreshCw, 
    User,
    Zap,
    Bell,
    Database
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

    const toggleTheme = () => {
        const next = user?.theme === 'dark' ? 'light' : 'dark';
        dispatch(updateProfile({ ...user, theme: next }));
        document.documentElement.setAttribute('data-theme', next);
    };

    const handleVolume = (e) => {
        const val = parseFloat(e.target.value);
        dispatch(setVolume(val));
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
        <div className="pref-view font-main">
            {/* 1. HERO VAULT PASS (REMASTERED) */}
            <div className="hero-vault-header">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigate('/profile')} className="back-btn-manya">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Vault Node</h2>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Settings Alpha v21.0</span>
                    </div>
                </div>

                <div className="relative inline-block mt-4">
                    <div className="w-24 h-24 rounded-full border-4 border-violet-500 p-1 bg-white mx-auto overflow-hidden shadow-xl">
                        <img 
                            src={user?.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}` : IMAGES.avatars.Manya} 
                            alt="Hero" 
                            className="w-full h-full object-cover rounded-full" 
                        />
                    </div>
                    <div className="hero-status-pill">
                        {isOnline ? 'Network: ACTIVE' : 'Local Archive'}
                    </div>
                </div>
            </div>

            {/* 2. BENTO SETTINGS MATRIX */}
            <div className="pref-bento-grid">
                
                {/* NIGHT MODE (SQUARE BENTO) */}
                <div className="bento-card-elite" onClick={toggleTheme}>
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                        {user?.theme === 'dark' ? <Moon size={22} /> : <Sun size={22} />}
                    </div>
                    <span className="bento-label">Night Mode</span>
                    <span className="bento-sub">UI Theme</span>
                    
                    <div className="premium-toggle-wrapper">
                        <input 
                            type="checkbox" 
                            className="premium-toggle-input" 
                            id="night-mode-bento" 
                            checked={user?.theme === 'dark'}
                            onChange={toggleTheme}
                        />
                        <label htmlFor="night-mode-bento" className="premium-toggle-label">
                            <div className="toggle-switch"></div>
                            <div className="toggle-gloss"></div>
                        </label>
                    </div>
                </div>

                {/* NOTIFICATION PULSE (SQUARE BENTO) */}
                <div className="bento-card-elite">
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                        <Bell size={22} />
                    </div>
                    <span className="bento-label">Pulse</span>
                    <span className="bento-sub">Alert System</span>
                    
                    <div className="premium-toggle-wrapper">
                        <input 
                            type="checkbox" 
                            className="premium-toggle-input" 
                            id="notif-pulse-bento" 
                            defaultChecked
                        />
                        <label htmlFor="notif-pulse-bento" className="premium-toggle-label">
                            <div className="toggle-switch"></div>
                            <div className="toggle-gloss"></div>
                        </label>
                    </div>
                </div>

                {/* MASTER ENERGY (WIDE BENTO DECK) */}
                <div className="bento-card-elite bento-card-wide">
                    <div className="toy-card-gloss" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="pref-icon-box mb-0" style={{ background: '#fff1f2', color: '#f43f5e' }}>
                            <Zap size={22} />
                        </div>
                        <div>
                            <span className="bento-label block mb-0 leading-none">Master Energy</span>
                            <span className="bento-sub block mb-0 leading-none mt-2">Audio Spectrum</span>
                        </div>
                        <button 
                            className={`ml-auto p-3 rounded-2xl border-2 transition-all ${isMuted ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                            onClick={() => dispatch(toggleAudioMute())}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                    </div>

                    <div className="manya-slider-container mt-2">
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

                {/* SYSTEM SYNC (WIDE BENTO) */}
                <div className="bento-card-elite bento-card-wide" onClick={triggerManualSync}>
                     <div className="toy-card-gloss" />
                     <div className="flex items-center gap-4 w-full">
                         <div className="pref-icon-box mb-0" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                             {isSyncing ? <RefreshCw className="animate-spin" size={22} /> : <RefreshCw size={22} />}
                         </div>
                         <div className="flex-1">
                             <span className="bento-label block mb-0">Identity Stabilization</span>
                             <span className="bento-sub block mb-0">Cloud Handshake</span>
                         </div>
                         <div className="text-[10px] font-black text-blue-500 uppercase px-3 py-1 bg-blue-100 border-2 border-blue-200 rounded-full">
                            {syncStatus}
                         </div>
                     </div>
                </div>

            </div>

            {/* 3. VAULT ENTRANCE ACTION */}
            <div className="mt-12 px-6 text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-[4px] mb-6">Credential Management</p>
                 <button 
                    onClick={() => navigate('/settings')}
                    className="w-full btn-toy btn-toy-white h-16 text-[11px] text-slate-600 uppercase tracking-widest flex items-center justify-center gap-3"
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
