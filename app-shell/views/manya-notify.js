/**
 * MANYA NOTIFY SYSTEM v2.0
 * Features: Adaptive Themes, Haptic Progress Bar, Multi-stacking
 */
export const ManyaNotify = {
    show(message, type = 'info') {
        // 1. Get or Create Container
        let container = document.getElementById('manya-notify-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'manya-notify-container';
            document.body.appendChild(container);
        }

        // 2. Create Toast Element
        const toast = document.createElement('div');
        toast.className = `manya-toast ${type}`;
        
        // Pick an emoji based on type if needed, or keep the icon
        const iconSrc = 'assets/icons/manya_icon.png';

        toast.innerHTML = `
            <img src="${iconSrc}" alt="Manya">
            <span style="flex: 1;">${message}</span>
            <div class="toast-progress"></div>
        `;
        
        // 3. Add to screen
        container.appendChild(toast);
        
        // 4. Entrance Animation
        // Use requestAnimationFrame for smoother start
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 5. Cleanup Logic
        const removeToast = () => {
            toast.classList.remove('show');
            // Wait for slide-up animation to finish before deleting
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 500);
        };

        // Auto-remove after 3.5 seconds
        setTimeout(removeToast, 3500);

        // Allow user to dismiss by clicking
        toast.style.pointerEvents = 'auto';
        toast.onclick = removeToast;
    }
};