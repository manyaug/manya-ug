import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, BookA } from 'lucide-react';
import '../styles/library.css';

function LibraryView() {
  const navigate = useNavigate();

  // State
  const [activeSubject, setActiveSubject] = useState(
    localStorage.getItem('manya_lib_sub') || 'math'
  );
  const [curriculum, setCurriculum] = useState(null);
  const [error, setError] = useState(false);
  const [openTopics, setOpenTopics] = useState({});

  const subMeta = {
    math: { name: 'Math', icon: <BookOpen size={20} />, color: '#6366F1' },
    science: { name: 'Science', icon: <FlaskConical size={20} />, color: '#10B981' },
    sst: { name: 'SST', icon: <Globe size={20} />, color: '#F59E0B' },
    english: { name: 'English', icon: <BookA size={20} />, color: '#DB2777' }
  };

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const res = await fetch('/curriculum-master.json');
        if (!res.ok) throw new Error("Manifest Error");
        const rawCurriculum = await res.json();
        
        // Normalize keys to lowercase
        const normalized = {};
        Object.keys(rawCurriculum).forEach(k => {
            normalized[k.toLowerCase()] = rawCurriculum[k];
        });
        setCurriculum(normalized);
      } catch (err) {
        console.error("Library Manifest Load Failed:", err);
        setError(true);
      }
    };
    fetchCurriculum();
  }, []);

  const handleSubjectSwitch = (sub) => {
    setActiveSubject(sub);
    localStorage.setItem('manya_lib_sub', sub);
    setOpenTopics({}); // close all accordions when switching
    // TODO: AudioSFX
  };

  const toggleAccordion = (id) => {
    setOpenTopics(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleLaunchStep = (subject, unitId, questFolder, file, label) => {
    navigate('/quest', {
      state: { subject, unitId, questFolder, file, label }
    });
  };

  const themeColor = subMeta[activeSubject]?.color || '#7c3aed';
  
  // Set theme color CSS variable for children elements
  const pageStyle = {
    '--theme-color': themeColor,
  };

  if (error) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800 }}>
         Curriculum manifest could not be loaded. Please check internet connection.
      </div>
    );
  }

  const currentData = curriculum ? curriculum[activeSubject] : null;

  return (
    <div className="library-page animate-in" style={pageStyle}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ fontWeight: 900, margin: 0, fontSize: '22px', color: 'var(--text-main)' }}>Syllabus Vault</h2>
          <p style={{ margin: '5px 0 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Uganda Primary Seven Curriculum
          </p>
      </div>

      {/* 1. SUBJECT PICKER */}
      <div className="subject-vault-picker">
        {Object.keys(subMeta).map(key => (
            <div 
                key={key}
                className={`sub-vault-btn ${activeSubject === key ? 'active' : ''}`}
                style={{ '--theme-color': subMeta[key].color }}
                onClick={() => handleSubjectSwitch(key)}
            >
                <span className="icon">{subMeta[key].icon}</span>
                <span className="name">{subMeta[key].name}</span>
            </div>
        ))}
      </div>

      {/* 2. CONTENT LIST */}
      <div className="library-content-elite">
        {!currentData ? (
            <p style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontWeight: 800 }}>
                Data for this subject is being synced...
            </p>
        ) : (
            currentData.units.map(unit => (
                <div key={unit.id}>
                    <span className="unit-label-elite">{unit.title}</span>
                    
                    {unit.quests.map((quest, i) => {
                        const cardId = `q-${quest.folder}`;
                        const isOpen = openTopics[cardId];

                        return (
                            <div key={cardId} className={`topic-bento-card ${isOpen ? 'open' : ''}`} id={cardId}>
                                <div className="topic-header-elite" onClick={() => toggleAccordion(cardId)}>
                                    <div className="topic-num-pill">{i + 1}</div>
                                    <h4 className="topic-name-elite">{quest.title}</h4>
                                    <div className="topic-chevron">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m6 9 6 6 6-6"/>
                                        </svg>
                                    </div>
                                </div>
                                
                                <div className="topic-body-elite">
                                    <div className="res-sec">
                                        <span className="res-sec-label">STUDY MATERIAL</span>
                                        <div className="study-grid-elite">
                                            {quest.resources.map(res => (
                                                <button 
                                                    key={res.file}
                                                    className="btn-res-study" 
                                                    onClick={() => handleLaunchStep(activeSubject, unit.id, quest.folder, res.file)}
                                                >
                                                    {res.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="res-sec">
                                        <span className="res-sec-label">PRACTICE CHALLENGES</span>
                                        <div className="practice-grid-elite">
                                            {Array.from({ length: quest.practiceCount }, (_, q) => {
                                                const qID = `${quest.prefix}-${String(q+1).padStart(3, '0')}`;
                                                return (
                                                    <button 
                                                        key={qID}
                                                        className="btn-res-practice" 
                                                        onClick={() => handleLaunchStep(activeSubject, unit.id, quest.folder, qID)}
                                                    >
                                                        {q + 1}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.1 }}>
          <img src="/assets/images/manya_icon.png" style={{ width: '60px' }} alt="Manya Logo" />
      </div>
    </div>
  );
}

export default LibraryView;
