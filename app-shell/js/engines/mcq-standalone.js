export const MCQStandalone = {
    renderLabeling: (container, data) => {
        container.innerHTML = `
            <div class="mcq-pro-layout animate-in">
                <div class="mcq-q-bubble"><h2>${data.text}</h2></div>
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
                if(document.getElementById('display-points')) 
                    document.getElementById('display-points').innerText = current + data.points;

                nextBtn.disabled = false;
                document.querySelectorAll('.mcq-btn-elite').forEach(b => b.style.pointerEvents = 'none');
            } else {
                btn.classList.add('wrong');
                fb.innerHTML = `<div class="msg-box error">❌ Hint: ${data.hint || "Try again!"}</div>`;
                setTimeout(() => btn.classList.remove('wrong'), 1000);
            }
        };
    }
};