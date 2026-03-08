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
            <!-- 1. HEADER -->
            <div style="text-align:center; padding: 10px 0;">
                <h2 style="font-weight:900; margin:0; font-size:24px;">National Arena</h2>
                <p style="margin:5px 0 0; font-size:12px; font-weight:700; color:#94A3B8;">PRIMARY SEVEN LEADERBOARD</p>
            </div>

            <!-- 2. SUBJECT TABS -->
            <div class="rank-tabs">
                ${subjects.map(s => `
                    <div class="tab-pill ${activeTab === s ? 'active' : ''}" onclick="window.switchRankTab('${s}')">
                        ${s.toUpperCase()}
                    </div>
                `).join('')}
            </div>

            <!-- 3. THE GOLDEN PODIUM -->
            <div class="podium-arena">
                <div class="pod-card rank-2">
                    <div class="pod-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" style="width:100%"></div>
                    <p>Sarah .A</p>
                    <span class="xp">14,200 XP</span>
                </div>

                <div class="pod-card rank-1">
                    <div class="pod-avatar"><img src="${userAvatar}" style="width:100%"></div>
                    <p>YOU</p>
                    <span class="xp">${(user.xp || 15000).toLocaleString()} XP</span>
                </div>

                <div class="pod-card rank-3">
                    <div class="pod-avatar"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Musa" style="width:100%"></div>
                    <p>Musa .O</p>
                    <span class="xp">12,800 XP</span>
                </div>
            </div>

            <!-- 4. THE ELITE LIST -->
            <div class="elite-list-container">
                <h4 style="font-size:11px; font-weight:900; color:#94A3B8; text-transform:uppercase; letter-spacing:1px; margin-bottom:15px;">Top Competitors</h4>
                
                ${[4, 5, 6, 7, 8, 9].map(r => `
                    <div class="elite-rank-row">
                        <span class="r-num">#${r}</span>
                        <div class="r-av"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Student${r}" style="width:100%"></div>
                        <div class="r-info">
                            <span class="r-name">Scholar Hero ${r}</span>
                        </div>
                        <span class="r-xp">${(12000 - (r * 800)).toLocaleString()} XP</span>
                    </div>
                `).join('')}

                <!-- MOCK: If user was lower rank, this would be the sticky item -->
                <div class="elite-rank-row is-user">
                    <span class="r-num">#24</span>
                    <div class="r-av"><img src="${userAvatar}" style="width:100%"></div>
                    <div class="r-info">
                        <span class="r-name">${user.nickname} (YOU)</span>
                    </div>
                    <span class="r-xp">${(user.xp || 0).toLocaleString()} XP</span>
                </div>
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