// commands/batch5.js
// 👑 AWAIS CYBER — Batch 5: developer tools, converters, reliable fun commands.
// Local-logic commands are 100% reliable (no API to go down). The few
// API-based ones use long-established, free, no-key services chosen
// for stability (adviceslip.com, opentdb.com, worldtimeapi.org,
// ip-api.com, api.chucknorris.io — all widely used, years-old, no key
// required, so they don't rot like random personal-hosted endpoints).

const axios = require('axios');
const crypto = require('crypto');
const AXIOS_OPTS = { timeout: 10000 };

// ---- unit / format converters (pure logic) ----

async function unitconvert(sock, from, msg, args) {
    const [value, from_unit, , to_unit] = args; // e.g. .unitconvert 10 km to miles
    const v = parseFloat(value);
    if (isNaN(v) || !from_unit || !to_unit) return sock.sendMessage(from, { text: '⚠️ Usage: `.unitconvert <value> <from> to <to>`\nExample: `.unitconvert 10 km to miles`\nSupports: km/miles, kg/lbs, c/f, m/ft' }, { quoted: msg });
    const f = from_unit.toLowerCase(), t = to_unit.toLowerCase();
    let result, unit;
    const pairs = {
        'km-miles': v * 0.621371, 'miles-km': v / 0.621371,
        'kg-lbs': v * 2.20462, 'lbs-kg': v / 2.20462,
        'c-f': (v * 9 / 5) + 32, 'f-c': (v - 32) * 5 / 9,
        'm-ft': v * 3.28084, 'ft-m': v / 3.28084
    };
    const key = `${f}-${t}`;
    if (!(key in pairs)) return sock.sendMessage(from, { text: '⚠️ Unsupported conversion. Supported: km/miles, kg/lbs, c/f, m/ft' }, { quoted: msg });
    result = pairs[key].toFixed(2);
    await sock.sendMessage(from, { text: `🔄 ${v} ${f} = *${result} ${t}*` }, { quoted: msg });
}

async function passwordstrength(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.passwordstrength <password>`' }, { quoted: msg });
    let score = 0;
    const checks = [
        { test: q.length >= 8, label: '8+ characters' },
        { test: q.length >= 12, label: '12+ characters (bonus)' },
        { test: /[a-z]/.test(q), label: 'lowercase letter' },
        { test: /[A-Z]/.test(q), label: 'uppercase letter' },
        { test: /[0-9]/.test(q), label: 'number' },
        { test: /[^a-zA-Z0-9]/.test(q), label: 'symbol' }
    ];
    checks.forEach(c => { if (c.test) score++; });
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent'];
    const bar = '🟩'.repeat(score) + '⬜'.repeat(checks.length - score);
    await sock.sendMessage(from, { text: `🔐 *Password Strength:* ${labels[score]}\n${bar}\n\n✅ Passed: ${checks.filter(c => c.test).map(c => c.label).join(', ') || 'none'}` }, { quoted: msg });
}

async function emailvalidate(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.emailvalidate <email>`' }, { quoted: msg });
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.trim());
    await sock.sendMessage(from, { text: valid ? `✅ "${q}" looks like a valid email format.` : `❌ "${q}" is not a valid email format.` }, { quoted: msg });
}

async function phonevalidate(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.phonevalidate <number>`' }, { quoted: msg });
    const digits = q.replace(/[^0-9]/g, '');
    const valid = digits.length >= 10 && digits.length <= 15;
    await sock.sendMessage(from, { text: valid ? `✅ Valid-looking number: +${digits}` : `❌ "${q}" doesn't look like a valid international phone number.` }, { quoted: msg });
}

async function hex2rgb(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.hex2rgb <hex color>`\nExample: `.hex2rgb #ff5733`' }, { quoted: msg });
    const hex = q.replace('#', '').trim();
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return sock.sendMessage(from, { text: '❌ Invalid hex color. Use format like ff5733.' }, { quoted: msg });
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    await sock.sendMessage(from, { text: `🎨 *RGB:* rgb(${r}, ${g}, ${b})` }, { quoted: msg });
}

