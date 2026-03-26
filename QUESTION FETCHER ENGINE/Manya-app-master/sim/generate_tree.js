const fs = require('fs');
const path = require('path');

function generateFileTree(startPath, outputPath) {
    let output = `File tree for: ${startPath}\n\n`;

    // Helper function to recursively walk through directories
    function walk(currentPath, prefix = '', isLast = true) {
        const stats = fs.statSync(currentPath);
        const name = path.basename(currentPath);

        // Determine the connecting line for the current item
        let line = '';
        if (prefix === '') { // Root directory
            line = '';
        } else {
            line = prefix + (isLast? '└── ' : '├── ');
        }
        output += `${line}${name}\n`;

        if (stats.isDirectory()) {
            const children = fs.readdirSync(currentPath);
            for (let i = 0; i < children.length; i++) {
                const childPath = path.join(currentPath, children[i]);
                const isLastChild = (i === children.length - 1);
                const newPrefix = prefix + (isLast? ' ' : '│ ');
                walk(childPath, newPrefix, isLastChild);
            }
        }
    }

    try {
        walk(startPath);
        fs.writeFileSync(outputPath, output, 'utf-8');
        console.log(`File tree successfully written to '${outputPath}'`);
    } catch (error) {
        console.error(`Error generating file tree: ${error.message}`);
    }
}

// --- Configuration ---
// Change '.' to any path you want to scan,
// e.g., 'C:\\Users\\YourUser\\Documents' or '/home/youruser/my_project'
// By default, it scans the directory where the script is run.
const targetDirectory = '.';
const outputFilename = 'filetree.txt';
// --- End Configuration ---

console.log(`Scanning '${path.resolve(targetDirectory)}'...`);
generateFileTree(targetDirectory, outputFilename);