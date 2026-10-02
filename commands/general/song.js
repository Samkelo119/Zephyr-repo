/**
 * ZEPHYR-MD - YouTube Song / Audio Downloader
 * Download songs by name or link and send them as audio.
 * Usage: .song <name or link>
 */

const axios = require('axios');
const yts = require('yt-search');
const settings = require('../../settings');

const MY_CHANNEL = '120363409420355330@newsletter';

module.exports = {
    name: 'song',
    aliases: ['ytmp3', 'songdl', 'musicdl'],
    category: 'download',
    description: 'Download songs via name or link.',
    usage: '.song <name or link>',
    react: '🎧',

    async execute(conn, mek, args, chatId) {
        const prefix = settings.prefix || '.';
        const q = (args || []).join(' ').trim();
        const reply = (text) => conn.sendMessage(chatId, { text }, { quoted: mek });

        try {
            if (!q) return reply(`🎧 *Song Downloader*\n\nUsage: \`${prefix}song <name or link>\`\nExample: \`${prefix}song perfect ed sheeran\`${settings.footer}`);

            await conn.sendMessage(chatId, { react: { text: '🔎', key: mek.key } });

            let videoUrl = q;
            let vid;

            const isUrl = q.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g);

            if (isUrl) {
                const videoId = q.split('v=')[1] || q.split('/').pop();
                vid = await yts({ videoId });
                videoUrl = q;
            } else {
                const search = await yts(q);
                if (!search || !search.videos.length) return reply(`❌ No results found.${settings.footer}`);
                vid = search.videos[0];
                videoUrl = vid.url;
            }

            await conn.sendMessage(chatId, {
                image: { url: vid.thumbnail || vid.image },
                caption: `╭━━〔 🎵 *MUSIC FOUND* 〕━━━╮\n┃ 🎧 *Title* : ${vid.title}\n┃ ⏱️ *Duration* : ${vid.timestamp || 'N/A'}\n┃ 🔗 *Link* : ${videoUrl}\n╰━━━━━━━━━━━━━━━━━╯\n\n⏳ *Downloading audio...*${settings.footer}`,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: MY_CHANNEL,
                        newsletterName: settings.channel?.name || '⚡ZᴇPʜʏʀ~Mᴅ⚡',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });

            const api = `https://yt-dl.officialhectormanuel.workers.dev/?url=${encodeURIComponent(videoUrl)}`;
            const { data } = await axios.get(api);

            if (!data || !data.status || !data.audio) {
                return reply(`❌ API error! Try again later.${settings.footer}`);
            }

            await conn.sendMessage(chatId, {
                audio: { url: data.audio },
                mimetype: 'audio/mpeg',
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: MY_CHANNEL,
                        newsletterName: settings.channel?.name || '⚡ZᴇPʜʏʀ~Mᴅ⚡',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });

            await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        } catch (err) {
            console.error('Song DL Error:', err.message);
            await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
            reply(`❌ Error: ${err.message}${settings.footer}`);
        }
    }
};
