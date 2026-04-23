const fs = require('fs');
const path = require('path');
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const cache = new Map();
function getRealCase(p) {
    if (cache.has(p)) return cache.get(p);
    const dir = path.dirname(p);
    const base = path.basename(p);
    if (!fs.existsSync(dir)) return null;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (item.toLowerCase() === base.toLowerCase()) {
            cache.set(p, item);
            return item;
        }
    }
    return null;
}

files.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    const regex = /import\s+.*?\s+from\s+['"](\.\/|\.\.\/)([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
        const importPath = match[1] + match[2];
        const absoluteImportDir = path.resolve(path.dirname(f), path.dirname(importPath));
        const basename = path.basename(importPath);
        
        const real = getRealCase(path.join(absoluteImportDir, basename) + '.js') || 
                     getRealCase(path.join(absoluteImportDir, basename) + '.jsx') ||
                     getRealCase(path.join(absoluteImportDir, basename));
                     
        if (real && real !== basename && real !== basename + '.js' && real !== basename + '.jsx') {
            console.log('CASE MISMATCH in ' + f + ': imported ' + basename + ' but file is ' + real);
        }
    }
});
console.log('Done scanning');
