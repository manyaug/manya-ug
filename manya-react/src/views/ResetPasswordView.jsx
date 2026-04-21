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
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);

    useEffect(() => {
        // Detect if we landed here from a recovery email
        // Supabase Appends #access_token=... and type=recovery to the URL
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
            setIsRecoveryMode(true);
        } else {
            // Check if we are already logged in (standard update)
            syncService.getUserId().then(uid => {
                if (!uid) {
                    dispatch(addToast({ message: "Security Link Expired or Invalid.", type: "error" }));
                    navigate('/login');
                }
            });
        }
    }, [navigate, dispatch]);

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
            
            // Clean up hash to prevent re-triggering logic
            window.location.hash = '';
            
            // Send back to login to confirm fresh session
            navigate('/login');
        } catch (err) {
            dispatch(addToast({ message: `Reset Failed: ${err.message}`, type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="premium-ob-shell">
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
                </div>

                <div className="ob-footer-actions">
                     <div className="security-badge flex items-center gap-2">
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> 
                        Encrypted Key Exchange Active
                     </div>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordView;
