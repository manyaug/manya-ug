import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { BADGES, BADGE_CATEGORIES } from '../config/badges';
import { getGem, IMAGES } from '../config/assetUrls';
import '../styles/achievement.css';
import '../styles/badge-celebration.css';

function AchievementsView() {
  const user = useSelector((state) => state.user.data);
  const navigate = useNavigate();

  const unlockedIds = user?.unlockedBadges || [];

  // Subject Treasury Mapping
  const subjectGems = [
      { name: 'Math', val: user?.mathGems || 0, img: getGem('math_gem.svg'), color: '#6366f1' },
      { name: 'Science', val: user?.scienceGems || 0, img: getGem('science_gem.svg'), color: '#10b981' },
      { name: 'SST', val: user?.sstGems || 0, img: getGem('sst_gem.svg'), color: '#f59e0b' },
      { name: 'English', val: user?.englishGems || 0, img: getGem('english_gem.svg'), color: '#db2777' }
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

  // Dynamic Shape Mapping (Matches Celebration Modal)
  const getShapeClass = (tier) => {
    const t = tier.toUpperCase();
    if (t === 'GOLD' || t === 'PLATINUM' || t === 'DIAMOND') return 'shape-royal';
    if (t === 'SILVER') return 'shape-spade';
    return 'shape-heater'; // Bronze
  };

  const renderIcon = (iconName, size = 24) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Award;
    return <Icon size={size} strokeWidth={2.5} />;
  };

  return (
    <div className="achievements-page animate-in">
        <div className="view-header-back !mb-2">
            <button className="manya-back-btn" onClick={() => navigate('/profile')}>
                <LucideIcons.ChevronLeft size={24} strokeWidth={3} />
            </button>
            <h2 className="page-title-elite !text-xl">Trophy Room</h2>
        </div>

        {/* GEM TREASURY (MATTE) */}
        <div className="gem-treasury-card-minimal !p-3 !mb-3">
            <span className="vault-label">CURRICULUM VAULT</span>
            <div className="gem-grid-minimal !gap-2">
                {subjectGems.map(gem => (
                    <div key={gem.name} className="gem-item-minimal">
                        <div className="gem-stone-v2 !h-10 !w-10">
                            <img src={gem.img} alt={gem.name} />
                        </div>
                        <div className="gem-count-v2 !text-sm" style={{ color: gem.color }}>{gem.val}</div>
                        <div className="gem-label-v2 !text-[9px]">{gem.name}</div>
                    </div>
                ))}
            </div>
        </div>

        {/* COLLECTION PROGRESS (MODERN) */}
        <div className="collection-card-minimal !p-3 !mb-4">
            <div className="prog-label-row">
                <span className="prog-title !text-xs">GRAND MASTERY</span>
                <span className="prog-count !text-xs">{unlockedCount} / {totalBadges}</span>
            </div>
            <div className="vault-bar-modern !h-1.5">
                <div className="vault-bar-ink" style={{ width: `${pct}%` }}></div>
            </div>
        </div>

        {/* RENDER DYNAMIC BENTO GROUPS */}
        {groupedBadges.map(group => (
            <div key={group.title} className="badge-category-minimal !mb-4">
                <h3 className="badge-cat-title !text-xs opacity-60 mb-2">{group.title}</h3>
                
                <div className="badge-grid-minimal">
                    {group.badges.map(badge => {
                        const isUnlocked = unlockedIds.includes(badge.id);
                        const tierClass = `tier-${badge.tier.toLowerCase()}`;
                        const shapeClass = getShapeClass(badge.tier);

                        return (
                            <div key={badge.id} 
                                 className={`badge-box-minimal ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${tierClass}`}
                            >
                                <div className={`badge-crest-vault ${shapeClass} !w-14 !h-16 !mb-1`}>
                                    <div className="badge-icon-reveal !scale-50 !flex !items-center !justify-center">
                                        {renderIcon(badge.icon, 32)}
                                    </div>
                                    {isUnlocked && <div className="badge-shine-effect" />}
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                            <LucideIcons.Lock size={12} className="text-white/40" />
                                        </div>
                                    )}
                                </div>
                                <div className="badge-info !gap-0">
                                    <span className="badge-name-v2 !text-[9px] leading-tight truncate px-1">{badge.name}</span>
                                    {isUnlocked && <span className="badge-tier-tag !text-[7px] py-0 px-1">{badge.tier}</span>}
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
