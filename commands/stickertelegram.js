'use strict';

/**
 * Telegram sticker pack downloader — sends each sticker as a WhatsApp sticker.
 * Uses only node-fetch and node-webpmux (no sharp dependency).
 *
 * The Telegram bot token is REQUIRED. Provide it one of these ways (in order):
 *   1. TELEGRAM_BOT_TOKEN environment variable
 *   2. the Admin Panel -> API Keys tab (stored as `telegramBotToken`)
 * Create a fresh token by messaging @BotFather on Telegram (/newbot).
 */

const fetch = (...a) => import('node-fetch').then(m => m.default(...a));
const webp  = require('node-webpmux');
const fs    = require('fs');
const path  = require('path');
const apiKeys = require('../lib/apiKeys');

const FOOTER   = '\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ZᴇPʜʏʀ~Mᴅ';
const delay    = ms => new Promise(r => setTimeout(r, ms));
const TMP_DIR  = path.join(__dirname, '../tmp');

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function getToken() {
    const env = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (env) return env;
    try { return String(apiKeys.get('telegramBotToken') || '').trim(); } catch (e) { return ''; }
}

async function addStickerExif(buffer, packName = 'ZᴇPʜʏʀ~Mᴅ') {
    try {
        const img      = new webp.Image();
        await img.load(buffer);
        const meta     = { 'sticker-pack-name': packName, 'sticker-pack-publisher': 'MʀDɪᴇHᴀʀᴅ TᴇᴄʜX' };
        const jsonBuf  = Buffer.from(JSON.stringify(meta), 'utf8');
        const exifAttr = Buffer.from([
            0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,
            0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00,
        ]);
        const exif = Buffer.concat([exifAttr, jsonBuf]);
        exif.writeUIntLE(jsonBuf.length, 14, 4);
        img.exif = exif;
        return await img.save(null);
    } catch (_) { return buffer; }
}

module.exports = {
    name       : 'stickertelegram',
    aliases    : ['tgsticker', 'tgs', 'tg'],
    description: 'Download a Telegram sticker pack and send as WhatsApp stickers',
    execute    : async (sock, remoteJid, message, args) => {
        const url = args[0] || '';
        if (!url.includes('t.me/addstickers/')) {
            return sock.sendMessage(remoteJid, {
                text: [
                    `╔══〔 🎭 𝗧𝗲𝗹𝗲𝗴𝗿𝗮𝗺 𝗦𝘁𝗶𝗰𝗸𝗲𝗿𝘀 〕══╗`,
                    ``,
                    `❓  *ᴜꜱᴀɢᴇ:*  .tg <ᴘᴀᴄᴋ ᴜʀʟ>`,
                    `📌  *ᴇxᴀᴍᴘʟᴇ:* .tg https://t.me/addstickers/Animals`,
                ].join('\n') + FOOTER,
            }, { quoted: message });
        }

        const BOT_TOKEN = getToken();
        if (!BOT_TOKEN) {
            await sock.sendMessage(remoteJid, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(remoteJid, {
                text: [
                    `❌ *ᴛᴇʟᴇɢʀᴀᴍ ᴛᴏᴋᴇɴ ᴍɪꜱꜱɪɴɢ*`,
                    ``,
                    `This command needs a Telegram bot token.`,
                    ``,
                    `1. Open Telegram and message *@BotFather*`,
                    `2. Send /newbot and copy the token it gives you`,
                    `3. Set it as the *TELEGRAM_BOT_TOKEN* environment variable,`,
                    `   or add it in the Admin Panel → 🔑 API Keys (telegramBotToken).`,
                ].join('\n') + FOOTER,
            }, { quoted: message });
        }

        const packName = url.replace(/.*\/addstickers\//i, '').trim();
        await sock.sendMessage(remoteJid, { react: { text: '⏳', key: message.key } });

        try {
            const setRes  = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getStickerSet?name=${encodeURIComponent(packName)}`);
            const setData = await setRes.json();
            if (!setData.ok) {
                if (setData.error_code === 401) throw new Error('Telegram token is invalid or expired — set a fresh TELEGRAM_BOT_TOKEN');
                throw new Error(setData.description || 'Pack not found or is private');
            }

            const all = setData.result.stickers || [];
            // Only static .webp stickers convert cleanly without ffmpeg.
            const staticStickers = all.filter(s => !s.is_animated && !s.is_video).slice(0, 20);
            const skipped = Math.min(all.length, 20) - staticStickers.length;

            if (staticStickers.length === 0) {
                await sock.sendMessage(remoteJid, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(remoteJid, {
                    text: `⚠️ *${setData.result.title}* contains only animated/video stickers, which can't be sent as WhatsApp stickers from here.` + FOOTER,
                }, { quoted: message });
            }

            await sock.sendMessage(remoteJid, {
                text: `📦 *${setData.result.title}*\n⏳ ꜱᴇɴᴅɪɴɢ *${staticStickers.length}* ꜱᴛɪᴄᴋᴇʀꜱ…`
                    + (skipped > 0 ? `\n_(${skipped} animated/video skipped)_` : '') + FOOTER,
            }, { quoted: message });

            let ok = 0;
            for (const sticker of staticStickers) {
                try {
                    const fi = await (await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${sticker.file_id}`)).json();
                    if (!fi.ok) continue;
                    const buf = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${fi.result.file_path}`)).arrayBuffer());
                    const wbuf = await addStickerExif(buf, setData.result.title);
                    await sock.sendMessage(remoteJid, { sticker: wbuf });
                    ok++;
                    await delay(800);
                } catch (_) { /* skip failed sticker */ }
            }

            await sock.sendMessage(remoteJid, {
                text: `✅ ꜱᴇɴᴛ *${ok}/${staticStickers.length}* ꜱᴛɪᴄᴋᴇʀꜱ ꜰʀᴏᴍ *${setData.result.title}*!` + FOOTER,
            }, { quoted: message });
            await sock.sendMessage(remoteJid, { react: { text: '✅', key: message.key } });

        } catch (err) {
            await sock.sendMessage(remoteJid, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(remoteJid, {
                text: `❌ *ᴄᴏᴜʟᴅɴ'ᴛ ꜰᴇᴛᴄʜ ᴘᴀᴄᴋ*\n\n_${err.message}_` + FOOTER,
            }, { quoted: message });
        }
    },
};
