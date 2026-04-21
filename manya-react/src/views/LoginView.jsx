import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { initializeUser } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { ChevronLeft, Mail, Lock, LogIn, ShieldAlert } from 'lucide-react';
import '../styles/onboarding.css'; // Reusing styles for consistency

function LoginView() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            dispatch(addToast({ message: "Identity credentials required.", type: "error" }));
            return;
        }

        setLoading(true);
        try {
            const { error } = await syncService.signIn(email, password);
            if (error) throw error;

            // Trigger full state re-initialization from Cloud
            await dispatch(initializeUser()).unwrap();

            dispatch(addToast({ message: "Welcome Back, Hero!", type: "success" }));
            navigate('/home');
        } catch (err) {
            dispatch(addToast({ message: `Access Denied: ${err.message}`, type: "error" }));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email) {
            dispatch(addToast({ message: "Identify DNA: Please enter your email first.", type: "warning" }));
            return;
        }

        try {
            const { error } = await syncService.resetPassword(email);
            if (error) throw error;
            dispatch(addToast({ message: "Security Link Dispatched to your Email!", type: "success" }));
        } catch (err) {
            dispatch(addToast({ message: `Dispatch Error: ${err.message}`, type: "error" }));
        }
    };

    return (
        <div className="premium-ob-shell">
            <div className="ob-background-fx"></div>
            
            <div className="ob-container">
                <div className="ob-top-nav">
                    <button className="ob-back-btn" onClick={() => navigate('/onboarding')}>
                        <ChevronLeft size={24} />
                    </button>
                    <div className="ob-logo-area">
                        <img src="/assets/icons/pwa-192x192.png" alt="Manya" />
                    </div>
                </div>

                <div className="ob-main-card">
                    <div className="ob-step-content animate-in">
                        <div className="ob-icon-circle"><LogIn size={40} /></div>
                        <h3>Welcome Back</h3>
                        <p>Sign in to continue learning.</p>

                        <form onSubmit={handleLogin} className="login-form-elite">
                            <div className="input-with-icon">
                                <Mail className="i-icon" size={18} />
                                <input 
                                    type="email" 
                                    placeholder="Email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    autoFocus 
                                />
                            </div>
                            <div className="input-with-icon" style={{ marginTop: '15px' }}>
                                <Lock className="i-icon" size={18} />
                                <input 
                                    type="password" 
                                    placeholder="Password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                />
                            </div>

                            <button 
                                type="submit"
                                className={`ob-next-btn ${loading ? 'loading' : ''}`}
                                disabled={loading}
                                style={{ marginTop: '30px', width: '100%' }}
                            >
                                {loading ? "CONNECTING..." : "LOG IN →"}
                            </button>
                        </form>
                        
                        <div className="auth-footer-links">
                            <Link to="/onboarding">New? Sign Up</Link>
                            <a href="#" onClick={handleForgotPassword}>Forgot Password?</a>
                        </div>
                    </div>
                </div>

                <div className="ob-footer-actions">
                     <div className="security-badge">
                        <ShieldAlert size={14} /> Encrypted Session
                     </div>
                </div>
            </div>
        </div>
    );
}

export default LoginView;
