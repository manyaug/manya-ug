import { ManyaDB } from '../manya-db.js';
import { AudioManager } from '/app-shell/js/audio-manager.js';
import { HUDManager } from '/app-shell/js/hud-manager.js';

export const renderQuestPath = async (mount, params) => {
    const user = await ManyaDB.getCurrentUser();
    const { unitId, subject, title } = params;
    const sub = subject.toLowerCase();

    const gemMap = {
        math: 'math_gem.svg',
        science: 'science_svg.svg', 
        sst: 'sst_gem.svg',
        english: 'english_gem.svg'
    };
    const gemIcon = `assets/images/gems/${gemMap[sub] || 'master_gem.svg'}`;

    const steps = [
        { id: 'warmup', label: 'Warmup', icon: '🏃‍♂️' },
        { id: 'exploration', label: 'Exploration', icon: '🔍' },
        { id: 'practice', label: 'Practice', icon: '⚡' },
        { id: 'reinforcement', label: 'Reinforcement', icon: '🧠' },
        { id: 'mastery', label: 'Boss Chest', icon: '🎁', isChest: true }
    ];

    const currentStepIndex = 1; 
    const totalQuestGems = 15;
    const earnedQuestGems = 5;
    const headerProgress = (earnedQuestGems / totalQuestGems) * 100;

    mount.innerHTML = `
        <div class="quest-path-root animate-in">
            
            <!-- TOP GAMIFIED HEADER -->
            <div class="quest-top-header">
                <button class="back-to-map-btn" onclick="ViewManager.show('spiral', null, '${subject}')">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div class="header-info">
                    <div class="header-subtitle">${subject.toUpperCase()} QUEST</div>
                    <div class="header-title">${title || 'Find connections'}</div>
                    <div class="header-progress-bar">
                        <div class="header-progress-fill" style="width: ${headerProgress}%"></div>
                    </div>
                </div>
                <div class="header-stats">
                    <img src="${gemIcon}" class="header-gem-icon">
                    <span>${earnedQuestGems}/${totalQuestGems}</span>
                </div>
            </div>

            <!-- SCROLLING PATH -->
            <div class="path-scroller" id="path-scroll">
                
                <div class="env-decoration decor-left"></div>
                <div class="env-decoration decor-right"></div>

                <div class="path-container">
                    
                    <svg class="path-line-svg" viewBox="0 0 100 800" preserveAspectRatio="none">
                        <!-- THEME UPDATE: stroke uses var(--border-color) -->
                        <path d="M50,800 C100,600 0,400 50,200 C100,50 50,0 50,0" 
                              fill="none" stroke="var(--border-color)" stroke-width="12" stroke-linecap="round"/>
                        <path d="M50,800 C100,600 0,400 50,200 C100,50 50,0 50,0" 
                              fill="none" stroke="var(--biome-color)" stroke-width="12" stroke-linecap="round"
                              stroke-dasharray="1000" stroke-dashoffset="${1000 - (1000 * (currentStepIndex/steps.length))}" 
                              style="transition: stroke-dashoffset 1s ease;"/>
                    </svg>

                    ${steps.map((step, i) => {
                        const isCompleted = i < currentStepIndex;
                        const isActive = i === currentStepIndex;
                        const isLocked = i > currentStepIndex;
                        
                        let stateClass = 'locked';
                        if (isCompleted) stateClass = 'completed';
                        if (isActive) stateClass = 'active';

                        const nodeGemsEarned = isCompleted ? 3 : (isActive ? 2 : 0);

                        return `
                        <div class="path-step-wrapper ${stateClass} ${step.isChest ? 'chest-node' : ''}">
                            
                            ${!step.isChest ? `
                            <div class="node-gem-rating">
                                <img src="${gemIcon}" class="mini-gem ${nodeGemsEarned >= 1 ? 'earned' : 'empty'}">
                                <img src="${gemIcon}" class="mini-gem ${nodeGemsEarned >= 2 ? 'earned' : 'empty'} top-gem">
                                <img src="${gemIcon}" class="mini-gem ${nodeGemsEarned >= 3 ? 'earned' : 'empty'}">
                            </div>
                            ` : ''}

                            <button class="tactile-node" 
                                 onclick="${!isLocked ? `window.launchLibraryStep('${sub}', '${unitId}', 'q1', 'step${i+1}')` : ''}">
                                
                                ${isActive ? `<div class="active-pulse-ring"></div>` : ''}

                                <div class="node-icon-inner">
                                    ${isLocked && !step.isChest ? '🔒' : step.icon}
                                </div>
                                
                                ${isActive ? `
                                    <div class="hero-path-pointer">
                                        <div class="hero-bubble">
                                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}">
                                        </div>
                                    </div>
                                ` : ''}
                            </button>
                            
                            <span class="path-step-label">${step.label}</span>
                        </div>`;
                    }).reverse().join('')} 
                </div>
            </div>
        </div>`;

    const scroller = document.getElementById('path-scroll');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
};