export const cleanData = (row) => {
    const clean = {};
    Object.keys(row).forEach(key => {
        // Removes accidental spaces from column names: " Q_ID " -> "Q_ID"
        const trimmedKey = key.trim();
        clean[trimmedKey] = row[key];
    });
    return clean;
};