import { ManyaDB } from '../manya-db.js';
import { ManyaNotify } from './manya-notify.js';


export const renderMembership = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    let currentTier = 'Scholar';

    const render = () => {
        mount.innerHTML = `
        <div class="membership-page animate-in">
            <!-- 1. HEADER (FIXED BACK BUTTON) -->
            <div class="mem-header-row" style="display:flex; align-items:center; gap:15px; margin-bottom:30px;">
                <button class="manya-back-btn" onclick="ViewManager.show('profile')" style="width:45px; height:45px; border-radius:15px; border:2px solid var(--border-color); background:var(--bg-card); cursor:pointer; color:var(--manya-purple);">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div>
                    <h2 style="font-weight:900; margin:0; font-size:22px; color:var(--text-main)">Manya Elite Hub</h2>
                    <p style="margin:0; font-size:11px; font-weight:700; color:var(--text-muted)">Unlock Your P.7 Potential</p>
                </div>
            </div>

            <!-- 2. SOCIAL PROOF -->
            <div class="testimonial-card">
                <img src="assets/images/manya_icon.png" class="test-av">
                <div class="test-text">
                    "Upgrading to Elite was the best decision for my PLE prep. I love the offline mode!"
                    <span class="test-name">Meda, P.7 Scholar</span>
                </div>
            </div>

            <!-- 3. TIER STACK -->
            <div class="tier-stack">
                <div class="tier-card-elite ${currentTier === 'Starter' ? 'selected' : ''}" onclick="window.setManyaTier('Starter')">
                    <span class="tier-title-small">Hero Weekly</span>
                    <div class="tier-cost">UGX 5,000<span>/week</span></div>
                </div>

                <div class="tier-card-elite ${currentTier === 'Scholar' ? 'selected' : ''}" onclick="window.setManyaTier('Scholar')">
                    <div class="best-value-ribbon">🏆 MOST POPULAR</div>
                    <span class="tier-title-small">Termly Legend</span>
                    <div class="tier-cost">UGX 20,000<span>/term</span></div>
                </div>
            </div>

            <!-- 4. FEATURE GRID -->
            <div class="feature-compare-card">
                <h4>ELITE BENEFITS</h4>
                <div class="feature-row"><span>2,500+ Practice Questions</span> <span class="check-elite">✔</span></div>
                <div class="feature-row"><span>Full Offline Access</span> <span class="check-elite">✔</span></div>
                <div class="feature-row"><span>Parent Progress Sync</span> <span class="check-elite">✔</span></div>
                <div class="feature-row"><span>Hero Badge Unlocks</span> <span class="check-elite">✔</span></div>
            </div>

            <!-- 5. PROMO AREA -->
            <div class="promo-box">
                <p style="font-size:11px; font-weight:800; color:var(--text-muted); margin-bottom:10px;">PROMO CODE</p>
                <div style="display:flex; gap:10px;">
                    <input type="text" id="promo-field" class="promo-input" placeholder="Enter Code">
                    <button onclick="window.applyManyaPromo()" style="background:var(--manya-purple); color:white; border:none; border-radius:12px; padding:0 15px; font-weight:900;">APPLY</button>
                </div>
            </div>

            <!-- 6. MOMO DOCK -->
            <div class="momo-dock" id="momo-mount">
                <h4>SECURE CHECKOUT</h4>
                <div class="momo-grid">
                    <div class="momo-btn-elite" onclick="window.startEliteMomo('MTN')">
                        <div class="provider-logo" style="background:#FFCC00; color:black; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:12px;">MTN</div>
                        <span style="color:white; font-weight:900; font-size:11px;">MTN MoMo</span>
                    </div>
                    <div class="momo-btn-elite" onclick="window.startEliteMomo('Airtel')">
                        <div class="provider-logo" style="background:#FF0000; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:11px;">Airtel</div>
                        <span style="color:white; font-weight:900; font-size:11px;">Airtel Money</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align:center; margin-top:50px; opacity:0.3;">
                <img src="assets/images/manya_icon.png" style="width:50px">
            </div>
        </div>
        `;
    };

    window.setManyaTier = (tier) => { currentTier = tier; render(); };

    window.applyManyaPromo = () => {
        ManyaNotify.show("Invalid Hero Code. Check spelling!", "error");
    };

    window.startEliteMomo = (provider) => {
        const amount = currentTier === 'Starter' ? '5,000' : '20,000';
        const mount = document.getElementById('momo-mount');
        mount.innerHTML = `
            <h4 style="color:#FBBF24">UPGRADING VIA ${provider}</h4>
            <p style="color:white; font-size:12px; text-align:center; margin-bottom:20px;">Total: UGX ${amount}</p>
            <input type="tel" id="pay-phone" class="elite-input-ob" placeholder="07... Number" style="background:rgba(255,255,255,0.1); color:white; border:2px solid rgba(255,255,255,0.2); width:100%; padding:15px; border-radius:15px; margin-bottom:15px;">
            <button class="manya-btn-primary-ob finish" onclick="window.finalEliteCommit()" style="width:100%; height:60px;">CONFIRM PAYMENT</button>
            <button onclick="ViewManager.show('membership')" style="width:100%; background:none; border:none; color:#94A3B8; margin-top:15px; font-weight:800; font-size:11px; cursor:pointer;">← CANCEL</button>
        `;
    };

    window.finalEliteCommit = async () => {
        ManyaNotify.show("Connecting to Network...", "info");
        setTimeout(async () => {
            user.status = "Elite Hero";
            user.membershipTier = currentTier;
            await ManyaDB.saveUser(user);
            ManyaNotify.show("WELCOME TO ELITE!", "success");
            window.ViewManager.show('profile');
        }, 3000);
    };

    render();
};