async function rgb2hex(sock, from, msg, args) {
    const [r, g, b] = args.map(Number);
    if ([r, g, b].some(n => isNaN(n) || n < 0 || n > 255)) return sock.sendMessage(from, { text: '⚠️ Usage: `.rgb2hex <r> <g> <b>`\nExample: `.rgb2hex 255 87 51`' }, { quoted: msg });
    const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
    await sock.sendMessage(from, { text: `🎨 *HEX:* ${hex}` }, { quoted: msg });
}

async function base(sock, from, msg, args) {
    const [value, fromBase, toBase] = args;
    if (!value || !fromBase || !toBase) return sock.sendMessage(from, { text: '⚠️ Usage: `.base <value> <fromBase> <toBase>`\nExample: `.base 255 10 16` (decimal to hex)' }, { quoted: msg });
    try {
        const num = parseInt(value, parseInt(fromBase));
        if (isNaN(num)) throw new Error();
        await sock.sendMessage(from, { text: `🔢 *Result:* ${num.toString(parseInt(toBase))}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Invalid input for that base conversion.' }, { quoted: msg });
    }
}

async function factorial(sock, from, msg, args) {
    const n = parseInt(args[0]);
    if (isNaN(n) || n < 0 || n > 170) return sock.sendMessage(from, { text: '⚠️ Usage: `.factorial <0-170>`' }, { quoted: msg });
    let result = 1n;
    for (let i = 2n; i <= BigInt(n); i++) result *= i;
    await sock.sendMessage(from, { text: `🔢 *${n}! =* ${result.toString()}` }, { quoted: msg });
}

async function isprime(sock, from, msg, args) {
    const n = parseInt(args[0]);
    if (isNaN(n) || n < 0) return sock.sendMessage(from, { text: '⚠️ Usage: `.isprime <number>`' }, { quoted: msg });
    if (n < 2) { await sock.sendMessage(from, { text: `❌ ${n} is not prime.` }, { quoted: msg }); return; }
    let prime = true;
    for (let i = 2; i * i <= n; i++) { if (n % i === 0) { prime = false; break; } }
    await sock.sendMessage(from, { text: prime ? `✅ ${n} is a prime number.` : `❌ ${n} is not a prime number.` }, { quoted: msg });
}

async function fibonacci(sock, from, msg, args) {
    const n = Math.min(parseInt(args[0]) || 10, 50);
    let seq = [0, 1];
    for (let i = 2; i < n; i++) seq.push(seq[i - 1] + seq[i - 2]);
    await sock.sendMessage(from, { text: `🔢 *Fibonacci (${n}):*\n${seq.slice(0, n).join(', ')}` }, { quoted: msg });
}

async function uuid(sock, from, msg) {
    await sock.sendMessage(from, { text: `🆔 *UUID:*\n${crypto.randomUUID()}` }, { quoted: msg });
}

async function timestamp(sock, from, msg, args) {
    const input = args[0];
    if (!input) {
        const now = Date.now();
        return sock.sendMessage(from, { text: `⏱️ *Current Unix Timestamp:* ${Math.floor(now / 1000)}\n*ISO:* ${new Date(now).toISOString()}` }, { quoted: msg });
    }
    if (/^\d+$/.test(input)) {
        const ms = input.length === 10 ? parseInt(input) * 1000 : parseInt(input);
        const d = new Date(ms);
        if (isNaN(d.getTime())) return sock.sendMessage(from, { text: '❌ Invalid timestamp.' }, { quoted: msg });
        return sock.sendMessage(from, { text: `📅 *Date:* ${d.toISOString()}` }, { quoted: msg });
    }
    const d = new Date(input);
    if (isNaN(d.getTime())) return sock.sendMessage(from, { text: '❌ Invalid date. Use YYYY-MM-DD or a unix timestamp.' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⏱️ *Unix Timestamp:* ${Math.floor(d.getTime() / 1000)}` }, { quoted: msg });
}

async function jsonformat(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.jsonformat <json text>`' }, { quoted: msg });
    try {
        const parsed = JSON.parse(q);
        const pretty = JSON.stringify(parsed, null, 2);
        await sock.sendMessage(from, { text: `\`\`\`${pretty.slice(0, 3500)}\`\`\`` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Invalid JSON: ${e.message}` }, { quoted: msg });
    }
}

async function jsonvalidate(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.jsonvalidate <json text>`' }, { quoted: msg });
    try {
        JSON.parse(q);
        await sock.sendMessage(from, { text: '✅ Valid JSON.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Invalid JSON: ${e.message}` }, { quoted: msg });
    }
}

async function regextest(sock, from, msg, args, q) {
    const parts = q.split('|').map(s => s.trim());
    if (parts.length < 2) return sock.sendMessage(from, { text: '⚠️ Usage: `.regextest <pattern> | <test string>`\nExample: `.regextest ^\\d+$ | 12345`' }, { quoted: msg });
    try {
        const re = new RegExp(parts[0]);
        const match = re.test(parts[1]);
        await sock.sendMessage(from, { text: match ? `✅ Match! "${parts[1]}" matches /${parts[0]}/` : `❌ No match for "${parts[1]}" against /${parts[0]}/` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: `❌ Invalid regex: ${e.message}` }, { quoted: msg });
    }
}

async function crontab(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.crontab <cron expression>`\nExample: `.crontab 0 9 * * 1-5`' }, { quoted: msg });
    const parts = q.trim().split(/\s+/);
    if (parts.length !== 5) return sock.sendMessage(from, { text: '❌ A cron expression needs 5 fields: minute hour day month weekday' }, { quoted: msg });
    const [min, hour, day, month, weekday] = parts;
    const describe = (val, unit, names) => {
        if (val === '*') return `every ${unit}`;
        if (names) return val.split(',').map(v => names[parseInt(v)] || v).join(', ');
        return val;
    };
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const text = `At minute ${describe(min, 'minute')}, hour ${describe(hour, 'hour')}, day-of-month ${describe(day, 'day')}, month ${describe(month, 'month')}, weekday: ${describe(weekday, 'weekday', days)}`;
    await sock.sendMessage(from, { text: `⏰ *Cron Explanation:*\n${text}` }, { quoted: msg });
}

async function wordfreq(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.wordfreq <text>`' }, { quoted: msg });
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    await sock.sendMessage(from, { text: `📊 *Top Words:*\n${top.map(([w, c]) => `${w}: ${c}`).join('\n')}` }, { quoted: msg });
}

// ---- reliable free-API commands (established, no key needed) ----

async function advice(sock, from, msg) {
    try {
        const { data } = await axios.get('https://api.adviceslip.com/advice', AXIOS_OPTS);
        await sock.sendMessage(from, { text: `💡 *Advice:*\n${data.slip.advice}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Advice service unreachable right now.' }, { quoted: msg });
    }
}

async function trivia(sock, from, msg) {
    try {
        const { data } = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', AXIOS_OPTS);
        const q = data.results[0];
        const decode = s => s.replace(/&#?\w+;/g, m => ({ '&quot;': '"', '&#039;': "'", '&amp;': '&' }[m] || m));
        const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
        await sock.sendMessage(from, {
            text: `🧠 *Trivia* (${decode(q.category)})\n\n${decode(q.question)}\n\n${options.map((o, i) => `${i + 1}. ${decode(o)}`).join('\n')}\n\n||Answer: ${decode(q.correct_answer)}||`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Trivia service unreachable right now.' }, { quoted: msg });
    }
}

async function worldtime(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.worldtime <Area/City>`\nExample: `.worldtime Asia/Karachi`' }, { quoted: msg });
    try {
        const { data } = await axios.get(`https://worldtimeapi.org/api/timezone/${encodeURIComponent(q.trim())}`, AXIOS_OPTS);
        const d = new Date(data.datetime);
        await sock.sendMessage(from, { text: `🌍 *${q}*\n🕐 ${d.toUTCString()}\n📍 UTC Offset: ${data.utc_offset}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Unknown timezone. Format: Area/City, e.g. Asia/Karachi, Europe/London' }, { quoted: msg });
    }
}

async function ipinfo(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.ipinfo <ip address>`' }, { quoted: msg });
    try {
        const { data } = await axios.get(`http://ip-api.com/json/${encodeURIComponent(q.trim())}`, AXIOS_OPTS);
        if (data.status !== 'success') return sock.sendMessage(from, { text: '❌ Could not resolve that IP.' }, { quoted: msg });
        await sock.sendMessage(from, {
            text: `🌐 *IP Info: ${q}*\n\n▪️ Country: ${data.country}\n▪️ Region: ${data.regionName}\n▪️ City: ${data.city}\n▪️ ISP: ${data.isp}\n▪️ Timezone: ${data.timezone}`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ IP lookup service unreachable right now.' }, { quoted: msg });
    }
}

async function chucknorris(sock, from, msg) {
    try {
        const { data } = await axios.get('https://api.chucknorris.io/jokes/random', AXIOS_OPTS);
        await sock.sendMessage(from, { text: `😎 ${data.value}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Joke service unreachable right now.' }, { quoted: msg });
    }
}

// ---- static-list fun commands (always reliable, no network) ----

const RIDDLES = [
    { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
    { q: "I speak without a mouth and hear without ears. What am I?", a: "An echo" },
    { q: "What has to be broken before you can use it?", a: "An egg" },
    { q: "I'm tall when I'm young and short when I'm old. What am I?", a: "A candle" },
    { q: "What has hands but can't clap?", a: "A clock" }
];
async function riddle(sock, from, msg) {
    const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
    await sock.sendMessage(from, { text: `🧩 *Riddle:*\n${r.q}\n\n||Answer: ${r.a}||` }, { quoted: msg });
}

const COMPLIMENTS = [
    "You bring out the best in people around you.",
    "Your positive energy is contagious.",
    "You have a great sense of humor.",
    "You're more resourceful than you realize.",
    "Your hard work speaks for itself."
];
async function compliment(sock, from, msg) {
    await sock.sendMessage(from, { text: `✨ ${COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)]}` }, { quoted: msg });
}

const WYR = [
    "Would you rather have the ability to fly or be invisible?",
    "Would you rather always be 10 minutes late or 20 minutes early?",
    "Would you rather give up your phone for a month or coffee for a year?",
    "Would you rather live without music or without TV/movies?"
];
async function wyr(sock, from, msg) {
    await sock.sendMessage(from, { text: `🤔 *Would You Rather:*\n${WYR[Math.floor(Math.random() * WYR.length)]}` }, { quoted: msg });
}

// ---- scheduled announcement (admin/owner only, bounded like .remind) ----
async function schedule(sock, from, msg, args, isGroup, isAdmin, isOwner) {
    if (isGroup && !isAdmin) return sock.sendMessage(from, { text: '❌ Admins only.' }, { quoted: msg });
    if (!isGroup && !isOwner) return sock.sendMessage(from, { text: '❌ Owner only in DM.' }, { quoted: msg });
    const minutes = parseFloat(args[0]);
    const text = args.slice(1).join(' ');
    if (!minutes || minutes <= 0 || !text) return sock.sendMessage(from, { text: '⚠️ Usage: `.schedule <minutes> <message>`\nExample: `.schedule 30 Meeting starts soon!`' }, { quoted: msg });
    if (minutes > 1440) return sock.sendMessage(from, { text: '⚠️ Max schedule time is 1440 minutes (24 hours).' }, { quoted: msg });
    await sock.sendMessage(from, { text: `📅 Scheduled — this message will post here in *${minutes} min*.` }, { quoted: msg });
    setTimeout(async () => {
        try { await sock.sendMessage(from, { text: `📢 *Scheduled Announcement*\n\n${text}` }); } catch (e) {}
    }, minutes * 60 * 1000);
}

module.exports = {
    unitconvert, passwordstrength, emailvalidate, phonevalidate, hex2rgb, rgb2hex, base,
    factorial, isprime, fibonacci, uuid, timestamp, jsonformat, jsonvalidate, regextest, crontab, wordfreq,
    advice, trivia, worldtime, ipinfo, chucknorris,
    riddle, compliment, wyr, schedule
};
