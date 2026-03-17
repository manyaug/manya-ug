import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateProfile, completeOnboarding } from '../store/userSlice';
import { addToast } from '../store/toastSlice';
import '../styles/onboarding.css';

function OnboardingView() {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    
    // Default Profile Buffer
    const [profile, setProfile] = useState({
        goal: 'Agg 4-8',
        nickname: '',
        school: '',
        preferences: { likes: [], hates: [] },
        avatarSeed: '',
        parent: { name: '', whatsapp: '' }
    });

    const [avatarOptions, setAvatarOptions] = useState([]);

    const generateSeeds = (baseName) => {
        const base = baseName || "Hero";
        const seeds = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
        setAvatarOptions(seeds);
        setProfile(p => ({ ...p, avatarSeed: seeds[0] }));
    };

    useEffect(() => {
        if (step === 4 && avatarOptions.length === 0) {
            generateSeeds(profile.nickname);
        }
    }, [step, profile.nickname, avatarOptions.length]);

    const handleNext = () => {
        if (step === 2) {
            if (!profile.nickname || profile.nickname.length < 2) {
                dispatch(addToast({ message: "Enter a valid Hero name!", type: "error" }));
                return;
            }
        }
        
        if (step === 5) {
            if (!profile.parent.name || !profile.parent.whatsapp) {
                dispatch(addToast({ message: "Guardian info required!", type: "error" }));
                return;
            }

            dispatch(addToast({ message: "Securing Profile...", type: "info" }));
            
            // Dispatch to Redux (which automatically triggers ManyaDB sync)
            dispatch(updateProfile(profile));
            dispatch(completeOnboarding());
            
            setTimeout(() => {
                dispatch(addToast({ message: "Welcome, Hero!", type: "success" }));
                navigate('/home');
            }, 600);
            return;
        }

        setStep(step + 1);
    };

    const togglePref = (sub) => {
        const likes = [...profile.preferences.likes];
        const idx = likes.indexOf(sub);
        if (idx > -1) likes.splice(idx, 1);
        else likes.push(sub);
        setProfile(p => ({ ...p, preferences: { ...p.preferences, likes } }));
    };

    const renderInputStage = () => {
        switch(step) {
            case 1:
                return (
                    <>
                        <div className={`ob-goal-card ${profile.goal === 'Agg 4-8' ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, goal: 'Agg 4-8' }))}>
                            <div className="goal-icon">🏆</div>
                            <div className="goal-text"><h4>Elite Scholar</h4><p>Targeting Aggregate 4 - 8</p></div>
                        </div>
                        <div className={`ob-goal-card ${profile.goal === 'Agg 9-12' ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, goal: 'Agg 9-12' }))}>
                            <div className="goal-icon">⭐</div>
                            <div className="goal-text"><h4>Solid Success</h4><p>Targeting Aggregate 9 - 12</p></div>
                        </div>
                    </>
                );
            case 2:
                return (
                    <>
                        <div className="input-wrapper-elite">
                            <input type="text" className="elite-input-ob" placeholder="Hero Nickname" value={profile.nickname} onChange={e => setProfile(p => ({ ...p, nickname: e.target.value }))} autoFocus />
                        </div>
                        <div className="input-wrapper-elite">
                            <input type="text" className="elite-input-ob" placeholder="Primary School Name" value={profile.school} onChange={e => setProfile(p => ({ ...p, school: e.target.value }))} />
                        </div>
                    </>
                );
            case 3:
                const subs = ['Mathematics', 'Science', 'SST', 'English'];
                return (
                    <div className="chip-box">
                        {subs.map(s => (
                            <button key={s} className={`sub-chip ${profile.preferences.likes.includes(s) ? 'active-love' : ''}`} onClick={() => togglePref(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                );
            case 4:
                return (
                    <div className="ob-avatar-lab">
                        <div className="lab-grid-ob">
                            {avatarOptions.map(seed => (
                                <div key={seed} className={`lab-item-ob ${profile.avatarSeed === seed ? 'active' : ''}`} onClick={() => setProfile(p => ({ ...p, avatarSeed: seed }))}>
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="Avatar" style={{ width: '100%' }} />
                                </div>
                            ))}
                        </div>
                        <button className="btn-lab-shuffle" onClick={() => generateSeeds(profile.nickname)}>
                            🔄 SHUFFLE DNA
                        </button>
                    </div>
                );
            case 5:
                return (
                    <>
                        <div className="input-wrapper-elite">
                            <input type="text" className="elite-input-ob" placeholder="Guardian's Name" value={profile.parent.name} onChange={e => setProfile(p => ({ ...p, parent: { ...p.parent, name: e.target.value } }))} />
                        </div>
                        <div className="input-wrapper-elite">
                            <input type="tel" className="elite-input-ob" placeholder="WhatsApp Number (07...)" value={profile.parent.whatsapp} onChange={e => setProfile(p => ({ ...p, parent: { ...p.parent, whatsapp: e.target.value } }))} />
                        </div>
                    </>
                );
            default: return null;
        }
    };

    const questions = [
        "What is your Target PLE Aggregate?",
        "What shall we call you, Hero?",
        "Which subjects are your Superpowers?",
        "Select your Hero DNA Sequence",
        "Final Step: Connect your Guardian"
    ];

    return (
        <div className="ob-stage">
            <div className="ob-card-container">
                <div className="ob-nav">
                    <span className="ob-step-indicator">Step {step} of 5</span>
                    <div className="ob-progress-track">
                        <div className="ob-progress-fill" style={{ width: `${(step / 5) * 100}%` }}></div>
                    </div>
                </div>
                
                <div className="ob-chat">
                    <div className="manya-bubble-ob">
                        <img src="/assets/images/manya_icon.png" alt="Manya" />
                        <h2>{questions[step - 1]}</h2>
                    </div>
                </div>
                
                <div className="ob-inputs animate-up" key={`step-${step}`}>
                    {renderInputStage()}
                </div>
                
                <div className="ob-footer">
                    <button className={`manya-btn-primary-ob ${step === 5 ? 'finish' : ''}`} onClick={handleNext}>
                        {step === 5 ? "GIVE ME MY POWER →" : "→"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default OnboardingView;
