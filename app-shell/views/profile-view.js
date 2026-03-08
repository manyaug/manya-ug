import { ManyaDB } from '../manya-db.js';

export const renderProfile = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    if (!user) return;

    const subjects = [
        { name: 'Mathematics', val: 78, color: '#7c3aed', icon: 'assets/icons/math_island.png' },
        { name: 'Science', val: 45, color: '#10b981', icon: 'assets/icons/science_island.png' }
    ];

    const weeklyData = [
        { day: 'Sun', hr: 1.2, h: 40 },
        { day: 'Mon', hr: 0.8, h: 30 },
        { day: 'Tue', hr: 2.5, h: 60 },
        { day: 'Wed', hr: 3.1, h: 75 },
        { day: 'Thr', hr: 4.5, h: 95 },
        { day: 'Fri', hr: 2.8, h: 65 },
        { day: 'Sat', hr: 1.5, h: 45 }
    ];

    mount.innerHTML = `
    <div class="profile-page animate-in">
        
        <!-- HEADER -->
        <div class="hero-banner">
            <div class="avatar-halo" style="width:110px; height:110px; margin: 0 auto;">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatarSeed}" class="hero-passport-img" style="width:90px; height:90px;">
            </div>
            <h2>${user.nickname}</h2>
            <p>${user.school || 'P.7 Candidate'}</p>
        </div>

        <!-- WEEKLY ACTIVITY CHART -->
        <div class="activity-card">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:20px;">🧠</span>
                <div>
                    <div style="font-weight:900; font-size:14px; color:#1E293B">Learning Activity</div>
                    <div style="font-size:10px; color:#94A3B8; font-weight:700">Daily average: 2.4 hrs</div>
                </div>
            </div>

            <div class="bar-chart-container">
                ${weeklyData.map(d => `
                    <div class="chart-bar-wrapper">
                        <div class="bar-fill ${d.day === 'Thr' ? 'active' : ''}" style="height: ${d.h}px">
                            ${d.day === 'Thr' ? `<div class="bar-tooltip">${d.hr}hr</div>` : ''}
                        </div>
                        <span class="bar-day">${d.day}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- SUBJECT ANALYTICS -->
        <h4 class="card-label" style="margin: 0 0 15px 10px; display:block;">Curriculum Progress</h4>
        ${subjects.map(sub => `
            <div class="subject-bar-card">
                <div class="sub-header">
                    <div class="sub-title">
                        <img src="${sub.icon}" style="width:24px; height:24px;">
                        <span>${sub.name}</span>
                    </div>
                    <span class="sub-percent">${sub.val}%</span>
                </div>
                <div class="striped-track">
                    <div class="striped-fill" style="width: ${sub.val}%; background-color: ${sub.color};"></div>
                </div>
            </div>
        `).join('')}

        <!-- SERVICES -->
        <h4 class="card-label" style="margin: 25px 0 15px 10px; display:block;">Hero Management</h4>
        <div class="service-item" onclick="window.ViewManager.show('settings')">
            <div class="service-icon-box" style="background:#F5F3FF; color:#7c3aed">⚙️</div>
            <div class="service-info">
                <span class="service-title">Settings</span>
                <span class="service-sub">Customize your experience</span>
            </div>
            <span style="color:#CBD5E1">›</span>
        </div>

        <div class="service-item" onclick="window.ViewManager.show('membership')">
            <div class="service-icon-box" style="background:#FFF1F2; color:#db2777">👑</div>
            <div class="service-info">
                <span class="service-title">Manya Elite Status</span>
                <span class="service-sub">Unlock premium features</span>
            </div>
            <span style="color:#CBD5E1">›</span>
        </div>

        <div style="text-align:center; margin-top:40px; opacity:0.3">
            <img src="assets/icons/manya_icon.png" style="width:50px">
        </div>
    </div>
    `;
};