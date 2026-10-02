// bootstrap.js
// ZEPHYR-MD BOT — Auto-installer launcher.
// Run the bot with: node bootstrap.js  (this is now the default "start" script)
// It checks if node_modules is missing or package.json changed since the
// last install, and runs "npm install" automatically before starting —
// so on Termux, a fresh VPS, or any host that doesn't auto-install for
// you, you never have to remember to run npm install by hand.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const nodeModulesPath = path.join(ROOT, 'node_modules');
const markerPath = path.join(nodeModulesPath, '.install-complete');
const pkgPath = path.join(ROOT, 'package.json');

function needsInstall() {
    if (!fs.existsSync(nodeModulesPath)) return true;
    if (!fs.existsSync(markerPath)) return true;
    try {
        const pkgTime = fs.statSync(pkgPath).mtimeMs;
        const markerTime = fs.statSync(markerPath).mtimeMs;
        return pkgTime > markerTime;
    } catch (e) {
        return true;
    }
}

function runInstall() {
    console.log('📦 Dependencies missing or outdated — running "npm install" automatically...');
    try {
        execSync('npm install --no-audit --no-fund', { stdio: 'inherit', cwd: ROOT });
        fs.mkdirSync(nodeModulesPath, { recursive: true });
        fs.writeFileSync(markerPath, new Date().toISOString());
        console.log('✅ Dependencies installed successfully.\n');
    } catch (e) {
        console.error('❌ Automatic npm install failed:', e.message);
        console.error('👉 Please run "npm install" manually in this folder, then try again.');
        process.exit(1);
    }
}

// 📦 Optional persistent storage (Render Disk, Railway volume, VPS path...).
// When DATA_PERSIST_DIR is set, auth_info/ and data/ are symlinked onto that
// directory so paired WhatsApp sessions and bot data survive redeploys and
// restarts. Leave it unset to keep using the default in-project folders.
const persistDir = process.env.DATA_PERSIST_DIR;
if (persistDir) {
    try {
        fs.mkdirSync(persistDir, { recursive: true });
        for (const name of ['auth_info', 'data']) {
            const target = path.join(persistDir, name);
            const link = path.join(ROOT, name);
            fs.mkdirSync(target, { recursive: true });
            let exists = false;
            try { fs.lstatSync(link); exists = true; } catch (e) {}
            if (!exists) fs.symlinkSync(target, link, 'dir');
        }
        console.log(`✅ Persistent storage ready at ${persistDir}\n`);
    } catch (e) {
        console.error('⚠️  Persistent storage setup failed:', e.message);
    }
}

if (needsInstall()) {
    runInstall();
} else {
    console.log('✅ Dependencies already up to date — skipping install.\n');
}

console.log('🚀 Starting 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 Bot...\n');
require('./index.js');
