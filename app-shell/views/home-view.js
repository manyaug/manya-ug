export const renderHome = (mount) => {
    mount.innerHTML = `
        <div class="manya-hub animate-in">

            
            <!-- NEW HERO: LIBRARY / SELF STUDY MODE -->
            <div class="library-hero-card" onclick="ViewManager.show('library')">
                <div class="lib-content">
                    <span class="goal-tag">SELF STUDY MODE</span>
                    <h2>Topic Library</h2>
                    <p>Browse the full syllabus and pick any topic to study.</p>
                </div>
                <div class="lib-icon">📚</div>
            </div>


            <!-- THE DYNAMIC QUEST HERO -->
            <div class="daily-goal-card" onclick="window.launchDynamicQuest('science', 'musklo-skeletal-system')">
                <div class="goal-content">
                    <span class="goal-tag">DASH INTO ACTION</span>
                    <h2>Start Daily Journey</h2>
                    <p>Manya has picked 10 questions to help you improve in Science today.</p>
                    <button class="start-flow-btn">GO NOW →</button>
                </div>
                <img src="assets/icons/pose_1.png" class="mascot-img">
            </div>

            <h3 class="section-title">Your Daily Adventure</h3>
            <p style="padding:0 20px; font-size:12px; opacity:0.7; margin-top:-5px; margin-bottom:15px;">Pick a world to continue your path!</p>
            
            <!-- SUBJECT GRID -> NOW LINKS TO SPIRAL -->
            <div class="subject-grid">
                
                <!-- Math -> Spiral -->
                <div class="world-card math" onclick="ViewManager.show('spiral', null, 'math')">
                    <div class="world-img-box">
                        <div class="glow-aura"></div>
                        <img src="assets/icons/math_island.png" class="floating-island">
                    </div>
                    <div class="world-info">
                        <h4>Mathematics</h4>
                        <div class="prog-flex">
                            <div class="prog-bar"><div class="fill" style="width: 45%;"></div></div>
                            <span class="prog-number">45%</span>
                        </div>
                    </div>
                </div>

                <!-- Science -> Spiral -->
                <div class="world-card science" onclick="ViewManager.show('spiral', null, 'science')">
                    <div class="world-img-box">
                        <div class="glow-aura"></div>
                        <img src="assets/icons/science_island.png" class="floating-island" style="animation-delay: -1s;">
                    </div>
                    <div class="world-info">
                        <h4>Science</h4>
                        <div class="prog-flex">
                            <div class="prog-bar"><div class="fill" style="width: 20%;"></div></div>
                            <span class="prog-number">20%</span>
                        </div>
                    </div>
                </div>

                <!-- SST -> Spiral -->
                <div class="world-card sst" onclick="ViewManager.show('spiral', null, 'sst')">
                    <div class="world-img-box">
                        <div class="glow-aura"></div>
                        <img src="assets/icons/sst_island.png" class="floating-island" style="animation-delay: -2s;">
                    </div>
                    <div class="world-info">
                        <h4>Social Studies</h4>
                        <div class="prog-flex">
                            <div class="prog-bar"><div class="fill" style="width: 10%;"></div></div>
                            <span class="prog-number">10%</span>
                        </div>
                    </div>
                </div>

                <!-- English -> Spiral -->
                <div class="world-card english" onclick="ViewManager.show('spiral', null, 'english')">
                    <div class="world-img-box">
                        <div class="glow-aura"></div>
                        <img src="assets/icons/english_island.png" class="floating-island" style="animation-delay: -3s;">
                    </div>
                    <div class="world-info">
                        <h4>English</h4>
                        <div class="prog-flex">
                            <div class="prog-bar"><div class="fill" style="width: 80%;"></div></div>
                            <span class="prog-number">80%</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>


    `;

    
};
