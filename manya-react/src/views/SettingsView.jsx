import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { updateProfile } from '../store/userSlice';
import { setVolume, toggleMute } from '../store/audioSlice';
import { Volume2, VolumeX, Headphones } from 'lucide-react';
import '../styles/setting.css';

function SettingsView() {
  const user = useSelector((state) => state.user.data);
  const { volume, isMuted } = useSelector((state) => state.audio);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formState, setFormState] = useState({
    fullName: user?.fullName || '',
    nickname: user?.nickname || '',
    motto: user?.motto || '',
    theme: user?.theme || 'light',
    subject: user?.preferences?.likes?.[0] || 'Mathematics'
  });

  const [selectedSeed, setSelectedSeed] = useState(user?.avatarSeed || 'Hero_1');
  const [labSeeds, setLabSeeds] = useState([]);

  // Generate 6 random seeds
  const generateSeeds = () => {
    const base = formState.nickname || "Hero";
    const seeds = Array.from({length: 6}, () => `${base}_${Math.floor(Math.random()*99999)}`);
    setLabSeeds(seeds);
    if (!seeds.includes(selectedSeed)) setSelectedSeed(seeds[0]);
  };

  useEffect(() => {
    generateSeeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const toggleTheme = () => {
    const newTheme = formState.theme === 'dark' ? 'light' : 'dark';
    setFormState(prev => ({ ...prev, theme: newTheme }));
    
    // Immediately apply to document for visual feedback
    document.documentElement.setAttribute('data-theme', newTheme);
    // TODO: Dispatch a toast notification here
  };

  const saveHeroChanges = () => {
    // Construct the payload matching the schema of the Redux slice
    dispatch(updateProfile({
        fullName: formState.fullName,
        nickname: formState.nickname,
        motto: formState.motto,
        theme: formState.theme,
        avatarSeed: selectedSeed,
        preferences: { likes: [formState.subject] }
    }));
    
    // TODO: Dispatch Toast "Identity Stabilized!"
    navigate('/profile');
  };

  return (
    <div className="settings-page animate-in">
        {/* HEADER */}
        <div className="lab-header-row">
            <button className="manya-back-btn" onClick={() => navigate('/profile')}>
                <ChevronLeft size={24} strokeWidth={4} />
            </button>
            <h2 style={{ fontWeight: 900, margin: 0 }}>Hero Lab</h2>
        </div>

        {/* NIGHT MODE TOGGLE */}
        <div className="lab-toggle-pill" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>{formState.theme === 'dark' ? '🌕' : '🌑'}</span>
                <span style={{ fontWeight: 900, fontSize: '14px' }}>Night Mode</span>
            </div>
            <div className={`manya-switch ${formState.theme === 'dark' ? 'active' : ''}`} id="theme-trigger"></div>
        </div>

        {/* AUDIO SETTINGS */}
        <div className="dna-vault" style={{ marginTop: '20px', padding: '20px' }}>
            <span className="vault-label">AUDIO MATRIX</span>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', cursor: 'pointer' }} onClick={() => dispatch(toggleMute())}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isMuted ? <VolumeX size={20} color="#EF4444" /> : <Volume2 size={20} color="#818CF8" />}
                    <span style={{ fontWeight: 900, fontSize: '14px', color: 'var(--text-main)' }}>Master Audio</span>
                </div>
                <div className={`manya-switch ${!isMuted ? 'active' : ''}`}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Headphones size={16} color="#818CF8" />
                        <span style={{ fontWeight: 800, fontSize: '12px', color: 'var(--text-muted)' }}>VOLUME</span>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '12px', color: '#818CF8' }}>{Math.round(volume * 100)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={volume} 
                    onChange={(e) => dispatch(setVolume(parseFloat(e.target.value)))}
                    style={{ 
                        width: '100%', 
                        accentColor: '#818CF8',
                        cursor: 'pointer'
                    }}
                />
            </div>
        </div>

        {/* THE DNA VAULT */}
        <div className="dna-vault">
            <span className="vault-label">DNA SEQUENCE</span>
            <div className="lab-grid">
                {labSeeds.map(seed => (
                    <div 
                        key={seed}
                        className={`lab-avatar-item ${selectedSeed === seed ? 'active' : ''}`} 
                        onClick={() => setSelectedSeed(seed)}
                    >
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt="avatar" style={{ width: '100%' }} />
                    </div>
                ))}
            </div>
            <button 
                className="btn-lab-shuffle" 
                style={{ width:'100%', marginTop:'20px', border:'none', background:'transparent', color:'#818CF8', fontWeight:900, fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}} 
                onClick={generateSeeds}
            >
               <RefreshCw size={14} /> GENERATE NEW SEQUENCES
            </button>
        </div>

        {/* IDENTITY MATRIX (FIELDS) */}
        <div className="identity-matrix-grid">
            <div className="lab-field">
                <label className="field-label">Real Name</label>
                <input 
                    type="text" 
                    className="lab-input-elite" 
                    value={formState.fullName} 
                    onChange={e => setFormState(p => ({...p, fullName: e.target.value}))}
                    placeholder="E.g. Musa Okello" 
                />
            </div>

            <div className="lab-field">
                <label className="field-label">Hero Nickname</label>
                <input 
                    type="text" 
                    className="lab-input-elite" 
                    value={formState.nickname} 
                    onChange={e => setFormState(p => ({...p, nickname: e.target.value}))}
                    placeholder="E.g. BrainStorm" 
                />
            </div>

            <div className="lab-field">
                <label className="field-label">Hero Specialty</label>
                <select 
                    className="lab-input-elite"
                    value={formState.subject}
                    onChange={e => setFormState(p => ({...p, subject: e.target.value}))}
                >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="SST">SST</option>
                    <option value="English">English</option>
                </select>
            </div>

            <div className="lab-field">
                <label className="field-label">Battle Cry (Hero Motto)</label>
                <input 
                    type="text" 
                    className="lab-input-elite" 
                    value={formState.motto} 
                    onChange={e => setFormState(p => ({...p, motto: e.target.value}))}
                    placeholder="E.g. First Grade or Nothing!" 
                />
            </div>
        </div>

        <div style={{ height: '40px' }}></div>

        <button className="btn-commit-identity" onClick={saveHeroChanges}>
            Commit Identity
        </button>
    </div>
  );
}

export default SettingsView;
