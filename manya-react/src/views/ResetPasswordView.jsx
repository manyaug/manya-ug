import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { syncService } from '../infrastructure/sync/syncService.js';
import { addToast } from '../store/toastSlice';
import { Lock, ShieldCheck, ChevronLeft, RefreshCw } from 'lucide-react';
import '../styles/onboarding.css';

function ResetPasswordView() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isStabilizing, setIsStabilizing] = useState(true);
    const [handshakeFailed, setHandshakeFailed] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const hash = window.location.hash;
            const search = window.location.search;
            const isRecovery = (hash && hash.includes('type=recovery')) || (search && search.includes('type=recovery'));
            
            console.log("🗝️ [Security] Initializing Reset Portal Handshake...");

            // Give Supabase a moment to process tokens into a valid session
            setTimeout(async () => {
                const uid = await syncService.getUserId();
                
                if (uid) {
                    console.log("✅ [Security] Handshake Stable. User UID Verified.");
                    setIsStabilizing(false);
                } else if (isRecovery) {
                    // It's a recovery link but session isn't hot yet. Wait one more cycle.
                    console.warn("⏳ [Security] Recovery detected but session pending. Retrying...");
                    setTimeout(async () => {
                        const retryUid = await syncService.getUserId();
                        if (retryUid) {
                            setIsStabilizing(false);
                        } else {
                            console.error("❌ [Security] Recovery failure.");
                            setHandshakeFailed(true);
                        }
                    }, 2000);
                } else {
                    console.warn("⚠️ [Security] No valid recovery session found.");
                    setHandshakeFailed(true);
                }
            }, 1000);
        };

        checkSession();
    }, []);

    const handleReset = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            dispatch(addToast({ message: "Password too short (min 6 characters).", type: "error" }));
            return;
        }

        if (password !== confirmPassword) {
            dispatch(addToast({ message: "Passwords do not match.", type: "error" }));
            return;
        }

        setLoading(true);
        try {
            const { error } = await syncService.updatePassword(password);
            if (error) throw error;

            dispatch(addToast({ message: "Security Key Re-Stabilized!", type: "success" }));
            
            // Clean up to prevent re-triggering
            window.history.replaceState(null, '', window.location.pathname);
            
            // Send back to login to confirm fresh session
            navigate('/login');
        } catch (err) {
            dispatch(addToast({ message: `Reset Failed: ${err.message}`, type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    if (handshakeFailed) {
        return (
            <div className="premium-ob-shell">
                <div className="ob-container flex flex-col items-center justify-center p-8 text-center">
                    <div className="ob-icon-circle bg-red-100 text-red-600 mb-6">
                        <Lock size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Security Link Expired</h3>
                    <p className="opacity-70 mb-8">This password reset link is invalid or has already been used.</p>
                    <button className="ob-next-btn w-full" onClick={() => navigate('/login')}>
                        RETURN TO LOGIN
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="premium-ob-shell" data-theme="light">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container">
                <div className="ob-top-nav">
                    <button className="ob-back-btn" onClick={() => navigate('/login')}>
                        <ChevronLeft size={24} />
                    </button>
                    <div className="ob-logo-area">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" />
                    </div>
                </div>

                <div className="ob-main-card">
                    {isStabilizing ? (
                        <div className="ob-step-content flex flex-col items-center py-12">
                             <div className="handshake-loader mb-6">
                                <RefreshCw size={40} className="animate-spin text-violet-500" />
                             </div>
                             <h3>Stabilizing Identity</h3>
                             <p>Confirming security handshake with Supabase Vault...</p>
                        </div>
                    ) : (
                        <div className="ob-step-content animate-in">
                            <div className="ob-icon-circle" style={{ background: 'var(--manya-purple-light)' }}>
                                <Lock size={40} className="text-violet-600" />
                            </div>
                            <h3>New Identity Key</h3>
                            <p>Establish your new security parameters.</p>

                            <form onSubmit={handleReset} className="login-form-elite">
                                <div className="input-with-icon">
                                    <Lock className="i-icon" size={18} />
                                    <input 
                                        type="password" 
                                        placeholder="New Password" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        autoFocus 
                                    />
                                </div>
                                <div className="input-with-icon" style={{ marginTop: '15px' }}>
                                    <ShieldCheck className="i-icon" size={18} />
                                    <input 
                                        type="password" 
                                        placeholder="Confirm New Password" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    className={`ob-next-btn ${loading ? 'loading' : ''}`}
                                    disabled={loading}
                                    style={{ marginTop: '30px', width: '100%' }}
                                >
                                    {loading ? "RECORDING..." : "ACTIVATE KEY"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <div className="ob-footer-actions">
                     <div className="security-badge flex items-center gap-2">
                        <RefreshCw size={12} className={loading || isStabilizing ? "animate-spin" : ""} /> 
                        {isStabilizing ? "Vault Handshake Active" : "Encrypted Key Exchange Active"}
                     </div>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordView;
