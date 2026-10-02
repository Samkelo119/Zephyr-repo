/**
 * ZEPHYR-MD - YouTube Video Downloader
 * Search by name or paste a link, then download the video automatically.
 * Usage: .video <name or link>
 */

const yts = require('yt-search');
const axios = require('axios');
const settings = require('../../settings');

function normalizeYouTubeUrl(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
    return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

async function fetchDownloadData(url, retries = 2) {
    try {
        const apiUrl = `https://jawad-tech.vercel.app/download/ytdl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { timeout: 20000 });
        const data = response.data;
        if (data.status === true && data.result) {
            return {
                video_url: data.result.mp4,
                title: data.result.title || 'YouTube Video'
            };
        }
        throw new Error('API failed to return download link.');
    } catch (error) {
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return fetchDownloadData(url, retries - 1);
        }
        return null;
    }
}

module.exports = {
    name: 'video',
    aliases: ['ytmp4', 'vdl', 'ytvideo'],
    category: 'download',
    description: 'Search and download high-quality videos from YouTube.',
    usage: '.video <name or link>',
    react: '🎥',

    async execute(conn, mek, args, chatId) {
        const prefix = settings.prefix || '.';
        const q = (args || []).join(' ').trim();
        const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: mek });

        try {
            if (!q) return reply(`🎥 *Video Downloader*\n\nUsage: \`${prefix}video <name or link>\`\nExample: \`${prefix}video perfect ed sheeran\`${settings.footer}`);

            await conn.sendMessage(chatId, { react: { text: '🔍', key: mek.key } });

            const url = normalizeYouTubeUrl(q);
            let ytdata;

            if (url) {
                const videoId = q.split('v=')[1]?.split('&')[0] || q.split('/').pop();
                ytdata = await yts({ videoId });
            } else {
                const searchResults = await yts(q);
                if (!searchResults.videos.length) return reply(`❌ No videos found for your query!${settings.footer}`);
                ytdata = searchResults.videos[0];
            }

            const infoText = `🎥 *YT VIDEO DOWNLOADER* 🎥\n\n` +
                `📌 *Title:* ${ytdata.title}\n` +
                `🎬 *Channel:* ${ytdata.author?.name || 'Unknown'}\n` +
                `⏱️ *Duration:* ${ytdata.timestamp}\n` +
                `👁️ *Views:* ${(ytdata.views || 0).toLocaleString()}\n\n` +
                `_📥 Processing your video file, please wait..._${settings.footer}`;

            await conn.sendMessage(chatId, { image: { url: ytdata.thumbnail || ytdata.image }, caption: infoText }, { quoted: mek });
            await conn.sendMessage(chatId, { react: { text: '⏳', key: mek.key } });

            const dlData = await fetchDownloadData(ytdata.url);
            if (!dlData || !dlData.video_url) {
                await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
                return reply(`❌ Download link could not be generated. Please try again later.${settings.footer}`);
            }

            await conn.sendMessage(chatId, {
                video: { url: dlData.video_url },
                mimetype: 'video/mp4',
                caption: `✅ *${dlData.title}*${settings.footer}`,
                contextInfo: {
                    externalAdReply: {
                        title: 'YT VIDEO DOWNLOADER',
                        body: dlData.title,
                        thumbnailUrl: ytdata.thumbnail || ytdata.image,
                        sourceUrl: ytdata.url,
                        mediaType: 2,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        } catch (e) {
            console.error('Video DL Error:', e.message);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            reply(`⚠️ *Error:* ${e.message || 'Something went wrong.'}${settings.footer}`);
        }
    }
};
