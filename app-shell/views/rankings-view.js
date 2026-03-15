/**
 * MANYA RANKINGS VIEW v22.0
 * Features: Gem-Integrated Tabs, Subject-Aware Podium, National Hero Badges
 */
import { ManyaDB } from '../manya-db.js';

export const renderRankings = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    const subjects = [
        { id: 'Overall', label: 'Overall', gem: 'master_gem.svg', color: 'var(--manya-purple)' },
        { id: 'Math', label: 'Math', gem: 'math_gem.svg', color: '#6366F1' },
        { id: 'Science', label: 'Science', gem: 'science_svg.svg', color: '#10B981' },
        { id: 'SST', label: 'SST', gem: 'sst_gem.svg', color: '#F59E0B' },
        { id: 'English', label: 'English', gem: 'english_gem.svg', color: '#DB2777' }
    ];
    
    let activeTabId = 'Overall';

    const render = () => {
        const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`;
        const activeSub = subjects.find(s => s.id === activeTabId);

        mount.innerHTML = `
        <div class="rank-view animate-in">
            
            <!-- 1. HEADER AREA -->
            <div class="rank-arena-header">
                <div class="live-pulse-dot"></div>
                <h2 class="arena-title">National Arena</h2>
                <p class="arena-subtitle">Uganda P.7 Hero Rankings</p>
            </div>

            <!-- 2. LEAGUE STATUS BANNER (Polished) -->
            <div class="league-banner-elite">
                <div class="league-medal-orb">
                    <span>🥈</span>
                </div>
                <div class="league-content">
                    <div class="league-name-row">
                        <span class="l-title">${user.league || 'Silver'} League</span>
                        <span class="l-timer"><i class="far fa-clock"></i> 2d 14h</span>
                    </div>
                    <div class="league-promo-track">
                        <div class="promo-fill" style="width: 65%"></div>
                    </div>
                    <div class="league-status-msg">Top 10 promote to <b>Gold</b></div>
                </div>
                <div class="league-rank-badge">#24</div>
            </div>

            <!-- 3. SUBJECT GEMS SCROLL -->
            <div class="rank-tabs-row">
                ${subjects.map(s => `
                    <div class="rank-tab-pill ${activeTabId === s.id ? 'active' : ''}" 
                         onclick="window.switchRankTab('${s.id}')"
                         style="${activeTabId === s.id ? `--tab-color: ${s.color}` : ''}">
                        <img src="assets/images/gems/${s.gem}" class="tab-gem-icon">
                        <span>${s.label}</span>
                    </div>
                `).join('')}
            </div>

            <!-- 4. THE SUBJECT PODIUM -->
            <div class="podium-section" style="--sub-glow: ${activeSub.color}">
                
                <!-- RANK 2 (Silver) -->
                <div class="pod-card pod-rank-2">
                    <div class="pod-avatar-wrap">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah">
                    </div>
                    <p class="pod-name">Sarah .A</p>
                    <div class="pod-score-pill">
                        <img src="assets/images/gems/${activeSub.gem}" class="pod-gem">
                        <span>14.2k</span>
                    </div>
                </div>

                <!-- RANK 1 (Gold) -->
                <div class="pod-card pod-rank-1">
                    <div class="pod-avatar-wrap">
                        <img src="${userAvatar}" alt="You">
                    </div>
                    <p class="pod-name">YOU</p>
                    <div class="pod-score-pill">
                        <img src="assets/images/gems/${activeSub.gem}" class="pod-gem">
                        <span>${((user.xp || 15000)/1000).toFixed(1)}k</span>
                    </div>
                </div>

                <!-- RANK 3 (Bronze) -->
                <div class="pod-card pod-rank-3">
                    <div class="pod-avatar-wrap">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Musa" alt="Musa">
                    </div>
                    <p class="pod-name">Musa .O</p>
                    <div class="pod-score-pill">
                        <img src="assets/images/gems/${activeSub.gem}" class="pod-gem">
                        <span>12.8k</span>
                    </div>
                </div>
            </div>

            <!-- 5. LEADERBOARD LIST -->
            <div class="leaderboard-card-elite">
                <div class="list-header">
                    <span>ELITE COMPETITORS</span>
                    <span>GEMS EARNED</span>
                </div>
                
                ${[4, 5, 6, 7, 8, 9, 10].map(r => `
                    <div class="rank-row-elite">
                        <span class="r-pos">#${r}</span>
                        <div class="r-avatar">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=P7Candidate${r}">
                        </div>
                        <div class="r-info">
                            <span class="r-name">Scholar Hero ${r}</span>
                            <span class="r-xp">${(12000 - (r * 750)).toLocaleString()} XP</span>
                        </div>
                        <div class="r-stat">
                            <img src="assets/images/gems/${activeSub.gem}" class="r-gem">
                            <span class="r-gem-count">${35 - r}</span>
                        </div>
                    </div>
                `).join('')}

                <!-- STICKY USER POSITION -->
                <div class="rank-row-elite is-user">
                    <span class="r-pos">#24</span>
                    <div class="r-avatar">
                        <img src="${userAvatar}">
                    </div>
                    <div class="r-info">
                        <span class="r-name">${user.nickname || 'You'} (YOU)</span>
                        <span class="r-xp">${(user.xp || 0).toLocaleString()} XP</span>
                    </div>
                    <div class="r-stat">
                        <img src="assets/images/gems/${activeSub.gem}" class="r-gem">
                        <span class="r-gem-count">${user.mathGems || 12}</span>
                    </div>
                </div>
            </div>
            
            <div class="rank-footer">
                <img src="assets/images/manya_icon.png">
                <p>Manya National Hero Council</p>
            </div>
        </div>
        `;
    };

    window.switchRankTab = (tabId) => {
        activeTabId = tabId;
        render();
    };

    render();
};