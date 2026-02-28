export const renderProfile = (mount) => {
    mount.innerHTML = `
    <div class="profile-page animate-in">
        <div class="profile-header">
            <div class="passport-avatar">🦆</div>
            <h2 style="margin:10px 0 0 0">Manya Scholar</h2>
            <p style="font-size:12px; color:var(--text-muted); font-weight:800">CLASS OF 2024 • PRIMARY SEVEN</p>
        </div>

        <div class="bento-grid">
            <!-- 1. STREAK (Jewel Accent) -->
            <div class="bento-card streak-card" style="grid-column: span 2; background: var(--accent); color: white;">
                <span style="font-size:10px; font-weight:900; opacity:0.8">CURRENT STREAK</span>
                <div style="font-size:32px; font-weight:900">🔥 12 DAYS</div>
            </div>

            <!-- 2. SUBJECT MASTERY -->
            <div class="bento-card" style="grid-column: span 2">
                <h4 class="bento-title">Subject Mastery</h4>
                <div class="mastery-row"><span>MATH</span><div class="m-bar"><div class="fill" style="width:80%; background:#db2777"></div></div></div>
                <div class="mastery-row"><span>SCI</span><div class="m-bar"><div class="fill" style="width:45%; background:#10b981"></div></div></div>
            </div>

            <!-- 3. PARENT PORTAL (High Value for Uganda) -->
            <div class="bento-card" style="grid-column: span 2">
                <h4 class="bento-title">Parent Connection</h4>
                <p style="font-size:12px; color:var(--text-muted)">Your weekly report is ready for Robert Mukasa.</p>
                <button class="manya-btn-primary" style="height:45px; font-size:13px">SEND REPORT TO WHATSAPP</button>
            </div>
        </div>
    </div>`;
};