import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { BADGES, BADGE_CATEGORIES } from '../config/badges';
import { getGem } from '../config/assetUrls';
import '../styles/achievement.css';

function AchievementsView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();

  const unlockedIds = user?.unlockedBadges || [];

  // Subject Treasury Mapping
  const subjectGems = [
      { name: 'Math', val: user?.mathGems || 0, file: 'math_gem.svg', color: '#6366f1' },
      { name: 'Science', val: user?.scienceGems || 0, file: 'science_svg.svg', color: '#10b981' },
      { name: 'SST', val: user?.sstGems || 0, file: 'sst_gem.svg', color: '#f59e0b' },
      { name: 'English', val: user?.englishGems || 0, file: 'english_gem.svg', color: '#db2777' }
  ];

  // Group badges by Category
  const groupedBadges = Object.entries(BADGE_CATEGORIES).map(([key, title]) => {
      return {
          title,
          badges: BADGES.filter(b => b.cat === key)
      };
  });

  const totalBadges = BADGES.length;
  const unlockedCount = unlockedIds.length;
  const pct = (unlockedCount / totalBadges) * 100;

  const renderIcon = (iconName, size = 24) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Award;
    return <Icon size={size} />;
  };

  return (
    <div className="achievements-page animate-in">
        <div className="view-header-back">
            <button className="manya-back-btn" onClick={() => navigate('/profile')}>
                <LucideIcons.ChevronLeft size={24} strokeWidth={3} />
            </button>
            <h2 className="page-title-elite">Trophy Room</h2>
        </div>

        {/* GEM TREASURY (MATTE) */}
        <div className="gem-treasury-card-minimal">
            <span className="vault-label">CURRICULUM VAULT</span>
            <div className="gem-grid-minimal">
                {subjectGems.map(gem => (
                    <div key={gem.name} className="gem-item-minimal">
                        <div className="gem-stone-v2">
                            <img src={getGem(gem.file)} alt={gem.name} />
                        </div>
                        <div className="gem-count-v2" style={{ color: gem.color }}>{gem.val}</div>
                        <div className="gem-label-v2">{gem.name}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* COLLECTION PROGRESS (MODERN) */}
        <div className="collection-card-minimal">
            <div className="prog-label-row">
                <span className="prog-title">GRAND MASTERY</span>
                <span className="prog-count">{unlockedCount} / {totalBadges}</span>
            </div>
            <div className="vault-bar-modern">
                <div className="vault-bar-ink" style={{ width: `${pct}%` }}></div>
            </div>
            <p className="prog-subtext-minimal">Collect all 100 badges to become a Manya Legend.</p>
        </div>

        {/* RENDER DYNAMIC BENTO GROUPS */}
        {groupedBadges.map(group => (
            <div key={group.title} className="badge-category-minimal">
                <h3 className="badge-cat-title">{group.title}</h3>
                
                <div className="badge-grid-minimal">
                    {group.badges.map(badge => {
                        const isUnlocked = unlockedIds.includes(badge.id);
                        return (
                            <div key={badge.id} 
                                 className={`badge-box-minimal ${isUnlocked ? `is-unlocked tier-${badge.tier.toLowerCase()}` : 'is-locked'}`}
                            >
                                <div className="badge-visual-ring">
                                    <span className="badge-icon">
                                        {renderIcon(badge.icon, 22)}
                                    </span>
                                </div>
                                <div className="badge-info">
                                    <span className="badge-name-v2">{badge.name}</span>
                                    {isUnlocked ? (
                                        <span className="badge-tier-tag">{badge.tier}</span>
                                    ) : (
                                        <div className="badge-lock-status">
                                            <LucideIcons.Lock size={10} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}

        <div className="footer-mascot-seal">
            <img src={getGem('manya_council.png') || IMAGES?.manya_icon} alt="Manya Council" />
        </div>
    </div>
  );
}

export default AchievementsView;
