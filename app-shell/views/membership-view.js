import { ManyaDB } from '../manya-db.js';
import { ManyaNotify } from './manya-notify.js';

export const renderMembership = async (mount) => {
    const user = await ManyaDB.getCurrentUser();
    let selectedTier = 'Scholar'; // Default

    const render = () => {
        mount.innerHTML = `
        <div class="membership-page animate-in">
            <!-- HEADER -->
            <div class="view-header-back">
                <button class="manya-back-btn" onclick="window.ViewManager.show('profile')">←</button>
                <h2 style="font-weight:900; margin:0;">Manya Elite</h2>
            </div>

            <!-- TIERS -->
            <div class="tier-container">
                <div class="tier-card ${selectedTier === 'Starter' ? 'selected' : ''}" onclick="window.setTier('Starter')">
                    <span class="tier-label">WEEKLY ADVENTURER</span>
                    <div class="tier-price">UGX 5,000<span>/week</span></div>
                </div>

                <div class="tier-card ${selectedTier === 'Scholar' ? 'selected' : ''}" onclick="window.setTier('Scholar')">
                    <div class="best-value-ribbon">BEST VALUE</div>
                    <span class="tier-label">TERMLY SCHOLAR</span>
                    <div class="tier-price">UGX 20,000<span>/term</span></div>
                </div>

                <div class="tier-card ${selectedTier === 'Legend' ? 'selected' : ''}" onclick="window.setTier('Legend')">
                    <span class="tier-label">ANNUAL LEGEND</span>
                    <div class="tier-price">UGX 50,000<span>/year</span></div>
                </div>
            </div>

            <!-- PAYMENT BOX -->
            <div class="payment-methods-box">
                <span class="tier-label" style="color:rgba(255,255,255,0.5)">SECURE PAYMENT</span>
                <div class="provider-grid">
                    <div class="provider-card mtn" onclick="window.confirmElitePay('MTN')">
                        <div class="momo-img" style="background:#FFCC00; display:flex; align-items:center; justify-content:center; font-weight:900; color:black">MTN</div>
                        <span class="provider-name">MTN MoMo</span>
                    </div>
                    <div class="provider-card airtel" onclick="window.confirmElitePay('Airtel')">
                        <div class="momo-img" style="background:#FF0000; display:flex; align-items:center; justify-content:center; font-weight:900; color:white">airtel</div>
                        <span class="provider-name">Airtel Money</span>
                    </div>
                </div>
                <p style="text-align:center; color:rgba(255,255,255,0.4); font-size:10px; margin-top:20px; font-weight:700;">
                    🛡️ Verified Manya Education Secure Payment
                </p>
            </div>

            <div style="text-align:center; margin-top:40px; opacity:0.1">
                <img src="assets/icons/manya_icon.png" style="width:80px">
            </div>
        </div>
        `;
    };

    window.setTier = (tier) => {
        selectedTier = tier;
        render();
    };

    window.confirmElitePay = (provider) => {
        ManyaNotify.show(`Connecting to ${provider} Systems...`, "info");
        
        setTimeout(async () => {
            user.status = "Elite Hero";
            user.membershipTier = selectedTier;
            await ManyaDB.saveUser(user);
            ManyaNotify.show("Welcome to Elite Hero Status!", "success");
            window.ViewManager.show('profile');
        }, 3000);
    };

    render();
};