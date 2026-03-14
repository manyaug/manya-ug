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
        if (!window.QuestRunner) return;
        
        window.QuestRunner.state.isTyping = true;
        const el = document.getElementById(elId);
        let current = "";
        
        const skip = () => { current = text; el.innerHTML = text; };
        window.addEventListener('stop-typing', skip, { once: true });

        for(let char of text) {
            if (current === text) break;
            current += char;
            el.innerHTML = current;
            await new Promise(r => setTimeout(r, 20));
        }
        
        window.QuestRunner.state.isTyping = false;
        window.QuestRunner.enableButton(true); // Re-enable the Master Runner's button
    }
};