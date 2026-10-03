const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Pick the best video URL from any of the response shapes the downloader
// APIs return. Supports the current Siputzx shape
//   { data: { title, thumbnail, downloads: [{ quality, type, url }] } }
// as well as the older shape where the list lives at data.data.
function extractVideo(root) {
    const node = (root && (root.data || root.result)) || root || {};
    const title = node.title || node.meta?.title || (node.data && node.data.title) || 'Facebook Video';
    const thumbnail = node.thumbnail || node.thumb || null;

    let list = node.downloads || node.data || node.medias || node.links || node.urls || [];
    if (!Array.isArray(list)) list = [];

    const norm = list
        .map(item => ({
            url: item.url || item.link || item.hd || item.sd || item.download_url,
            quality: String(item.quality || item.resolution || item.label || item.quality_label || ''),
            type: String(item.type || item.format || item.extension || '')
        }))
        .filter(x => typeof x.url === 'string' && x.url.startsWith('http'));

    const score = q => (/2160|1440|1080|hd/i.test(q) ? 3 : /720/i.test(q) ? 2 : /480|sd|360/i.test(q) ? 1 : 2);
    norm.sort((a, b) => score(b.quality) - score(a.quality));

    return { title, thumbnail, url: norm[0]?.url || null, all: norm };
}

// Each entry returns a parsed API payload (or throws). Kept as a small
// fallback chain so one dead provider doesn't kill the command.
const PROVIDERS = [
    {
        name: 'Siputzx',
        build: u => `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(u)}`
    },
    {
        name: 'Vreden',
        build: u => `https://api.vreden.my.id/api/fbdownload?url=${encodeURIComponent(u)}`
    }
];

async function fetchFromProvider(provider, url) {
    const res = await axios.get(provider.build(url), {
        timeout: 25000,
        headers: { accept: '*/*', 'User-Agent': UA },
        maxRedirects: 5,
        validateStatus: s => s >= 200 && s < 500
    });
    if (!res.data) throw new Error(`${provider.name} returned no data`);
    return res.data;
}

async function facebookCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url) {
            return await sock.sendMessage(chatId, {
                text: 'Please provide a Facebook video URL.\nExample: .fb https://www.facebook.com/...'
            }, { quoted: message });
        }

        if (!/(facebook\.com|fb\.watch|fb\.com)/i.test(url)) {
            return await sock.sendMessage(chatId, { text: 'That is not a Facebook link.' }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔄', key: message.key } });

        // Resolve share/short (fb.watch) links to their final destination first.
        let resolvedUrl = url;
        try {
            const res = await axios.get(url, { timeout: 20000, maxRedirects: 10, headers: { 'User-Agent': UA } });
            const possible = res?.request?.res?.responseUrl;
            if (typeof possible === 'string') resolvedUrl = possible;
        } catch { /* use original url */ }

        let video = null;
        let usedProvider = null;
        for (const provider of PROVIDERS) {
            for (const target of [resolvedUrl, url]) {
                try {
                    const payload = await fetchFromProvider(provider, target);
                    const parsed = extractVideo(payload);
                    if (parsed.url) {
                        video = parsed;
                        usedProvider = provider.name;
                        break;
                    }
                } catch (e) {
                    console.error(`${provider.name} failed: ${e.message}`);
                }
            }
            if (video) break;
        }

        if (!video || !video.url) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(chatId, {
                text: '❌ Failed to get the video from Facebook.\n\nPossible reasons:\n• Video is private or deleted\n• Link is invalid or region-locked\n\nPlease try a different Facebook video link.'
            }, { quoted: message });
        }

        const caption = `> DOWNLOAD BY 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋\n\nTitle: ${video.title}`;

        // Prefer streaming by URL; fall back to downloading a buffer.
        try {
            await sock.sendMessage(chatId, { video: { url: video.url }, mimetype: 'video/mp4', caption }, { quoted: message });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            return;
        } catch (urlError) {
            console.error(`URL send failed (${usedProvider}): ${urlError.message}`);
        }

        try {
            const tmpDir = path.join(process.cwd(), 'tmp');
            fs.mkdirSync(tmpDir, { recursive: true });
            const tempFile = path.join(tmpDir, `fb_${Date.now()}.mp4`);

            const videoResponse = await axios({
                method: 'GET',
                url: video.url,
                responseType: 'stream',
                timeout: 90000,
                headers: {
                    'User-Agent': UA,
                    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.facebook.com/'
                }
            });

            const writer = fs.createWriteStream(tempFile);
            videoResponse.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
                throw new Error('Downloaded file is empty');
            }

            await sock.sendMessage(chatId, { video: { url: tempFile }, mimetype: 'video/mp4', caption }, { quoted: message });
            try { fs.unlinkSync(tempFile); } catch (e) {}
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            return;
        } catch (bufferError) {
            console.error(`Buffer download failed: ${bufferError.message}`);
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(chatId, {
                text: '❌ Found the video but could not send it. The source may have expired — please try again.'
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in Facebook command:', error);
        try { await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } }); } catch (e) {}
        await sock.sendMessage(chatId, { text: 'An error occurred. API might be down. Error: ' + error.message }, { quoted: message });
    }
}

module.exports = facebookCommand;
