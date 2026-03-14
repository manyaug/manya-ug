import { ManyaDB } from '/app-shell/manya-db.js';

export const ThemeEngine = {
    async init() {
        const user = await ManyaDB.getCurrentUser();
        if (user && user.theme) {
            this.set(user.theme);
        }
    },

    set(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        if (themeName === 'dark') {
            document.body.classList.add('dark-mode-active');
        } else {
            document.body.classList.remove('dark-mode-active');
        }
    },

    async toggle() {
        const user = await ManyaDB.getCurrentUser();
        const newTheme = user.theme === 'light' ? 'dark' : 'light';
        user.theme = newTheme;
        
        await ManyaDB.saveUser(user);
        this.set(newTheme);
        return newTheme;
    }
};