// commands/fetchsite.js
// 👑 AWAIS CYBER — .fetch: download a website's PUBLIC, client-side
// files and hand them back as a zip.
//
// What this grabs is exactly what any visitor's browser already
// downloads to render the page: the HTML, linked CSS, linked JS, and
// images. That's public by definition — every visitor gets it.
//
// What this can NEVER get (and doesn't try to): server-side source
// (.php, .py, database configs, etc). Those never leave the server —
// the browser only ever receives their OUTPUT (the HTML). There is no
// way to "extract" server-side code from a public link without the
// server itself being misconfigured/compromised, and this tool makes
// no attempt to do that — it's a plain, unauthenticated GET, the same
// request any browser makes.

const axios = require('axios');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');
const path = require('path');
const { assertSafeUrl, NO_REDIRECT_AXIOS_OPTS } = require('../lib/ssrfGuard');

const MAX_ASSETS = 40;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25MB
const PER_REQUEST_TIMEOUT = 15000;

function resolveUrl(href, base) {
    try { return new URL(href, base).toString(); } catch (e) { return null; }
}

function safeFileName(url, fallbackExt) {
    try {
        const u = new URL(url);
        let name = path.basename(u.pathname) || `file${fallbackExt}`;
        if (!path.extname(name)) name += fallbackExt;
        return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    } catch (e) {
        return `file_${Date.now()}${fallbackExt}`;
    }
}

async function fetchsite(sock, from, msg, q) {
    if (!q || !/^https?:\/\//i.test(q.trim())) {
        return sock.sendMessage(from, { text: '⚠️ Usage: `.fetch <website URL>`\nExample: `.fetch https://example.com`\n\nGrabs the public HTML/CSS/JS/images — the same files any visitor\'s browser downloads. Cannot access server-side code (PHP/Python/databases) — that never leaves the server, for anyone.' }, { quoted: msg });
    }
    const targetUrl = q.trim();

    try {
        // 🛡️ SSRF protection — reject the target before we ever connect
        // to it (private/internal addresses, cloud metadata endpoint,
        // non-http(s) schemes). See lib/ssrfGuard.js for the full policy.
        try {
            await assertSafeUrl(targetUrl);
        } catch (guardErr) {
            return sock.sendMessage(from, { text: `❌ ${guardErr.message}` }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `🌐 Fetching *${targetUrl}* ...` }, { quoted: msg });

        const pageRes = await axios.get(targetUrl, { timeout: PER_REQUEST_TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AwaisCyberBot/1.0)' }, ...NO_REDIRECT_AXIOS_OPTS });
        const html = pageRes.data;
        const $ = cheerio.load(html);

        const assetUrls = new Set();
        $('link[rel="stylesheet"][href]').each((i, el) => { const u = resolveUrl($(el).attr('href'), targetUrl); if (u) assetUrls.add(u); });
        $('script[src]').each((i, el) => { const u = resolveUrl($(el).attr('src'), targetUrl); if (u) assetUrls.add(u); });
        $('img[src]').each((i, el) => { const u = resolveUrl($(el).attr('src'), targetUrl); if (u) assetUrls.add(u); });
        $('link[rel="icon"][href], link[rel="shortcut icon"][href]').each((i, el) => { const u = resolveUrl($(el).attr('href'), targetUrl); if (u) assetUrls.add(u); });

        const zip = new AdmZip();
        zip.addFile('index.html', Buffer.from(html, 'utf8'));

        let totalBytes = Buffer.byteLength(html, 'utf8');
        let downloaded = 0;
        const usedNames = new Set(['index.html']);

        for (const assetUrl of assetUrls) {
            if (downloaded >= MAX_ASSETS || totalBytes >= MAX_TOTAL_BYTES) break;
            try {
                // Same SSRF guard applies to every asset URL — the page's
                // own HTML controls these, so a malicious page could
                // otherwise point an <img>/<script> at an internal address.
                await assertSafeUrl(assetUrl);
                const res = await axios.get(assetUrl, { responseType: 'arraybuffer', timeout: PER_REQUEST_TIMEOUT, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AwaisCyberBot/1.0)' }, ...NO_REDIRECT_AXIOS_OPTS });
                const buf = Buffer.from(res.data);
                if (totalBytes + buf.length > MAX_TOTAL_BYTES) continue;

                const ext = path.extname(new URL(assetUrl).pathname) || '.bin';
                let name = safeFileName(assetUrl, ext);
                while (usedNames.has(`assets/${name}`)) name = `${Date.now()}_${name}`;
                usedNames.add(`assets/${name}`);

                zip.addFile(`assets/${name}`, buf);
                totalBytes += buf.length;
                downloaded++;
            } catch (e) { /* skip assets that fail to download, don't abort the whole fetch */ }
        }

        const zipBuffer = zip.toBuffer();
        await sock.sendMessage(from, {
            document: zipBuffer,
            mimetype: 'application/zip',
            fileName: '𝘡𝘌𝘗𝘏𝘠𝘙  Bot Extract File.zip'
        }, { quoted: msg });

        await sock.sendMessage(from, {
            text: `✅ *Done!*\n\n📄 index.html + ${downloaded} asset(s) (${(totalBytes / 1024).toFixed(0)}KB)\n\nℹ️ This contains the public HTML/CSS/JS/images only — the same files your browser downloads to show the page. Server-side code (PHP/Python/database) can't be extracted this way for any website — it never gets sent to browsers in the first place.`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Could not fetch that URL: ${e.message}` }, { quoted: msg });
    }
}

module.exports = { fetchsite };
