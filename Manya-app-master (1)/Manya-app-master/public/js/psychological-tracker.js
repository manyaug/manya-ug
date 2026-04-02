// public/js/psychological-tracker.js
const PsychologicalTracker = {
    elements: {
        frustrationBar: document.getElementById('frustrationBar'),
        frustrationValue: document.getElementById('frustrationValue'),
        confidenceBar: document.getElementById('confidenceBar'),
        confidenceValue: document.getElementById('confidenceValue'),
        engagementBar: document.getElementById('engagementBar'),
        engagementValue: document.getElementById('engagementValue'),
        cognitiveBar: document.getElementById('cognitiveBar'),
        cognitiveValue: document.getElementById('cognitiveValue'),
        hesitationCount: document.getElementById('hesitationCount'),
        answerChanges: document.getElementById('answerChanges'),
        hintsUsed: document.getElementById('hintsUsed'),
        avgTime: document.getElementById('avgTime')
    },

    async loadState() {
        console.log('🧠 Loading psychological state...');
        
        try {
            const res = await fetch(`/api/psychological/state/${window.currentUser}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            
            const state = await res.json();
            console.log('✅ Psychological state:', state);
            
            this.updateDisplays(state);
            
        } catch (err) {
            console.error('❌ Error loading psychological state:', err);
        }
    },

    updateDisplays(state) {
        // Frustration
        if (this.elements.frustrationBar) {
            this.elements.frustrationBar.style.width = state.frustration + '%';
        }
        if (this.elements.frustrationValue) {
            this.elements.frustrationValue.textContent = state.frustration + '%';
        }
        
        // Confidence
        if (this.elements.confidenceBar) {
            this.elements.confidenceBar.style.width = state.confidence + '%';
        }
        if (this.elements.confidenceValue) {
            this.elements.confidenceValue.textContent = state.confidence + '%';
        }
        
        // Engagement
        if (this.elements.engagementBar) {
            this.elements.engagementBar.style.width = state.engagement + '%';
        }
        if (this.elements.engagementValue) {
            this.elements.engagementValue.textContent = state.engagement + '%';
        }
        
        // Cognitive Load
        if (this.elements.cognitiveBar) {
            this.elements.cognitiveBar.style.width = state.cognitiveLoad + '%';
        }
        if (this.elements.cognitiveValue) {
            this.elements.cognitiveValue.textContent = state.cognitiveLoad + '%';
        }
        
        // Stats
        if (this.elements.hesitationCount) {
            this.elements.hesitationCount.textContent = state.hesitations || 0;
        }
        
        if (this.elements.answerChanges) {
            this.elements.answerChanges.textContent = state.answerChanges || 0;
        }
        
        if (this.elements.hintsUsed) {
            this.elements.hintsUsed.textContent = state.hintsUsed || 0;
        }
        
        if (this.elements.avgTime) {
            this.elements.avgTime.textContent = (state.avgTime || 0) + 's';
        }
    }
};

window.PsychologicalTracker = PsychologicalTracker;