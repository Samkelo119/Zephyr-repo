// commands/web-extra.js
// 👑 AWAIS CYBER — Commands that call small, stable, key-free public APIs.
// (No API key needed, but since they're internet-dependent, if the third
// party service itself is ever down, that single command will fail — the
// rest of the bot keeps working as normal.)

const axios = require('axios');

async function qr(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.qr <text or link>`' }, { quoted: msg });
    try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`;
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        await sock.sendMessage(from, { image: Buffer.from(res.data), caption: `📱 *QR Code:*\n${q}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not generate the QR code.' }, { quoted: msg });
    }
}

async function shorturl(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.shorturl <link>`' }, { quoted: msg });
    try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`, { timeout: 15000 });
        await sock.sendMessage(from, { text: `🔗 *Short URL:*\n${res.data}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not shorten the link.' }, { quoted: msg });
    }
}

async function translate(sock, from, msg, args, q) {
    const lang = args[0];
    const text = q.slice(String(lang || '').length).trim();
    if (!lang || !text) return sock.sendMessage(from, { text: '⚠️ Usage: `.translate en <matn>` (lang code: en, ur, ar, hi, etc.)' }, { quoted: msg });
    try {
        const res = await axios.get('https://api.mymemory.translated.net/get', {
            params: { q: text, langpair: `auto|${lang}` },
            timeout: 15000
        });
        const translated = res.data?.responseData?.translatedText;
        if (!translated) throw new Error('empty');
        await sock.sendMessage(from, { text: `🌐 *Translation (${lang}):*\n\n${translated}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Translation failed.' }, { quoted: msg });
    }
}

async function weather(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.weather <city>`' }, { quoted: msg });
    try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=%l:+%c+%t+(feels+%f)+💧%h+💨%w`, { timeout: 15000 });
        await sock.sendMessage(from, { text: `⛅ *Weather:*\n\n${res.data}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Could not fetch the weather data.' }, { quoted: msg });
    }
}

async function define(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.define <word>`' }, { quoted: msg });
    try {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.split(' ')[0])}`, { timeout: 15000 });
        const entry = res.data[0];
        const meaning = entry?.meanings?.[0];
        const def = meaning?.definitions?.[0]?.definition || 'Not found.';
        const example = meaning?.definitions?.[0]?.example;
        let text = `📖 *${entry.word}* (${meaning?.partOfSpeech || '-'})\n\n${def}`;
        if (example) text += `\n\n💬 _Example: ${example}_`;
        await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Word not found in the dictionary.' }, { quoted: msg });
    }
}

module.exports = { qr, shorturl, translate, weather, define };
