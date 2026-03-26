// public/js/dashboard.js
const Dashboard = {
    elements: {
        totalAnswered: document.getElementById('totalAnswered'),
        overallAccuracy: document.getElementById('overallAccuracy'),
        totalPoints: document.getElementById('totalPoints'),
        points: document.getElementById('points'),
        topicsList: document.getElementById('topicsList')
    },

    async loadAll() {
        console.log('📊 Dashboard loading...');
        await this.loadStats();
        await this.loadTopics();
    },

    async loadStats() {
        try {
            const res = await fetch(`/api/user-stats/${window.currentUser}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const stats = await res.json();
            console.log('✅ Stats loaded:', stats);
            
            if (this.elements.totalAnswered) {
                this.elements.totalAnswered.textContent = stats.summary?.totalAnswered || 0;
            }
            
            if (this.elements.overallAccuracy) {
                this.elements.overallAccuracy.textContent = (stats.summary?.overallAccuracy || 0) + '%';
            }
            
            if (this.elements.totalPoints) {
                this.elements.totalPoints.textContent = stats.summary?.totalPoints || 0;
            }
            
            if (this.elements.points) {
                this.elements.points.textContent = `⭐ ${stats.summary?.totalPoints || 0}`;
            }
            
        } catch (err) {
            console.error('❌ Error loading stats:', err);
        }
    },

    async loadTopics() {
        try {
            const res = await fetch(`/api/user-stats/${window.currentUser}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const stats = await res.json();
            
            if (!this.elements.topicsList) return;
            
            if (stats.topics?.length) {
                this.elements.topicsList.innerHTML = stats.topics.map(t => {
                    let color = '#718096';
                    if (t.accuracy >= 80) color = '#48bb78';
                    else if (t.accuracy >= 60) color = '#667eea';
                    else if (t.accuracy >= 40) color = '#ed8936';
                    else color = '#f56565';
                    
                    return `
                        <div class="topic-item">
                            <span>${t.Topic}</span>
                            <span style="color: ${color}; font-weight: bold;">${t.accuracy}%</span>
                        </div>
                    `;
                }).join('');
            } else {
                this.elements.topicsList.innerHTML = '<div style="color: #718096;">Answer questions to see mastery!</div>';
            }
        } catch (err) {
            console.error('❌ Error loading topics:', err);
        }
    },

    updatePoints(points) {
        if (this.elements.points) {
            const current = parseInt(this.elements.points.textContent.split(' ')[1]) || 0;
            this.elements.points.textContent = `⭐ ${current + points}`;
        }
        this.loadStats();
    }
};

// Make globally available
window.Dashboard = Dashboard;