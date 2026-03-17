import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Award, Moon, Target, Crown, Coins, Megaphone, CheckCircle2, Hash, X, Ruler, Sparkles, Bone, Leaf, Zap, Cloud, FlaskConical, Map, Tent, Scale, Globe2, Shapes, Footprints, PenTool, BookOpen, Library, LibraryBig } from 'lucide-react';
import '../styles/achievement.css';

function AchievementsView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();

  // Custom SVGs mapped to subjects
  const subjectGems = [
      { name: 'Math', val: user?.mathGems || 0, file: 'math_gem.svg', color: 'var(--manya-purple)', glow: 'rgba(124, 58, 237, 0.6)' },
      { name: 'Science', val: user?.scienceGems || 0, file: 'science_svg.svg', color: 'var(--manya-green, #10b981)', glow: 'rgba(16, 185, 129, 0.6)' },
      { name: 'SST', val: user?.sstGems || 0, file: 'sst_gem.svg', color: 'var(--manya-gold)', glow: 'rgba(245, 158, 11, 0.6)' },
      { name: 'English', val: user?.englishGems || 0, file: 'english_gem.svg', color: 'var(--manya-pink)', glow: 'rgba(219, 39, 119, 0.6)' }
  ];

  const badgeGroups = [
      {
          title: "Heroic Discovery",
          badges: [
              { name: "Waddler", icon: <Award size={24} />, unlocked: true, tier: 'bronze' },
              { name: "Night Owl", icon: <Moon size={24} />, unlocked: user?.theme === 'dark', tier: 'silver' },
              { name: "Agg 4 Goal", icon: <Target size={24} />, unlocked: user?.goal?.includes('4'), tier: 'gold' },
              { name: "Elite Hero", icon: <Crown size={24} />, unlocked: user?.status === 'Elite Hero', tier: 'diamond' },
              { name: "Rich Kid", icon: <Coins size={24} />, unlocked: (user?.diamonds || 0) > 500, tier: 'gold' },
              { name: "Socialite", icon: <Megaphone size={24} />, unlocked: false, tier: 'silver' }
          ]
      },
      {
          title: "Math Ninja",
          badges: [
              { name: "Set Pro", icon: <CheckCircle2 size={24} />, unlocked: true, tier: 'bronze', cat: 'cat-math' },
              { name: "Number God", icon: <Hash size={24} />, unlocked: true, tier: 'silver', cat: 'cat-math' },
              { name: "X-Finder", icon: <X size={24} />, unlocked: false, tier: 'gold', cat: 'cat-math' },
              { name: "Geometry", icon: <Ruler size={24} />, unlocked: false, tier: 'silver', cat: 'cat-math' },
              { name: "Math Legend", icon: <Sparkles size={24} />, unlocked: false, tier: 'diamond', cat: 'cat-math' }
          ]
      },
      {
          title: "Science Lab",
          badges: [
              { name: "Biology", icon: <Bone size={24} />, unlocked: true, tier: 'bronze', cat: 'cat-science' },
              { name: "Leaf King", icon: <Leaf size={24} />, unlocked: true, tier: 'silver', cat: 'cat-science' },
              { name: "Energy Whiz", icon: <Zap size={24} />, unlocked: false, tier: 'gold', cat: 'cat-science' },
              { name: "Weather Pro", icon: <Cloud size={24} />, unlocked: false, tier: 'silver', cat: 'cat-science' },
              { name: "Scientist", icon: <FlaskConical size={24} />, unlocked: false, tier: 'diamond', cat: 'cat-science' }
          ]
      },
      {
          title: "SST Explorer",
          badges: [
              { name: "Map Master", icon: <Map size={24} />, unlocked: true, tier: 'bronze', cat: 'cat-sst' },
              { name: "Village Boy", icon: <Tent size={24} />, unlocked: true, tier: 'silver', cat: 'cat-sst' },
              { name: "Civics", icon: <Scale size={24} />, unlocked: false, tier: 'gold', cat: 'cat-sst' },
              { name: "Globe Kid", icon: <Globe2 size={24} />, unlocked: false, tier: 'silver', cat: 'cat-sst' },
              { name: "Africa Giant", icon: <Shapes size={24} />, unlocked: false, tier: 'diamond', cat: 'cat-sst' }
          ]
      },
      {
          title: "English Master",
          badges: [
              { name: "Verb Star", icon: <Footprints size={24} />, unlocked: true, tier: 'bronze', cat: 'cat-english' },
              { name: "Poet", icon: <PenTool size={24} />, unlocked: true, tier: 'silver', cat: 'cat-english' },
              { name: "Speller", icon: <BookOpen size={24} />, unlocked: false, tier: 'gold', cat: 'cat-english' },
              { name: "Story Teller", icon: <Library size={24} />, unlocked: false, tier: 'silver', cat: 'cat-english' },
              { name: "Dictionary", icon: <LibraryBig size={24} />, unlocked: false, tier: 'diamond', cat: 'cat-english' }
          ]
      }
  ];

  const totalBadges = 31; 
  const unlockedCount = badgeGroups.flatMap(g => g.badges).filter(b => b.unlocked).length;
  const pct = (unlockedCount / totalBadges) * 100;

  return (
    <div className="achievements-page animate-in">
       
        <div className="view-header-back">
            <button className="manya-back-btn" onClick={() => navigate('/profile')}>
                <ChevronLeft size={24} strokeWidth={3} />
            </button>
            <h2 className="page-title-elite">Trophy Room</h2>
        </div>

        {/* GEM TREASURY (CUSTOM SVGS) */}
        <div className="gem-treasury-card">
            <span className="vault-label">THE GEM VAULT</span>
            <div className="gem-grid">
                {subjectGems.map(gem => (
                    <div key={gem.name} className="gem-item">
                        <div className="gem-stone" style={{ filter: `drop-shadow(0 8px 15px ${gem.glow})` }}>
                            <img src={`/assets/images/gems/${gem.file}`} alt={gem.name} />
                        </div>
                        <div className="gem-count" style={{ color: gem.color }}>{gem.val}</div>
                        <div className="gem-label">{gem.name}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* COLLECTION PROGRESS */}
        <div className="collection-card-elite">
            <div className="prog-label-row">
                <span className="prog-title">BADGE MASTERY</span>
                <span className="prog-count">{unlockedCount} / {totalBadges}</span>
            </div>
            <div className="vault-bar-track">
                <div className="vault-bar-fill" style={{ width: `${pct}%` }}></div>
            </div>
            <p className="prog-subtext">Unlock all badges to earn the Diamond Crown!</p>
        </div>

        {/* RENDER GROUPS WITH MEDAL STYLING */}
        {badgeGroups.map(group => (
            <div key={group.title} className="badge-category-wrap">
                <div className="badge-cat-header">
                    <span>{group.title}</span>
                    <div className="cat-line"></div>
                </div>
                
                <div className="badge-grid-vault">
                    {group.badges.map(badge => (
                        <div key={badge.name} className={`badge-item-elite ${badge.unlocked ? `badge-is-unlocked tier-${badge.tier}` : 'badge-is-locked'} ${badge.cat || ''}`}>
                            <div className="medal-ring">
                                <span className="b-icon">{badge.unlocked ? badge.icon : '🔒'}</span>
                            </div>
                            <span className="b-name">{badge.name}</span>
                            {badge.unlocked && <div className="tier-label">{badge.tier}</div>}
                        </div>
                    ))}
                </div>
            </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '60px', opacity: 0.1 }}>
            <img src="/assets/images/manya_icon.png" style={{ width: '80px' }} alt="Manya Council" />
        </div>
    </div>
  );
}

export default AchievementsView;
