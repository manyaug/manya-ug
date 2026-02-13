import { QuestFactory } from '../quest-factory.js';
import { QuestRunner } from '../quest-runner.js';
import { ViewManager } from '../view-manager.js';

export const renderSpiral = (mount, subject) => {
    
    // 1. DATA: List topics in order (1 to 14)
    const scienceSyllabus = [
        { id: "quest_1_types_of_skeletons", title: "Skeleton Types" },
        { id: "quest_2_human_skeleton", title: "Human Framework" },
        { id: "quest_3_axial_skull_spine", title: "Skull & Backbone" },
        { id: "quest_4_axial_rib_cage", title: "The Rib Cage" },
        { id: "quest_5_appendicular_limbs", title: "The Limbs" }
    ];

    // 2. GENERATE NODES: 4 per sub-topic
    let nodes = [];
    scienceSyllabus.forEach(topic => {
        nodes.push({ id: topic.id, type: 'WARMUP', label: '1. Warm-Up', icon: '🌱' });
        nodes.push({ id: topic.id, type: 'STUDY', label: '2. Research', icon: '🔬' });
        nodes.push({ id: topic.id, type: 'PRACTICE', label: '3. Lab Drill', icon: '⚡' });
        nodes.push({ id: topic.id, type: 'MASTERY', label: '4. Lab Mastery', icon: '🏆' });
    });

    // REVERSE THE ENTIRE LIST: Now Node 0 is visually at the bottom, but logic is standard
    nodes = nodes.reverse();

    // 3. PROGRESS LOGIC
    // We need to know which index is "Active" in the REVERSED list
    const actualProgress = parseInt(localStorage.getItem(`manya_prog_${subject}`) || 0);
    // Convert actual progress to the index in the reversed array
    const activeIndexInUI = (nodes.length - 1) - actualProgress;

    const points = localStorage.getItem('manya_points') || 0;

    mount.innerHTML = `
        <div class="spiral-view animate-in">
            <div class="lab-grid"></div>

            <header class="pro-header">
                <button class="icon-btn" onclick="ViewManager.show('home')">←</button>
                <div class="header-pill points">⭐ <span id="display-points">${points}</span></div>
                <div class="header-pill active-tag">SCIENCE HUB</div>
            </header>

            <div class="spiral-map-container" id="scroll-frame">
                <svg id="road-svg" class="road-svg-layer">
                    <path id="road-line" d="" fill="none" stroke="#e2e8f0" stroke-width="20" stroke-linecap="round"/>
                    <path id="road-dots" d="" fill="none" stroke="#10b981" stroke-width="4" stroke-dasharray="1, 20" stroke-linecap="round" opacity="0.5"/>
                </svg>

                <div class="nodes-column">
                    ${nodes.map((n, i) => {
                        // Correctly identify status based on original index
                        const originalIdx = (nodes.length - 1) - i;
                        const status = originalIdx < actualProgress ? 'completed' : (originalIdx === actualProgress ? 'active' : 'locked');
                        const side = i % 2 === 0 ? 'node-right' : 'node-left';
                        
                        return `
                        <div class="node-row ${side}">
                            <div id="node-${originalIdx}" class="game-node ${status}" 
                                 onclick="window.launchLabNode('${subject}', '${n.id}', '${n.type}', ${originalIdx})">
                                <div class="node-cap">${status === 'completed' ? '✅' : n.icon}</div>
                                <div class="node-base"></div>
                                <div class="node-label-pro">${n.label}</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;

    // 4. THE POSITIONING ENGINE (The Fix)
    const locateCurrentLevel = () => {
        const frame = document.getElementById('scroll-frame');
        const activeNode = document.getElementById(`node-${actualProgress}`);
        const roadSvg = document.getElementById('road-svg');
        const roadLine = document.getElementById('road-line');
        const roadDots = document.getElementById('road-dots');

        if (!activeNode || !frame) return;

        // A. Draw Road
        roadSvg.setAttribute('height', frame.scrollHeight);
        roadSvg.setAttribute('width', frame.clientWidth);
        
        let d = "";
        for (let i = 0; i < nodes.length; i++) {
            const originalIdx = (nodes.length - 1) - i;
            const el = document.getElementById(`node-${originalIdx}`);
            const nx = el.offsetLeft + (el.offsetWidth / 2);
            const ny = el.offsetTop + (el.offsetHeight / 2);
            d += (i === 0 ? "M" : "L") + ` ${nx} ${ny} `;
        }
        roadLine.setAttribute('d', d);
        roadDots.setAttribute('d', d);

        // B. SCROLL TO NODE (Center Camera)
        const offsetTop = activeNode.offsetTop;
        const frameHeight = frame.offsetHeight;
        frame.scrollTop = offsetTop - (frameHeight / 2) + 40;
    };

    // Trigger three times to ensure images and animations don't block the scroll
    locateCurrentLevel(); 
    setTimeout(locateCurrentLevel, 100);
    setTimeout(locateCurrentLevel, 500);
};

window.launchLabNode = async (sub, tid, type, idx) => {
    if(idx > parseInt(localStorage.getItem(`manya_prog_${sub}`) || 0)) return;
    const manifest = await QuestFactory.build(sub, tid, type);
    localStorage.setItem('last_sub', sub);
    localStorage.setItem('last_idx', idx);
    QuestRunner.start(document.getElementById('view-mount'), manifest);
    document.getElementById('view-mount').classList.add('engine-mode');
};