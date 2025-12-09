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
        // Skip manifest.json in the root of the copy
        // We want to preserve dist-firefox/manifest.json
        if (path.basename(src) === 'manifest.json' && path.dirname(src) === srcDir) {
            console.log('Skipping src/manifest.json to preserve Firefox manifest.');
            return;
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
