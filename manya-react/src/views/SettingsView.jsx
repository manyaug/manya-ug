import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { updateProfile, resetUser } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { ManyaDB } from '../infrastructure/db/manyaDB.js';
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
    RefreshCw,
    Lock
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
    const [pendingCount, setPendingCount] = useState(0);

    const checkPending = async () => {
        const queue = await ManyaDB.getSyncQueue();
        setPendingCount(queue.length);
    };

    useEffect(() => {
        checkPending();
    }, []);

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

    const [passwordState, setPasswordState] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

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
                parent_phone: formState.parent_phone,
                last_active_at: new Date().toISOString()
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
            checkPending();
        }
    };

    const handleForceSync = async () => {
        setLoading(true);
        setSyncStatus('FORCE SYNCING...');
        try {
            const result = await syncService.forceSync();
            if (result.authError) {
                dispatch(addToast({ message: "Security Handshake Failed: Please Sign In Again", type: "error" }));
            } else if (result.count > 0) {
                dispatch(addToast({ message: `${result.count} Records Stabilized in Cloud!`, type: "success" }));
            } else {
                dispatch(addToast({ message: "Cloud DNA is already up to date.", type: "info" }));
            }
            setSyncStatus(isOnline ? '100% SECURE' : 'OFFLINE (QUEUED)');
        } catch (e) {
            setSyncStatus('OFFLINE (QUEUED)');
        } finally {
            setLoading(false);
            checkPending();
        }
    };

    const handlePasswordUpdate = async () => {
        if (!isOnline) {
            dispatch(addToast({ message: "CRITICAL: Live Sync Required for Security Updates", type: "error" }));
            return;
        }

        if (passwordState.newPassword.length < 6) {
            dispatch(addToast({ message: "Security Protocol: Password too short (min 6 chars)", type: "error" }));
            return;
        }

        if (passwordState.newPassword !== passwordState.confirmPassword) {
            dispatch(addToast({ message: "Logic Error: Passwords do not match", type: "error" }));
            return;
        }

        setIsUpdatingPassword(true);
        try {
            // 1. Attempt Auth Update (Passes through resilient syncService)
            const { error, warning } = await syncService.updatePassword(passwordState.newPassword);
            if (error && !warning) throw error;

            // 2. 🚀 RECORD IN DB (Always recorded to profiles table)
            const updatedProfile = { ...user, lastSecurityUpdate: new Date().toISOString() };
            dispatch(updateProfile(updatedProfile));
            await syncService.uploadProfile(updatedProfile);

            const msg = warning === 'local_only' 
                ? "DNA Record Stabilized locally (Cloud Sync Pending)" 
                : "Security Matrix Re-Keyed Successfully!";
            
            dispatch(addToast({ message: msg, type: warning === 'local_only' ? "warning" : "success" }));
            setPasswordState({ newPassword: '', confirmPassword: '' });
        } catch (err) {
            dispatch(addToast({ message: `Access Refraction: ${err.message}`, type: "error" }));
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="sett-view font-main"
        >
            <div className="max-w-2xl mx-auto px-4 pb-20 relative z-10">
                {/* 🔙 BACK NAV */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/profile')} className="p-2 bg-white rounded-2xl border-2 border-slate-200">
                        <ChevronLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Identity Vault</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata Stabilization Console</p>
                    </div>
                </div>

                {/* 🛡️ VAULT BANNER */}
                <div className="identity-vault-banner">
                    <div className="flex flex-col items-center gap-6 w-full">
                         <div className="relative">
                            <div className="w-24 h-24 rounded-full border-4 border-violet-500 overflow-hidden bg-white">
                                <img src={user?.avatarSeed ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}` : (IMAGES?.avatars?.Manya || IMAGES?.manya_icon)} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-violet-500 text-[8px] font-black text-white px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                                Active DNA
                            </div>
                         </div>

                         <div className="text-center">
                            <p className="text-xl font-black text-slate-800 uppercase">{user?.nickname || "Unknown Hero"}</p>
                            <button 
                                onClick={shuffleDNA}
                                disabled={mutating}
                                className="mt-2 btn-toy btn-toy-white text-[10px] px-6 py-2"
                            >
                                {mutating ? <RefreshCw className="animate-spin" size={12} /> : <RefreshCw size={12} className="mr-2" />} 
                                Shuffle DNA
                            </button>
                         </div>

                         <div className="vault-sync-status">
                            <div className="flex items-center gap-3">
                                <div className="sync-pulse" />
                                <span className="uppercase tracking-widest text-[9px] font-black">{syncStatus}</span>
                            </div>
                            {pendingCount > 0 && isOnline && (
                                <button className="force-sync-link" onClick={handleForceSync}>
                                    Immediate Upload Required ({pendingCount} items)
                                </button>
                            )}
                         </div>
                    </div>
                </div>

                {/* 📊 IDENTITY FIELDS (BENTO) */}
                <div className="bento-card">
                    <div className="section-header">
                        <p className="section-title">Identity Parameters</p>
                        <User size={16} className="text-violet-400" />
                    </div>

                    <div className="space-y-6">
                        <div className="input-group">
                            <div className="input-label-row">
                                <div className="icon-halo"><Edit3 size={14} /></div>
                                <span>Hero Nickname</span>
                            </div>
                            <input 
                                className="premium-glass-input"
                                value={formState.nickname}
                                onChange={(e) => setFormState({ ...formState, nickname: e.target.value })}
                                placeholder="Enter hero alias..."
                            />
                        </div>

                        <div className="input-group">
                            <div className="input-label-row">
                                <div className="icon-halo"><GraduationCap size={14} /></div>
                                <span>Academic Grade</span>
                            </div>
                            <select 
                                className="premium-glass-select"
                                value={formState.grade_level}
                                onChange={(e) => setFormState({ ...formState, grade_level: e.target.value })}
                            >
                                <option value="Primary 1">Primary 1</option>
                                <option value="Primary 2">Primary 2</option>
                                <option value="Primary 3">Primary 3</option>
                                <option value="Primary 4">Primary 4</option>
                                <option value="Primary 5">Primary 5</option>
                                <option value="Primary 6">Primary 6</option>
                                <option value="Primary 7">Primary 7</option>
                                <option value="Senior 1">Senior 1</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 🛡️ SECURITY MATRIX (BENTO) */}
                <div className="bento-card security-card">
                    <div className="section-header">
                         <div className="flex items-center gap-2">
                             <p className="section-title">Security Matrix</p>
                             <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase">Restricted</span>
                         </div>
                         <ShieldCheck size={16} className="text-slate-400" />
                    </div>

                    <div className="space-y-6">
                        <div className="input-group">
                            <div className="input-label-row">
                                <div className="icon-halo"><Lock size={14} /></div>
                                <span>New Identity Key</span>
                            </div>
                            <input 
                                type="password"
                                className="premium-glass-input"
                                value={passwordState.newPassword}
                                onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                                placeholder="Min 6 characters..."
                            />
                        </div>

                        <div className="input-group">
                            <div className="input-label-row">
                                <div className="icon-halo"><ShieldCheck size={14} /></div>
                                <span>Confirm Key DNA</span>
                            </div>
                            <input 
                                type="password"
                                className="premium-glass-input"
                                value={passwordState.confirmPassword}
                                onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                                placeholder="Match security key..."
                            />
                        </div>
                    </div>

                    <button 
                        className="w-full mt-4 btn-toy btn-toy-slate h-16 text-xs uppercase"
                        onClick={handlePasswordUpdate}
                        disabled={isUpdatingPassword || !passwordState.newPassword}
                    >
                       {isUpdatingPassword ? <RefreshCw className="animate-spin inline mr-2" size={14} /> : <Lock size={14} className="inline mr-2" />}
                       Stabilize Security Matrix
                    </button>
                </div>

                {/* 💾 ACTIONS */}
                <button 
                    onClick={saveHeroChanges}
                    disabled={loading}
                    className="w-full mt-10 btn-toy btn-toy-purple h-20 text-[13px]"
                >
                    {loading ? "Aligning DNA..." : "COMMIT IDENTITY CHANGES"}
                </button>

                {/* 🚨 DANGER ZONE */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-[4px] mb-6">Security Clearance & Purge</p>
                    <div className="flex gap-4">
                        <button onClick={handleLogout} className="flex-1 btn-toy btn-toy-white h-16 text-[10px] text-slate-500 uppercase">
                           <LogOut size={16} className="inline mr-2" /> Sign Out
                        </button>
                        <button onClick={handleDeleteAccount} className="flex-1 btn-toy btn-toy-white h-16 text-[10px] text-rose-500 uppercase font-black">
                           <Trash2 size={16} className="inline mr-2" /> Purge Identity
                        </button>
                    </div>
                </div>

                {/* 🏷️ VERSION TAG */}
                <div className="mt-16 text-center opacity-30 grayscale pointer-events-none">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Matrix Console v9.2 // Stabilized</p>
                </div>
            </div>
        </motion.div>
    );
}

export default SettingsView;
