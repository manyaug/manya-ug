export const ChatEngine = {
    renderLabeling: (container, data) => {
        container.innerHTML = `
            <div class="chat-step animate-in" style="padding: 40px 20px; text-align: center;">
                <div class="chat-avatar" style="width: 100px; height: 100px; background: #ede9fe; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 50px;">
                    ${data.speaker === 'manya' ? '🦆' : '🐱'}
                </div>
                <div class="chat-bubble" style="background: white; border: 2px solid #7c3aed; padding: 20px; border-radius: 20px; box-shadow: 0 8px 0 #ede9fe; font-size: 18px; font-weight: 700; color: #1e293b;">
                    ${data.text}
                </div>
            </div>
        `;
    }
};