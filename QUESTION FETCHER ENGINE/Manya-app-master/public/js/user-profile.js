// public/js/user-profile.js
const UserProfile = {
    elements: {
        profileCard: document.getElementById('userProfileCard'),
        userType: document.getElementById('userType'),
        confidenceLevel: document.getElementById('confidenceLevel'),
        addictionScore: document.getElementById('addictionScore'),
        frustrationLevel: document.getElementById('globalFrustration'),
        learningStyle: document.getElementById('learningStyle'),
        recommendations: document.getElementById('recommendations'),
        masteredTopics: document.getElementById('masteredTopics'),
        strugglingTopics: document.getElementById('strugglingTopics'),
        learningVelocity: document.getElementById('learningVelocity')
    },

    async loadProfile() {
        console.log('👤 Loading user profile for:', window.currentUser);
        
        try {
            const res = await fetch(`/api/profile/${window.currentUser}`);
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const profile = await res.json();
            console.log('✅ Profile loaded:', profile);
            
            this.updateProfileDisplay(profile);
            this.updateRecommendations(profile.recommendations);
            this.updateTopics(profile.topics);
            this.updateVelocity(profile.velocity);
            
        } catch (err) {
            console.error('❌ Error loading user profile:', err);
            // Show error in UI
            if (this.elements.userType) {
                this.elements.userType.textContent = 'Error loading profile';
            }
        }
    },

    updateProfileDisplay(profile) {
        if (!profile || !profile.profile) {
            console.warn('No profile data to display');
            return;
        }
        
        // User type with emoji
        const userTypes = {
            'new_learner': '🌱 New Learner',
            'active_learner': '📚 Active Learner',
            'consistent_learner': '📊 Consistent Learner',
            'advanced_learner': '🎓 Advanced Learner',
            'struggling_learner': '💪 Struggling Learner',
            'frustrated_learner': '😤 Frustrated Learner'
        };
        
        if (this.elements.userType) {
            this.elements.userType.textContent = userTypes[profile.profile.type] || '👤 Learner';
        }
        
        // Confidence with color
        const confidenceColors = {
            'high': '#48bb78',
            'moderate': '#667eea',
            'low': '#ed8936',
            'very_low': '#f56565'
        };
        
        if (this.elements.confidenceLevel) {
            this.elements.confidenceLevel.textContent = profile.profile.confidence;
            this.elements.confidenceLevel.style.color = confidenceColors[profile.profile.confidence] || '#718096';
        }
        
        // Addiction score
        if (this.elements.addictionScore) {
            const addiction = profile.profile.addiction;
            this.elements.addictionScore.innerHTML = `
                <div style="font-weight: bold; color: ${addiction.score > 70 ? '#48bb78' : addiction.score > 40 ? '#667eea' : '#ed8936'}">
                    ${addiction.score}% - ${addiction.level.replace(/_/g, ' ')}
                </div>
            `;
        }
        
        // Frustration
        if (this.elements.frustrationLevel) {
            const frustration = profile.psychology?.currentFrustration || 0;
            this.elements.frustrationLevel.textContent = frustration + '%';
            this.elements.frustrationLevel.style.color = frustration > 70 ? '#f56565' : frustration > 40 ? '#ed8936' : '#48bb78';
        }
        
        // Learning style
        const learningStyles = {
            'support_seeking': '🔍 Seeks Help',
            'careful_thinker': '🤔 Careful Thinker',
            'rapid_responder': '⚡ Rapid Responder',
            'balanced_learner': '⚖️ Balanced'
        };
        
        if (this.elements.learningStyle) {
            this.elements.learningStyle.textContent = learningStyles[profile.profile.learningStyle] || profile.profile.learningStyle;
        }
    },

    updateRecommendations(recommendations) {
        if (!this.elements.recommendations) return;
        
        if (!recommendations || recommendations.length === 0) {
            this.elements.recommendations.innerHTML = '<div style="color: #718096; padding: 10px; text-align: center;">No recommendations at this time</div>';
            return;
        }
        
        this.elements.recommendations.innerHTML = recommendations.map(r => `
            <div class="recommendation-item priority-${r.priority}">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <span style="font-size: 1.2em;">
                        ${r.type === 'topic' ? '📚' : r.type === 'psychological' ? '🧠' : '📊'}
                    </span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${r.message}</div>
                        <div style="font-size: 0.85em; color: #718096;">Suggested action: ${r.action}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    updateTopics(topics) {
        if (!topics) return;
        
        const mastered = topics.filter(t => t.masteryLevel === 'mastered');
        const struggling = topics.filter(t => t.masteryLevel === 'struggling');
        
        if (this.elements.masteredTopics) {
            this.elements.masteredTopics.innerHTML = mastered.length ? 
                mastered.map(t => `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span>${t.topic}</span>
                        <span style="color: #48bb78;">${t.accuracy}%</span>
                    </div>
                `).join('') : 
                '<div style="color: #718096; padding: 5px;">No mastered topics yet</div>';
        }
        
        if (this.elements.strugglingTopics) {
            this.elements.strugglingTopics.innerHTML = struggling.length ?
                struggling.map(t => `
                    <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                        <span>${t.topic}</span>
                        <span style="color: #f56565;">${t.accuracy}%</span>
                    </div>
                `).join('') :
                '<div style="color: #718096; padding: 5px;">No struggling topics</div>';
        }
    },

    updateVelocity(velocity) {
        if (!this.elements.learningVelocity || !velocity) return;
        
        const trendIcon = velocity.trend === 'accelerating' ? '📈' : 
                         velocity.trend === 'decelerating' ? '📉' : '📊';
        
        this.elements.learningVelocity.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Weekly trend: ${trendIcon}</span>
                <span style="color: ${velocity.velocity > 0 ? '#48bb78' : '#f56565'}; font-weight: bold;">
                    ${velocity.velocity > 0 ? '+' : ''}${velocity.velocity}%
                </span>
            </div>
        `;
    }
};

window.UserProfile = UserProfile;