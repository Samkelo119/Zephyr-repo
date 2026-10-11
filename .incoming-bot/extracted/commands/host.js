// commands/host.js
// 👑 AWAIS CYBER — Static website hosting. Accepts a single HTML file
// or a zip of a static site (HTML/CSS/JS/images/fonts) and serves it
// from the bot's own web server.
//
// SECURITY BOUNDARY (intentional, do not loosen): only STATIC files are
// allowed — nothing that would ever be executed as code ON THE SERVER.
// Static HTML/CSS/JS just gets served as bytes and runs in the visitor's
// own browser, same as any free static host (Netlify/GitHub Pages/etc).
// Server-side code (.php, .py, .exe, .sh, .cgi, .jsp, .asp, ...) is
// rejected outright — accepting that would let ANY bot user execute
// arbitrary code on this server's own machine (reading env vars, the
// WhatsApp session files, API keys, etc). That risk applies no matter
// whose file it is, so there's no safe way to allow it here.

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const HOSTED_DIR = path.join(__dirname, '..', 'hosted');
fs.ensureDirSync(HOSTED_DIR);

const ALLOWED_EXT = new Set(['.html', '.htm', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.ico', '.txt', '.md']);
const BLOCKED_EXT_HINTS = ['.php', '.py', '.exe', '.sh', '.cgi', '.pl', '.rb', '.jsp', '.asp', '.aspx', '.bat', '.jar', '.dll'];
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 200;

function isSafeExt(filename) {
    return ALLOWED_EXT.has(path.extname(filename).toLowerCase());
}

// 🛡️ Zip-slip protection — an entry name like "../../../etc/passwd" or
// an absolute path would otherwise let a malicious zip write OUTSIDE
// siteDir once extracted (adm-zip's extractAllTo has had this class of
// bug historically, and even patched versions are worth not relying on
// alone). Every entry's resolved path must stay inside siteDir.
function isPathInsideDir(entryName, dir) {
    const resolved = path.resolve(dir, entryName);
    const dirWithSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
    return resolved.startsWith(dirWithSep);
}

async function host(sock, from, msg, publicBaseUrl, isLocalUrl) {
    try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const docMsg = quoted?.documentMessage || msg.message?.documentMessage;
        if (!docMsg) {
            return sock.sendMessage(from, {
                text: '⚠️ Reply to a *.zip* (full static site) or a single *.html* file with `.host`\n\n✅ Allowed: html, css, js, json, images, fonts\n❌ Not allowed: php, py, exe, sh, or any server-executable code (security boundary — see README)'
            }, { quoted: msg });
        }

        const fileName = (docMsg.fileName || 'upload').toLowerCase();
        const stream = await downloadContentFromMessage(docMsg, 'document');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        if (buffer.length > MAX_TOTAL_BYTES) {
            return sock.sendMessage(from, { text: `❌ File too large. Max ${MAX_TOTAL_BYTES / 1024 / 1024}MB.` }, { quoted: msg });
        }

        const siteId = crypto.randomBytes(6).toString('hex');
        const siteDir = path.join(HOSTED_DIR, siteId);
        await fs.ensureDir(siteDir);

        if (fileName.endsWith('.zip')) {
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries().filter(e => !e.isDirectory);

            if (entries.length > MAX_FILES) {
                await fs.remove(siteDir);
                return sock.sendMessage(from, { text: `❌ Too many files in the zip (max ${MAX_FILES}).` }, { quoted: msg });
            }

            const unsafe = entries.filter(e => !isSafeExt(e.entryName));
            if (unsafe.length > 0) {
                await fs.remove(siteDir);
                return sock.sendMessage(from, {
                    text: `❌ Rejected — this zip contains server-executable or disallowed file types, which can't be hosted here for security reasons:\n\n${unsafe.slice(0, 10).map(e => `• ${e.entryName}`).join('\n')}\n\nOnly static site files (html/css/js/images/fonts) are allowed.`
                }, { quoted: msg });
            }

            const traversal = entries.filter(e => !isPathInsideDir(e.entryName, siteDir));
            if (traversal.length > 0) {
                await fs.remove(siteDir);
                return sock.sendMessage(from, {
                    text: `❌ Rejected — this zip contains entries that try to write outside the site folder, which isn't allowed for security reasons.`
                }, { quoted: msg });
            }

            // 🐛 FIX: zip tools very commonly wrap everything in one top-level
            // folder (e.g. "mysite/index.html", "mysite/css/style.css") —
            // whatever the zip file itself is named. Extracting that raw
            // structure and just copying index.html up to the root (the old
            // behavior) left its CSS/JS/image references broken, since the
            // files they point to were still sitting inside the nested
            // folder. Now: detect a single common wrapping folder (any name)
            // across every entry and strip it during extraction, so the
            // whole site — not just index.html — always lands correctly at
            // the root, regardless of the zip's internal folder name.
            const topFolders = new Set(entries.map(e => e.entryName.includes('/') ? e.entryName.split('/')[0] : null));
            const singleWrapper = (topFolders.size === 1 && !topFolders.has(null)) ? [...topFolders][0] : null;

            for (const entry of entries) {
                let relPath = entry.entryName;
                if (singleWrapper) relPath = relPath.slice(singleWrapper.length + 1);
                if (!relPath) continue;
                const destPath = path.join(siteDir, relPath);
                await fs.ensureDir(path.dirname(destPath));
                await fs.writeFile(destPath, entry.getData());
            }

            // Ensure an index.html exists at the root so the link works directly
            const hasRootIndex = await fs.pathExists(path.join(siteDir, 'index.html'));
            if (!hasRootIndex) {
                const nested = entries.find(e => e.entryName.toLowerCase().endsWith('index.html'));
                if (nested) {
                    let relPath = nested.entryName;
                    if (singleWrapper) relPath = relPath.slice(singleWrapper.length + 1);
                    const nestedPath = path.join(siteDir, relPath);
                    if (await fs.pathExists(nestedPath)) await fs.copy(nestedPath, path.join(siteDir, 'index.html'));
                }
            }
        } else {
            if (!isSafeExt(fileName)) {
                await fs.remove(siteDir);
                return sock.sendMessage(from, { text: `❌ "${fileName}" isn't a static site file type. Allowed: html, css, js, json, images, fonts.` }, { quoted: msg });
            }
            // Strip any directory components from the filename before using
            // it as a path — otherwise a crafted filename like
            // "../../../etc/cron.d/evil" would let a single-file upload
            // escape siteDir the same way a malicious zip entry could.
            const safeBase = path.basename(fileName);
            const destName = safeBase.endsWith('.html') || safeBase.endsWith('.htm') ? 'index.html' : safeBase;
            await fs.writeFile(path.join(siteDir, destName), buffer);
        }

        const link = `${publicBaseUrl}/hosted/${siteId}/`;
        const warning = isLocalUrl ? '\n\n⚠️ *This link won\'t open from outside this server* — your host doesn\'t expose a public URL automatically. Set the `APP_URL` environment variable to your host\'s real public address (see DEPLOY.md) and try again.' : '';
        await sock.sendMessage(from, { text: `🌐 *Site hosted!*\n\n🔗 ${link}\n\n_Static hosting — HTML/CSS/JS only. Link stays live as long as this bot host is running._${warning}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not host that file. Make sure it\'s a valid zip or HTML file.' }, { quoted: msg });
    }
}

module.exports = { host };
