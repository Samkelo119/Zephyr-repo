// commands/sticker-extra.js
// 👑 AWAIS CYBER — Real image<->sticker conversion using sharp (already a
// dependency). This replaces the previous stub in lib/exif.js which just
// returned the buffer unchanged and never actually made a real sticker.

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🛡️ Safety net: on some hosts (Termux/Android's Bionic libc especially)
// sharp's native binding can fail to load. If we `require('sharp')` at the
// top level and it throws, the ENTIRE bot would crash on startup — not
// just stickers. So we load it lazily/safely instead: stickers degrade
// gracefully with a clear error message instead of taking the whole bot down.
let sharp = null;
let sharpLoadError = null;
try {
    sharp = require('sharp');
} catch (e) {
    sharpLoadError = e;
}

function getQuotedMedia(msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const direct = msg.message?.imageMessage ? msg.message : null;
    const source = quoted || direct?.message || null;
    if (!source && !direct) return null;
    const container = quoted || msg.message;
    const type = container.imageMessage ? 'imageMessage' : container.videoMessage ? 'videoMessage' : null;
    if (!type) return null;
    return { data: container[type], mediaType: type.replace('Message', '') };
}

async function downloadBuffer(data, mediaType) {
    const stream = await downloadContentFromMessage(data, mediaType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

async function sticker(sock, from, msg) {
    try {
        if (!sharp) return sock.sendMessage(from, { text: '❌ Sticker feature unavailable on this host (sharp failed to load). See DEPLOY.md → Termux notes.' }, { quoted: msg });
        const media = getQuotedMedia(msg);
        if (!media || media.mediaType !== 'image') {
            return sock.sendMessage(from, { text: '❌ Reply to an image with `.sticker`.' }, { quoted: msg });
        }
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        const buffer = await downloadBuffer(media.data, media.mediaType);
        const webp = await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 80 })
            .toBuffer();
        await sock.sendMessage(from, { sticker: webp }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Error while creating the sticker.' }, { quoted: msg });
    }
}

async function toimg(sock, from, msg) {
    try {
        if (!sharp) return sock.sendMessage(from, { text: '❌ This feature unavailable on this host (sharp failed to load). See DEPLOY.md → Termux notes.' }, { quoted: msg });
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted?.stickerMessage) {
            return sock.sendMessage(from, { text: '❌ Reply to a sticker with `.toimg`.' }, { quoted: msg });
        }
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        const buffer = await downloadBuffer(quoted.stickerMessage, 'sticker');
        const png = await sharp(buffer).png().toBuffer();
        await sock.sendMessage(from, { image: png, caption: '✅ Sticker to Image done.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Conversion failed.' }, { quoted: msg });
    }
}

module.exports = { sticker, toimg };
