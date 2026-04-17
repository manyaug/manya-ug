/**
 * READER STUDY LOGIC
 * Domain rules and data normalization for the Reader engine.
 */

export const getAccentColor = (data) => {
    if (data.themeColor) return data.themeColor;
    const sub = (data.subject || '').toLowerCase();
    if (sub.includes('science')) return '#7c3aed';
    if (sub.includes('english')) return '#3b82f6';
    if (sub.includes('math')) return '#ef4444';
    if (sub.includes('sst')) return '#f59e0b';
    return '#7c3aed';
};

export const calculateScrollProgress = (scrollTop, scrollHeight, clientHeight) => {
    if (scrollHeight <= clientHeight) return 100;
    return (scrollTop / (scrollHeight - clientHeight)) * 100;
};
