// commands/tools-advanced.js
// 👑 AWAIS CYBER — Batch 2: 25 advanced general/tool commands.
// Mostly pure local logic (always work); a few use small, stable, no-key
// public APIs (currency, lyrics, unshorten) — clearly separated.

const axios = require('axios');
const crypto = require('crypto');
const dns = require('dns').promises;

// ---- pure local logic ----

async function bmi(sock, from, msg, args) {
    const w = parseFloat(args[0]), h = parseFloat(args[1]);
    if (!w || !h) return sock.sendMessage(from, { text: '⚠️ Usage: `.bmi <weight_kg> <height_cm>`' }, { quoted: msg });
    const bmiVal = w / Math.pow(h / 100, 2);
    let cat = bmiVal < 18.5 ? 'Underweight' : bmiVal < 25 ? 'Normal' : bmiVal < 30 ? 'Overweight' : 'Obese';
    await sock.sendMessage(from, { text: `⚖️ *BMI:* ${bmiVal.toFixed(1)}\n📊 *Category:* ${cat}` }, { quoted: msg });
}

async function age(sock, from, msg, q) {
    const d = new Date(q);
    if (!q || isNaN(d.getTime())) return sock.sendMessage(from, { text: '⚠️ Usage: `.age YYYY-MM-DD`' }, { quoted: msg });
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    let days = now.getDate() - d.getDate();
    if (days < 0) { months--; days += 30; }
    if (months < 0) { years--; months += 12; }
    await sock.sendMessage(from, { text: `🎂 *Age:* ${years} years, ${months} months, ${days} days` }, { quoted: msg });
}

async function palindrome(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.palindrome <text>`' }, { quoted: msg });
    const clean = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isPal = clean === clean.split('').reverse().join('');
    await sock.sendMessage(from, { text: isPal ? '✅ Yeh palindrome hai!' : '❌ Yeh palindrome nahi hai.' }, { quoted: msg });
}

async function password(sock, from, msg, args) {
    const len = Math.min(Math.max(parseInt(args[0]) || 12, 4), 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < len; i++) pass += chars[crypto.randomInt(0, chars.length)];
    await sock.sendMessage(from, { text: `🔑 *Generated Password:*\n\`${pass}\`` }, { quoted: msg });
}

function caesar(text, shift) {
    return text.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + shift + 26) % 26) + base);
    });
}

async function encrypt(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.encrypt <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔐 *Encrypted (Caesar+5):*\n${caesar(q, 5)}` }, { quoted: msg });
}

async function decrypt(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.decrypt <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔓 *Decrypted:*\n${caesar(q, -5)}` }, { quoted: msg });
}

async function hash(sock, from, msg, args, q) {
    const algo = (args[0] || 'sha256').toLowerCase();
    const text = q.slice(String(args[0] || '').length).trim() || q;
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.hash md5|sha1|sha256 <text>`' }, { quoted: msg });
    if (!['md5', 'sha1', 'sha256'].includes(algo)) return sock.sendMessage(from, { text: '⚠️ Supported: md5, sha1, sha256' }, { quoted: msg });
    const h = crypto.createHash(algo).update(text).digest('hex');
    await sock.sendMessage(from, { text: `🧬 *${algo.toUpperCase()}:*\n${h}` }, { quoted: msg });
}

async function randomnum(sock, from, msg, args) {
    const min = parseInt(args[0]) || 1, max = parseInt(args[1]) || 100;
    await sock.sendMessage(from, { text: `🎲 Random number: *${crypto.randomInt(min, max + 1)}*` }, { quoted: msg });
}

const funNames = ['Captain Byte', 'Shadow Falcon', 'Neon Wolf', 'Silent Ninja', 'Cyber Phoenix', 'Ghost Rider', 'Turbo Tiger', 'Iron Hawk'];
async function randomname(sock, from, msg) {
    await sock.sendMessage(from, { text: `🎭 Random name: *${funNames[Math.floor(Math.random() * funNames.length)]}*` }, { quoted: msg });
}

async function anagram(sock, from, msg, q) {
    const parts = (q || '').split(' ').filter(Boolean);
    if (parts.length !== 2) return sock.sendMessage(from, { text: '⚠️ Usage: `.anagram word1 word2`' }, { quoted: msg });
    const norm = s => s.toLowerCase().split('').sort().join('');
    const isAna = norm(parts[0]) === norm(parts[1]);
    await sock.sendMessage(from, { text: isAna ? '✅ Yeh anagram hain!' : '❌ Anagram nahi hain.' }, { quoted: msg });
}

async function vowels(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.vowels <text>`' }, { quoted: msg });
    const count = (q.match(/[aeiouAEIOU]/g) || []).length;
    await sock.sendMessage(from, { text: `🔤 Vowels: *${count}*` }, { quoted: msg });
}

async function caps(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.caps <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.toUpperCase() }, { quoted: msg });
}

async function small(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.small <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.toLowerCase() }, { quoted: msg });
}

async function titlecase(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.titlecase <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase()) }, { quoted: msg });
}

