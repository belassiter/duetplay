const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isOptional = args.includes('--optional');
const cleanArgs = args.filter(a => a !== '--optional');

const srcDir = cleanArgs[0];
const destDir = cleanArgs[1];

if (!srcDir || !destDir) {
    console.error('Usage: node copy-assets.js <srcDir> <destDir> [--optional]');
    process.exit(1);
}

async function copyDir(src, dest) {
    try {
        // Check availability first
        let stats;
        try {
            stats = await fs.promises.stat(src);
        } catch (e) {
            if (isOptional) {
                console.log(`Source ${src} not found. Skipping copy (Optional mode).`);
                return;
            }
            throw e;
        }

        if (stats.isFile()) {
            // Source is a file: Copy directly
            // Ensure dest directory exists
            const destDirName = path.dirname(dest);
            await fs.promises.mkdir(destDirName, { recursive: true });
            await fs.promises.copyFile(src, dest);
            console.log(`Copied file ${src} to ${dest}`);
        } else if (stats.isDirectory()) {
            // Source is a directory: Recursive copy
            await fs.promises.mkdir(dest, { recursive: true });
            const entries = await fs.promises.readdir(src, { withFileTypes: true });

            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                try {
                    if (entry.isDirectory()) {
                        await copyDir(srcPath, destPath);
                    } else if (entry.isFile()) {
                        await fs.promises.copyFile(srcPath, destPath);
                    }
                } catch (innerErr) {
                    console.warn(`Failed to copy ${srcPath}: ${innerErr.message}`);
                }
            }
            console.log(`Copied directory ${src} to ${dest}`);
        }
    } catch (err) {
        // If source doesn't exist, we might want to warn or ignore depending on logic.
        // For this build script, if public_duet doesn't exist, it's probably an error for the main build.
        console.error(`Error copying assets: ${err.message}`);
        process.exit(1); 
    }
}

copyDir(srcDir, destDir);
