export const MCQStandalone = {
    renderLabeling: (container, data) => {
        container.innerHTML = `
            <div class="mcq-pro-layout animate-in">
                <div class="mcq-q-bubble"><h2>${data.text}</h2></div>
                ${data.hint ? `
                    <div class="mcq-hint-card" style="width: 100%; max-width: 450px; margin-top: -15px; margin-bottom: 25px; background: #FFF9EB; border: 2px solid #FBBF24; border-radius: 20px; padding: 15px; display: flex; gap: 10px; align-items: center; box-shadow: 0 4px 0 #FEF3C7;">
                        <span style="font-size: 20px;">💡</span>
                        <div style="font-size: 13px; font-weight: 800; color: #92400E; line-height: 1.4;">${data.hint}</div>
                    </div>
                ` : ''}
                <div class="mcq-options-grid">
                    ${Object.keys(data.options).map(key => {
                        const val = data.options[key];
                        if (!val || val === "null" || val === "") return "";
                        return `
                        <button class="mcq-btn-elite" onclick="ManyaCheckAnswer('${key}', this)">
                            <div class="elite-letter">${key.split('_')[1]}</div>
                            <div class="elite-text">${val}</div>
                        </button>`;
                    }).join('')}
                </div>
                <div id="quest-feedback"></div>
            </div>
        `;

        window.ManyaCheckAnswer = (choice, btn) => {
            const fb = document.getElementById('quest-feedback');
            const nextBtn = document.getElementById('next-step-btn');

            if (choice === data.correct) {
                btn.classList.add('correct');
                fb.innerHTML = `<div class="msg-box success">✅ Correct! +${data.points} pts</div>`;
                
                // Award Points
                let current = parseInt(localStorage.getItem('manya_points') || 0);
                localStorage.setItem('manya_points', current + data.points);
                
                // Update Top UI
                if(window.QuestRunner) window.QuestRunner.enableButton();

                // DB Bridge
                if (window.onSimulationSubmit) {
                    window.onSimulationSubmit({
                        isCorrect: true,
                        score: data.points || 1,
                        total: data.points || 1,
                        type: 'mcq'
                    });
                }
                if (window.captureSimulationResult) window.captureSimulationResult(true, data.points || 1, data.points || 1);

                document.querySelectorAll('.mcq-btn-elite').forEach(b => b.style.pointerEvents = 'none');
            } else {
                btn.classList.add('wrong');
                fb.innerHTML = `<div class="msg-box error">❌ Hint: ${data.hint || "Try again!"}</div>`;
                setTimeout(() => btn.classList.remove('wrong'), 1000);
            }
        };
    }
};