async function emoji(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.emoji <text (letters only)>`' }, { quoted: msg });
    const out = q.toLowerCase().split('').map(c => {
        if (c >= 'a' && c <= 'z') return String.fromCodePoint(0x1F1E6 + (c.charCodeAt(0) - 97));
        return c === ' ' ? '  ' : c;
    }).join(' ');
    await sock.sendMessage(from, { text: out }, { quoted: msg });
}

const morseMap = { A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.' };
const reverseMorse = Object.fromEntries(Object.entries(morseMap).map(([k, v]) => [v, k]));

async function morse(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.morse <text>`' }, { quoted: msg });
    const out = q.toUpperCase().split('').map(c => c === ' ' ? '/' : (morseMap[c] || c)).join(' ');
    await sock.sendMessage(from, { text: `📡 ${out}` }, { quoted: msg });
}

async function unmorse(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.unmorse <morse code>`' }, { quoted: msg });
    const out = q.split(' ').map(c => c === '/' ? ' ' : (reverseMorse[c] || c)).join('');
    await sock.sendMessage(from, { text: `📝 ${out}` }, { quoted: msg });
}

const leetMap = { a:'4', e:'3', i:'1', o:'0', s:'5', t:'7', A:'4', E:'3', I:'1', O:'0', S:'5', T:'7' };
async function leet(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.leet <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.split('').map(c => leetMap[c] || c).join('') }, { quoted: msg });
}

const stylishMap = { a:'𝓪',b:'𝓫',c:'𝓬',d:'𝓭',e:'𝓮',f:'𝓯',g:'𝓰',h:'𝓱',i:'𝓲',j:'𝓳',k:'𝓴',l:'𝓵',m:'𝓶',n:'𝓷',o:'𝓸',p:'𝓹',q:'𝓺',r:'𝓻',s:'𝓼',t:'𝓽',u:'𝓾',v:'𝓿',w:'𝔀',x:'𝔁',y:'𝔂',z:'𝔃' };
async function stylish(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.stylish <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.toLowerCase().split('').map(c => stylishMap[c] || c).join('') }, { quoted: msg });
}

const udMap = { a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z' };
async function ud(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.ud <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.toLowerCase().split('').reverse().map(c => udMap[c] || c).join('') }, { quoted: msg });
}

async function clap(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.clap <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.trim().split(/\s+/).join(' 👏 ') + ' 👏' }, { quoted: msg });
}

// ---- small, stable, key-free public APIs ----

async function currency(sock, from, msg, args) {
    const amount = parseFloat(args[0]);
    const from_c = (args[1] || '').toUpperCase();
    const to_c = (args[2] || '').toUpperCase();
    if (!amount || !from_c || !to_c) return sock.sendMessage(from, { text: '⚠️ Usage: `.currency 100 USD PKR`' }, { quoted: msg });
    try {
        const res = await axios.get(`https://api.frankfurter.app/latest`, { params: { amount, from: from_c, to: to_c }, timeout: 15000 });
        const result = res.data?.rates?.[to_c];
        if (!result) throw new Error('no rate');
        await sock.sendMessage(from, { text: `💱 *Currency Convert*\n\n${amount} ${from_c} = *${result} ${to_c}*` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Conversion nahi ho saki (currency code check karo, PKR jaisi kuch minor currencies is free API mein support nahi hoti).' }, { quoted: msg });
    }
}

async function lyrics(sock, from, msg, q) {
    if (!q || !q.includes(' ')) return sock.sendMessage(from, { text: '⚠️ Usage: `.lyrics Artist Song Name`' }, { quoted: msg });
    const [artist, ...rest] = q.split(' ');
    const song = rest.join(' ');
    try {
        const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`, { timeout: 15000 });
        const text = (res.data?.lyrics || '').slice(0, 3500);
        if (!text) throw new Error('empty');
        await sock.sendMessage(from, { text: `🎵 *${artist} - ${song}*\n\n${text}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Lyrics nahi mile.' }, { quoted: msg });
    }
}

async function unshorten(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.unshorten <short link>`' }, { quoted: msg });
    try {
        const res = await axios.get(q, { maxRedirects: 10, timeout: 15000 });
        await sock.sendMessage(from, { text: `🔗 *Final URL:*\n${res.request?.res?.responseUrl || res.request?.responseURL || q}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Link resolve nahi ho saka.' }, { quoted: msg });
    }
}

async function dnslookup(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.dns <domain>`' }, { quoted: msg });
    try {
        const addresses = await dns.resolve4(q.replace(/^https?:\/\//, '').split('/')[0]);
        await sock.sendMessage(from, { text: `🌐 *DNS (${q}):*\n${addresses.join('\n')}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Domain resolve nahi hua.' }, { quoted: msg });
    }
}

module.exports = {
    bmi, age, palindrome, password, encrypt, decrypt, hash, randomnum,
    randomname, anagram, vowels, caps, small, titlecase, emoji, morse,
    unmorse, leet, stylish, ud, clap, currency, lyrics, unshorten, dnslookup
};
