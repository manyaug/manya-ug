import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { updateProfile } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import { syncService } from '../infrastructure/sync/syncService.js';
import { supabase } from '../infrastructure/remote/supabaseClient.js';
import {
    ChevronLeft,
    Lock,
    Unlock,
    User,
    Phone,
    ShieldCheck,
    Send,
    ToggleLeft,
    ToggleRight,
    KeyRound,
    MessageCircle,
    Share2
} from 'lucide-react';
import '../styles/preferences.css'; // reuse existing premium row styles

function ParentPortalView() {
    const user = useSelector((state) => state.user.data);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // ── PIN gate state ─────────────────────────────────────────────────────────
    const hasPin = !!(user?.parent_pin_hash && user.parent_pin_hash !== '');
    const [isUnlocked, setIsUnlocked] = useState(!hasPin);
    const [pinInput, setPinInput] = useState('');
    const [showPinModal, setShowPinModal] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // ── Form state ─────────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        parent_name: user?.parent_name || '',
        parent_whatsapp: user?.parent_whatsapp || '',
        new_pin: '',
        report_enabled: user?.report_enabled !== undefined ? user.report_enabled : true
    });

    const [saving, setSaving] = useState(false);

    // ── PIN Verification ───────────────────────────────────────────────────────
    const handleVerifyPin = async (e) => {
        e?.preventDefault();
        if (pinInput.length !== 4) {
            dispatch(addToast({ message: 'PIN must be exactly 4 digits.', type: 'warning' }));
            return;
        }
        setVerifying(true);
        try {
            const { data: ok, error } = await supabase.rpc('verify_parent_pin', {
                p_user_id: user.uid || user.id,
                p_pin: pinInput
            });
            if (error) throw error;
            if (ok) {
                setIsUnlocked(true);
                setShowPinModal(false);
                setPinInput('');
                dispatch(addToast({ message: 'Parent Portal Unlocked!', type: 'success' }));
            } else {
                dispatch(addToast({ message: 'Incorrect PIN. Try again.', type: 'error' }));
                setPinInput('');
            }
        } catch (err) {
            dispatch(addToast({ message: `PIN error: ${err.message}`, type: 'error' }));
        } finally {
            setVerifying(false);
        }
    };

    // ── Save settings ──────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (form.parent_whatsapp && !/^\+?[1-9]\d{1,14}$/.test(form.parent_whatsapp.replace(/\s+/g, ''))) {
            dispatch(addToast({ message: 'WhatsApp must be in E.164 format (+256...)', type: 'error' }));
            return;
        }
        if (form.new_pin && (form.new_pin.length !== 4 || isNaN(Number(form.new_pin)))) {
            dispatch(addToast({ message: 'New PIN must be exactly 4 digits.', type: 'error' }));
            return;
        }

        setSaving(true);
        try {
            // Hash new PIN server-side if provided.
            // The RPC stores crypt(pin, gen_salt('bf')) — we never touch parent_pin_hash directly.
            if (form.new_pin) {
                const { error: pinErr } = await supabase.rpc('set_parent_pin', {
                    p_user_id: user.uid || user.id,
                    p_pin: form.new_pin
                });
                if (pinErr) throw new Error(`PIN update failed: ${pinErr.message}`);
            }

            // Build profile update — parent_pin_hash is excluded; syncService won't touch it either.
            const updated = {
                ...user,
                parent_name: form.parent_name,
                parent_whatsapp: form.parent_whatsapp,
                report_enabled: form.report_enabled,
            };

            await syncService.uploadProfile(updated);
            dispatch(updateProfile(updated));
            dispatch(addToast({ message: 'Parent Portal saved!', type: 'success' }));
            setForm(f => ({ ...f, new_pin: '' }));
        } catch (err) {
            dispatch(addToast({ message: `Save failed: ${err.message}`, type: 'error' }));
        } finally {
            setSaving(false);
        }
    };

    const [sharing, setSharing] = useState(false);

    const handleShareProgress = async () => {
        if (!form.parent_whatsapp) {
            dispatch(addToast({ message: 'Please specify a parent WhatsApp number first.', type: 'warning' }));
            return;
        }
        setSharing(true);
        try {
            // 1. Fetch signed student token from Supabase
            const { data: token, error } = await supabase.rpc('get_signed_student_token', {
                p_user_id: user.uid || user.id
            });
            if (error) throw error;
            if (!token) throw new Error('Failed to generate secure student token');

            const parentPhone = form.parent_whatsapp.replace(/\D/g, '');
            const botNumber = import.meta.env.VITE_BOT_NUMBER || '17343493088';
            
            // 2. Format pre-filled WhatsApp message URL
            const textMessage = `Hi Mom/Dad, my weekly exam report is ready. Click here to view it on the Official Bot: https://wa.me/${botNumber}?text=GET_REPORT_${token}`;
            const waUrl = `https://wa.me/${parentPhone}?text=${encodeURIComponent(textMessage)}`;
            
            // 3. Open WhatsApp deep link
            window.open(waUrl, '_blank');
            dispatch(addToast({ message: 'Redirecting to WhatsApp to share progress... 📲', type: 'success' }));
        } catch (err) {
            dispatch(addToast({ message: `Failed to share: ${err.message}`, type: 'error' }));
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="pref-view font-main px-4">

            {/* ── HEADER ──────────────────────────────────────────────────────── */}
            <header className="pref-header-elite mb-8 !p-6">
                <div className="toy-card-gloss" />
                <div className="flex items-center gap-4 relative z-20">
                    <button onClick={() => navigate('/profile')} className="pref-back-btn btn-toy">
                        <div className="toy-card-gloss" />
                        <ChevronLeft size={28} strokeWidth={3.5} />
                    </button>
                    <div>
                        <span className="pref-breadcrumb">PARENT PORTAL</span>
                        <h1 className="pref-main-title">Guardian Control</h1>
                    </div>
                </div>
            </header>

            {/* ── STATUS BANNER ────────────────────────────────────────────────── */}
            <div className="mb-6 mx-0">
                <div
                    className="pref-row-card !cursor-default"
                    style={{ background: isUnlocked
                        ? 'linear-gradient(135deg, #16a34a22, #22c55e11)'
                        : 'linear-gradient(135deg, #7c3aed22, #a855f711)' }}
                >
                    <div className="toy-card-gloss" />
                    <div className="pref-icon-box" style={{ background: isUnlocked ? '#16a34a' : '#7c3aed', color: 'white' }}>
                        {isUnlocked ? <Unlock size={20} /> : <Lock size={20} />}
                    </div>
                    <div className="pref-row-info flex-1">
                        <span className="pref-row-title">{isUnlocked ? 'Portal Unlocked' : 'Portal Locked'}</span>
                        <span className="pref-row-desc">
                            {isUnlocked
                                ? 'You can now edit parent settings.'
                                : hasPin
                                    ? 'Enter your 4-digit PIN to access settings.'
                                    : 'No PIN set — portal is open. Add a PIN to secure it.'}
                        </span>
                    </div>
                    {!isUnlocked && (
                        <button
                            className="btn-toy btn-toy-purple text-[10px] px-4 py-2 z-10"
                            onClick={() => { setShowPinModal(true); setPinInput(''); }}
                        >
                            Unlock
                        </button>
                    )}
                </div>
            </div>

            {/* ── SETTINGS ROWS (only visible when unlocked) ───────────────────── */}
            <AnimatePresence>
                {isUnlocked && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="pref-row-list !p-0"
                    >
                        {/* Guardian Name */}
                        <div className="pref-row-card !cursor-default flex-col !items-start gap-3">
                            <div className="toy-card-gloss" />
                            <div className="flex items-center gap-3 w-full relative z-10">
                                <div className="pref-icon-box icon-box-purple mb-0">
                                    <User size={20} />
                                </div>
                                <div className="pref-row-info flex-1 ml-0">
                                    <span className="pref-row-title">Guardian Name</span>
                                    <span className="pref-row-desc">Parent or guardian's full name</span>
                                </div>
                            </div>
                            <input
                                className="premium-glass-input w-full relative z-10"
                                value={form.parent_name}
                                onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))}
                                placeholder="e.g. Jane Nabukenya"
                            />
                        </div>

                        {/* WhatsApp Number */}
                        <div className="pref-row-card !cursor-default flex-col !items-start gap-3">
                            <div className="toy-card-gloss" />
                            <div className="flex items-center gap-3 w-full relative z-10">
                                <div className="pref-icon-box icon-box-green mb-0">
                                    <Phone size={20} />
                                </div>
                                <div className="pref-row-info flex-1 ml-0">
                                    <span className="pref-row-title">WhatsApp Number</span>
                                    <span className="pref-row-desc">E.164 format: +256700000000</span>
                                </div>
                            </div>
                            <input
                                className="premium-glass-input w-full relative z-10"
                                value={form.parent_whatsapp}
                                onChange={e => setForm(f => ({ ...f, parent_whatsapp: e.target.value }))}
                                placeholder="+256700000000"
                                type="tel"
                            />
                            {form.parent_whatsapp && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold relative z-10 px-1">
                                    ⚠️ Parent must send <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">join manya-ug</code> to <b>+1 734 349 3088</b> on WhatsApp to activate reports.
                                </p>
                            )}
                        </div>

                        {/* Change PIN */}
                        <div className="pref-row-card !cursor-default flex-col !items-start gap-3">
                            <div className="toy-card-gloss" />
                            <div className="flex items-center gap-3 w-full relative z-10">
                                <div className="pref-icon-box icon-box-amber mb-0">
                                    <KeyRound size={20} />
                                </div>
                                <div className="pref-row-info flex-1 ml-0">
                                    <span className="pref-row-title">{hasPin ? 'Change PIN' : 'Set Security PIN'}</span>
                                    <span className="pref-row-desc">4-digit PIN to lock parent settings</span>
                                </div>
                            </div>
                            <input
                                type="password"
                                maxLength={4}
                                className="premium-glass-input w-full relative z-10 tracking-[12px] text-center text-lg"
                                value={form.new_pin}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setForm(f => ({ ...f, new_pin: val }));
                                }}
                                placeholder="● ● ● ●"
                            />
                        </div>

                        {/* Weekly Report Toggle */}
                        <div
                            className="pref-row-card cursor-pointer"
                            onClick={() => setForm(f => ({ ...f, report_enabled: !f.report_enabled }))}
                        >
                            <div className="toy-card-gloss" />
                            <div className="pref-icon-box icon-box-blue">
                                <MessageCircle size={20} />
                            </div>
                            <div className="pref-row-info">
                                <span className="pref-row-title">Weekly Reports</span>
                                <span className="pref-row-desc">Auto-send progress snapshot every Sunday</span>
                            </div>
                            <div className="premium-toggle-wrapper">
                                <input
                                    type="checkbox"
                                    className="premium-toggle-input"
                                    checked={form.report_enabled}
                                    readOnly
                                />
                                <div className="premium-toggle-label">
                                    <div className="toggle-switch" />
                                    <div className="toggle-gloss" />
                                </div>
                            </div>
                        </div>

                        {/* Share Progress Link */}
                        <div
                            className="pref-row-card cursor-pointer"
                            onClick={sharing ? undefined : handleShareProgress}
                            style={{ opacity: sharing ? 0.6 : 1 }}
                        >
                            <div className="toy-card-gloss" />
                            <div className="pref-icon-box icon-box-blue">
                                <Share2 size={20} />
                            </div>
                            <div className="pref-row-info flex-1">
                                <span className="pref-row-title">Share Progress Link</span>
                                <span className="pref-row-desc">Send secure report link to parent's WhatsApp</span>
                            </div>
                            <button
                                className="btn-toy btn-toy-white text-[9px] px-3.5 py-1.5 bg-white border border-slate-200 rounded-full font-black uppercase tracking-wider z-10"
                                disabled={sharing}
                            >
                                {sharing ? '...' : 'Share'}
                            </button>
                        </div>


                        {/* Save Button */}
                        <div className="pt-2 pb-6">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full btn-toy btn-toy-purple h-16 text-[12px] font-black uppercase tracking-widest"
                            >
                                <ShieldCheck size={16} className="inline mr-2" />
                                {saving ? 'Saving...' : 'Save Parent Settings'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── PIN ENTRY MODAL ──────────────────────────────────────────────── */}
            <AnimatePresence>
                {showPinModal && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[9999] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[var(--bg-card)] border border-slate-700/50 rounded-[32px] p-8 max-w-sm w-full relative overflow-hidden text-center shadow-2xl"
                        >
                            <div className="toy-card-gloss" />
                            <button
                                className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
                                onClick={() => setShowPinModal(false)}
                            >✕</button>

                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                <Lock size={26} className="text-violet-500" />
                            </div>

                            <h3 className="text-lg font-black uppercase text-slate-800 dark:text-white">Verify Guardian PIN</h3>
                            <p className="text-xs text-slate-400 mt-2 mb-6">
                                Enter your 4-digit parent PIN to unlock access.
                            </p>

                            <form onSubmit={handleVerifyPin}>
                                <input
                                    type="password"
                                    maxLength={4}
                                    autoFocus
                                    className="premium-glass-input text-center text-2xl tracking-[20px] font-black h-16 rounded-2xl w-full mb-6 bg-slate-900 border border-slate-700 focus:border-violet-500 text-white"
                                    value={pinInput}
                                    onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                                    placeholder="● ● ● ●"
                                />
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        className="flex-1 btn-toy btn-toy-white h-12 text-[10px]"
                                        onClick={() => setShowPinModal(false)}
                                    >Cancel</button>
                                    <button
                                        type="submit"
                                        disabled={verifying}
                                        className="flex-1 btn-toy btn-toy-purple h-12 text-[10px]"
                                    >
                                        {verifying ? 'Checking...' : 'Verify PIN'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="text-center opacity-30 font-black uppercase text-[10px] tracking-[0.3em] py-12">
                Manya World Arena // Parent Control
            </div>
        </div>
    );
}

export default ParentPortalView;
