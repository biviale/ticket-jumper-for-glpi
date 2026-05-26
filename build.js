const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist-firefox');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        // Skip manifest.json and background-entry.js in the root of the copy.
        // Firefox uses its own manifest and loads utils.js via manifest "scripts": [...].
        if (path.resolve(path.dirname(src)) === path.resolve(srcDir)) {
            const basename = path.basename(src);
            if (basename === 'manifest.json' || basename === 'background-entry.js') {
                console.log(`Skipping src/${basename} to preserve Firefox-specific config.`);
                return;
            }
        }
        fs.copyFileSync(src, dest);
    }
}

try {
    console.log(`Copying files from ${srcDir} to ${distDir}...`);
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir);
    }
    copyRecursiveSync(srcDir, distDir);
    console.log('Build complete!');
} catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
}
