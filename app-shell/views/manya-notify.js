export const ManyaNotify = {
    show(message, type = 'info') {
        let container = document.getElementById('manya-notify-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'manya-notify-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `manya-toast ${type}`;
        toast.innerHTML = `
            <img src="assets/icons/manya_icon.png">
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3500);
    }
};