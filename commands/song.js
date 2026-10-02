const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { toAudio } = require('../lib/converter');

let playdl = null;
try { playdl = require('play-dl'); } catch (e) { playdl = null; }

const BASE = 'https://apis.davidcyriltech.my.id';

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

// ---- Primary resolver (play-dl) ---------------------------------------------
async function searchYoutube(query) {
    const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(query);
    if (isUrl) {
        if (playdl) {
            try {
                const info = await playdl.video_info(query);
                const d = info.video_details;
                return {
                    url: query,
                    title: d.title || 'Unknown',
                    artist: d.channel?.name || 'Unknown',
                    thumbnail: d.thumbnails?.slice(-1)[0]?.url || '',
                    duration: d.durationRaw || ''
                };
            } catch (e) {}
        }
        const id = query.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
        return { url: query, title: 'YouTube Audio', artist: 'Unknown', thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '', duration: '' };
    }
    if (playdl) {
        try {
            const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
            if (results?.length) {
                const v = results[0];
                return {
                    url: v.url,
                    title: v.title || 'Unknown',
                    artist: v.channel?.name || 'Unknown',
                    thumbnail: v.thumbnails?.slice(-1)[0]?.url || '',
                    duration: v.durationRaw || ''
                };
            }
        } catch (e) {}
    }
    // Fallback: yt-search
    const yts = require('yt-search');
    const search = await yts(query);
    if (!search || !search.videos.length) throw new Error('No results found for: ' + query);
    const v = search.videos[0];
    return { url: v.url, title: v.title || 'Unknown', artist: v.author?.name || 'Unknown', thumbnail: v.thumbnail || '', duration: v.timestamp || '' };
}

async function downloadMp3Primary(videoUrl) {
    const { data } = await axios.get(`${BASE}/download/ytmp3?url=${encodeURIComponent(videoUrl)}`, { timeout: 30000 });
    const link = data?.result?.download_url || data?.result?.downloadUrl || data?.result?.url || data?.url || data?.link;
    if (!link) throw new Error('No download link in API response');
    return link;
}

// ---- Fallback resolvers ------------------------------------------------------
async function getEliteProTechDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) return { download: res.data.downloadURL, title: res.data.title };
    throw new Error('EliteProTech returned no download');
}

async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) return { download: res.data.data.download_url, title: res.data.data.title, thumbnail: res.data.data.thumbnail };
    throw new Error('Yupra returned no download');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) return { download: res.data.dl, title: res.data.title, thumbnail: res.data.thumb };
    throw new Error('Okatsu returned no download');
}

async function songCommand(sock, chatId, message) {
    try {
        for (const emoji of ['📥', '⏳', '🎵']) {
            try { await sock.sendMessage(chatId, { react: { text: emoji, key: message.key } }); } catch (e) {}
        }

        const messageContent = message.message?.ephemeralMessage?.message || message.message?.viewOnceMessage?.message || message.message?.viewOnceMessageV2?.message || message.message;
        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || '').trim();
        const query = text.replace(/^\.(song|play|music|ytmp3|ytsong|ytaudio|yta)\s+/i, '').trim();

        if (!query || /^\.(song|play|music|ytmp3|ytsong|ytaudio|yta)$/i.test(query)) {
            await sock.sendMessage(chatId, { text: '🎵 Usage: `.play <song name or YouTube link>`\nExample: `.play Blinding Lights`' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { text: `🔍 Searching: *${query}*...` }, { quoted: message });

        const track = await searchYoutube(query);

        await sock.sendMessage(chatId, {
            image: { url: track.thumbnail || 'https://files.catbox.moe/5uli5p.jpeg' },
            caption: `🎵 *${track.title}*\n🎤 *Artist:* ${track.artist || 'Unknown'}\n⏱ *Duration:* ${track.duration || 'N/A'}\n\n_Downloading..._`
        }, { quoted: message });

        let audioBuffer = null;
        let finalTitle = track.title;
        let downloadSuccess = false;

        // Primary: davidcyriltech API
        const apiMethods = [
            { name: 'DavidCyril', method: async () => ({ download: await downloadMp3Primary(track.url), title: track.title }) },
            { name: 'EliteProTech', method: () => getEliteProTechDownloadByUrl(track.url) },
            { name: 'Yupra', method: () => getYupraDownloadByUrl(track.url) },
            { name: 'Okatsu', method: () => getOkatsuDownloadByUrl(track.url) }
        ];

        for (const apiMethod of apiMethods) {
            try {
                const audioData = await apiMethod.method();
                const audioUrl = audioData.download;
                finalTitle = audioData.title || track.title;
                if (!audioUrl) continue;

                const audioResponse = await axios.get(audioUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
                });
                audioBuffer = Buffer.from(audioResponse.data);
                if (audioBuffer && audioBuffer.length > 0) { downloadSuccess = true; break; }
            } catch (err) {
                console.log(`[song] ${apiMethod.name} failed:`, err.message);
            }
        }

        if (!downloadSuccess) throw new Error('All download sources failed.');

        const firstBytes = audioBuffer.slice(0, 4).toString('hex');
        let fileExtension = 'mp3';
        if (firstBytes.startsWith('000000') || audioBuffer.slice(4, 8).toString('ascii') === 'ftyp') fileExtension = 'm4a';
        else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') fileExtension = 'ogg';
        else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') fileExtension = 'wav';

        let finalBuffer = audioBuffer;
        if (fileExtension !== 'mp3') {
            finalBuffer = await toAudio(audioBuffer, fileExtension);
        }

        const safeName = (finalTitle || 'song').replace(/[^\w\s-]/g, '').trim().slice(0, 50) || 'song';

        await sock.sendMessage(chatId, {
            audio: finalBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${safeName}.mp3`,
            ptt: false
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            document: finalBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${safeName}.mp3`
        }, { quoted: message });

    } catch (err) {
        console.error('Song command error:', err);
        await sock.sendMessage(chatId, { text: `❌ Download failed: ${err.message}` }, { quoted: message });
    }
}

module.exports = songCommand;
