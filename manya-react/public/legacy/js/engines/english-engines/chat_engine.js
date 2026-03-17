/**
 * MANYA CHAT ENGINE (Integrated Component)
 */
export const ChatEngine = {
    renderLabeling: (container, data) => {
        const charMap = {
            manya: { icon: "assets/images/manya_icon.png", name: "MANYA", color: "#7e22ce" },
            polly: { icon: "assets/images/polly_icon.png", name: "POLLY", color: "#10b981" },
            kiki: { icon: "assets/images/kiki_icon.png", name: "KIKI", color: "#f472b6" }
        };
        const char = charMap[data.speaker] || charMap.manya;

        container.innerHTML = `
            <div class="chat-component-ui animate-in">
                <!-- IMAGE WRAPPER WITH FIXED CLASS -->
                ${data.image ? `
                    <div class="chat-img-wrap">
                        <img src="${data.image}" class="chat-img">
                    </div>` : ''}
                
                <div class="chat-row">
                    <div class="chat-avatar"><img src="${char.icon}"></div>
                    <div class="chat-bubble">
                        <div style="color:${char.color}; font-weight:900; font-size:11px; margin-bottom:5px; letter-spacing:1px;">${char.name}</div>
                        <div id="type-text" class="chat-text"></div>
                    </div>
                </div>
            </div>`;

        ChatEngine.typeEffect(data.text, "type-text");
    },

    typeEffect: async (text, elId) => {
        if (!window.QuestRunner) {
            console.warn("[ChatEngine] QuestRunner not found, skipping animation.");
            const el = document.getElementById(elId);
            if (el) el.innerHTML = text;
            return;
        }
        
        window.QuestRunner.setIsTyping(true);
        const el = document.getElementById(elId);
        if (!el) return;
        let current = "";
        
        const skip = () => { current = text; el.innerHTML = text; };
        window.addEventListener('stop-typing', skip, { once: true });

        for(let char of text) {
            if (current === text) break;
            // Defensive Check: if container was removed from DOM, stop typing
            if (!document.getElementById(elId)) break;
            
            current += char;
            el.innerHTML = current;
            await new Promise(r => setTimeout(r, 20));
        }
        
        if (window.QuestRunner) {
            window.QuestRunner.setIsTyping(false);
            window.QuestRunner.enableButton();
        }
    }
};