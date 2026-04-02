// public/js/components/gemDisplay.js
const GemDisplay = {
    gems: {
        math: { count: 0, icon: '/multimedia_assets/gems/math_gem.svg', name: 'Math Gem' },
        english: { count: 0, icon: '/multimedia_assets/gems/english_gem.svg', name: 'English Gem' },
        science: { count: 0, icon: '/multimedia_assets/gems/science_svg.svg', name: 'Science Gem' },
        social: { count: 0, icon: '/multimedia_assets/gems/sst_gem.svg', name: 'Social Studies Gem' },
        master: { count: 0, icon: '/multimedia_assets/gems/master_gem.svg', name: 'Master Gem' }
    },
    
    async loadGems(userId) {
        try {
            const response = await fetch(`/api/gamification/gems/${userId}`);
            const data = await response.json();
            
            if (data.subjectGems) {
                this.gems.math.count = data.subjectGems.math || 0;
                this.gems.english.count = data.subjectGems.english || 0;
                this.gems.science.count = data.subjectGems.science || 0;
                this.gems.social.count = data.subjectGems.social || 0;
                this.gems.master.count = data.overallGems || 0;
            }
            
            this.render();
            return this.gems;
        } catch (err) {
            console.error('Error loading gems:', err);
            return this.gems;
        }
    },
    
    render() {
        let container = document.getElementById('gem-display');
        if (!container) {
            container = document.createElement('div');
            container.id = 'gem-display';
            container.className = 'gem-display-container';
            const dashboard = document.querySelector('.dashboard-section');
            if (dashboard) {
                dashboard.insertBefore(container, dashboard.firstChild);
            }
        }
        
        container.innerHTML = `
            <div class="gem-header">
                <h3>💎 Your Gems</h3>
            </div>
            <div class="gem-grid">
                ${Object.entries(this.gems).map(([key, gem]) => `
                    <div class="gem-card" data-gem="${key}">
                        <div class="gem-icon">
                            <img src="${gem.icon}" alt="${gem.name}" class="gem-svg" onerror="this.style.display='none'; this.parentElement.innerHTML='${gem.name[0]}'">
                        </div>
                        <div class="gem-info">
                            <div class="gem-name">${gem.name}</div>
                            <div class="gem-count">${gem.count}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.injectStyles();
    },
    
    updateGem(subject, newCount) {
        if (this.gems[subject]) {
            const oldCount = this.gems[subject].count;
            this.gems[subject].count = newCount;
            this.animateGemChange(subject, newCount - oldCount);
            this.render();
        }
    },
    
    animateGemChange(subject, change) {
        const gemCard = document.querySelector(`.gem-card[data-gem="${subject}"]`);
        if (!gemCard) return;
        
        gemCard.classList.add('gem-shine');
        setTimeout(() => gemCard.classList.remove('gem-shine'), 500);
        
        if (change > 0) {
            const floatNumber = document.createElement('div');
            floatNumber.className = 'gem-float-number';
            floatNumber.textContent = `+${change}`;
            floatNumber.style.cssText = `
                position: fixed;
                pointer-events: none;
                color: gold;
                font-weight: bold;
                font-size: 1.2em;
                animation: floatUp 1s ease-out forwards;
                z-index: 1000;
            `;
            
            const rect = gemCard.getBoundingClientRect();
            floatNumber.style.left = `${rect.left + rect.width / 2}px`;
            floatNumber.style.top = `${rect.top}px`;
            
            document.body.appendChild(floatNumber);
            setTimeout(() => floatNumber.remove(), 1000);
            
            if (window.MANYAAudioSystem) {
                window.MANYAAudioSystem.playGemCollect();
            }
            if (window.MANYACharacterSystem) {
                window.MANYACharacterSystem.onGemCollect(change);
            }
        }
    },
    
    injectStyles() {
        if (document.getElementById('gem-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'gem-styles';
        style.textContent = `
            .gem-display-container {
                background: white;
                border-radius: 15px;
                padding: 15px;
                margin-bottom: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .gem-header h3 {
                margin: 0 0 15px 0;
                color: #2d3748;
                font-size: 1.1em;
            }
            .gem-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
                gap: 10px;
            }
            .gem-card {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                background: #f7fafc;
                border-radius: 12px;
                transition: all 0.3s;
                cursor: pointer;
            }
            .gem-card:hover {
                transform: translateY(-2px);
                background: #edf2f7;
            }
            .gem-card.gem-shine {
                animation: gemShine 0.5s ease;
            }
            @keyframes gemShine {
                0% { background: #f7fafc; }
                50% { background: #fef5e7; box-shadow: 0 0 15px gold; }
                100% { background: #f7fafc; }
            }
            .gem-icon {
                width: 35px;
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2em;
                font-weight: bold;
            }
            .gem-svg {
                width: 100%;
                height: 100%;
                object-fit: contain;
            }
            .gem-info {
                flex: 1;
            }
            .gem-name {
                font-size: 0.7em;
                color: #718096;
            }
            .gem-count {
                font-size: 1.1em;
                font-weight: bold;
                color: #2d3748;
            }
            @keyframes floatUp {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-50px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
};

window.GemDisplay = GemDisplay;