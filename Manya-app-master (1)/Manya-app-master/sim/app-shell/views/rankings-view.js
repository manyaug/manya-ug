export const renderRankings = (mount) => {
    mount.innerHTML = `
    <div class="rank-view animate-in">
        <h3 class="section-title">National Rankings</h3>
        
        <!-- THE PODIUM -->
        <div class="podium-container">
            <div class="pod-rank silver"><span>2</span><div class="av">🦜</div><p>Sarah</p></div>
            <div class="pod-rank gold"><span>1</span><div class="av">🦆</div><p>Manya</p></div>
            <div class="pod-rank bronze"><span>3</span><div class="av">🐱</div><p>Kiki</p></div>
        </div>

        <!-- THE LIST -->
        <div class="rank-list bento-card">
            ${[4,5,6,7,8].map(r => `
                <div class="rank-row">
                    <span class="num">#${r}</span>
                    <span class="name">Student Name</span>
                    <span class="score">12,400 XP</span>
                </div>
            `).join('')}
        </div>
    </div>`;
};