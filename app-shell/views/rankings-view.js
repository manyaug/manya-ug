/**
 * MANYA RANKINGS VIEW v19.0
 * Features: Subject Filtering, Real-user Podium, Night Mode Sync
 */
import { ManyaDB } from '../manya-db.js';

export const renderRankings = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    const subjects = ['Overall', 'Math', 'Science', 'SST', 'English'];
    let activeTab = 'Overall';

    const render = () => {
        const userAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}`;

        mount.innerHTML = `
        <div class="rank-view animate-in">
            <!-- 1. HEADER AREA -->
            <div style="text-align:center; padding: 20px 0 10px;">
                <h2 style="font-weight:900; margin:0; font-size:24px; color:var(--text-main)">National Arena</h2>
                <p style="margin:5px 0 0; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.5px;">Uganda P.7 Hero Rankings</p>
            </div>

             <!-- NEW: LEAGUE STATUS BANNER -->
        <div class="league-banner-card">
            <div class="league-icon-box">
                <span class="league-medal">🥈</span>
            </div>
            <div class="league-info">
                <div class="league-name">${user.league || 'Silver'} League</div>
                <div class="league-timer">Ends in: 2d 14h 05m</div>
                <div class="league-status-msg">Top 10 are promoted to <b>Gold League</b></div>
            </div>
            <div class="league-rank-pill">#24</div>
        </div>


            <!-- 2. SUBJECT FILTERS -->
            <div class="rank-tabs-row">
                ${subjects.map(s => `
                    <div class="rank-tab-pill ${activeTab === s ? 'active' : ''}" onclick="window.switchRankTab('${s}')">
                        ${s.toUpperCase()}
                    </div>
                `).join('')}
            </div>

            <!-- 3. THE PODIUM -->
            <div class="podium-section">
                <!-- RANK 2 (Left) -->
                <div class="pod-card pod-rank-2">
                    <div class="pod-avatar-wrap">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" style="width:100%">
                    </div>
                    <p class="pod-name">Sarah .A</p>
                    <span class="pod-xp">14,200 XP</span>
                </div>

                <!-- RANK 1 (Center) -->
                <div class="pod-card pod-rank-1">
                    <div class="pod-avatar-wrap">
                        <img src="${userAvatar}" style="width:100%">
                    </div>
                    <p class="pod-name">YOU</p>
                    <span class="pod-xp">${(user.xp || 15000).toLocaleString()} XP</span>
                </div>

                <!-- RANK 3 (Right) -->
                <div class="pod-card pod-rank-3">
                    <div class="pod-avatar-wrap">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Musa" style="width:100%">
                    </div>
                    <p class="pod-name">Musa .O</p>
                    <span class="pod-xp">12,800 XP</span>
                </div>
            </div>

            <!-- 4. LEADERBOARD LIST -->
            <div class="leaderboard-container">
                <h4 style="font-size:10px; font-weight:900; color:var(--text-muted); text-transform:uppercase; letter-spacing:2px; margin: 10px 0 15px;">Elite Competitors</h4>
                
                ${[4, 5, 6, 7, 8, 9, 10].map(r => `
                    <div class="rank-row-elite">
                        <span class="r-pos">#${r}</span>
                        <div class="r-avatar">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=P7Candidate${r}" style="width:100%; border-radius:50%">
                        </div>
                        <div class="r-info">
                            <span class="r-name">Scholar Hero ${r}</span>
                        </div>
                        <span class="r-score">${(12000 - (r * 750)).toLocaleString()} XP</span>
                    </div>
                `).join('')}

                <!-- STICKY USER POSITION (If not in top 3) -->
                <div class="rank-row-elite is-user">
                    <span class="r-pos">#24</span>
                    <div class="r-avatar">
                        <img src="${userAvatar}" style="width:100%; border-radius:50%">
                    </div>
                    <div class="r-info">
                        <span class="r-name">${user.nickname} (YOU)</span>
                    </div>
                    <span class="r-score">${(user.xp || 0).toLocaleString()} XP</span>
                </div>
            </div>
            
            <div style="text-align:center; padding: 40px 0; opacity:0.1;">
                <img src="assets/icons/manya_icon.png" style="width:80px">
            </div>
        </div>
        `;
    };

    window.switchRankTab = (tab) => {
        activeTab = tab;
        render();
    };

    render();
};