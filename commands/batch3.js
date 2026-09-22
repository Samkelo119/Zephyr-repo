// commands/batch3.js
// 👑 AWAIS CYBER — Batch 3: additional working commands.
// All pure local logic (no external API calls) so these never fail
// due to network/API issues — they always work instantly.

// ---- text encode / decode ----

async function rot13(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.rot13 <text>`' }, { quoted: msg });
    const out = q.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    });
    await sock.sendMessage(from, { text: `🔐 *ROT13:*\n${out}` }, { quoted: msg });
}

async function urlencode(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.urlencode <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔗 *Encoded:*\n${encodeURIComponent(q)}` }, { quoted: msg });
}

async function urldecode(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.urldecode <text>`' }, { quoted: msg });
    try {
        await sock.sendMessage(from, { text: `🔗 *Decoded:*\n${decodeURIComponent(q)}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Invalid encoded text.' }, { quoted: msg });
    }
}

async function htmlescape(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.htmlescape <text>`' }, { quoted: msg });
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    await sock.sendMessage(from, { text: `📄 *Escaped:*\n${q.replace(/[&<>"']/g, c => map[c])}` }, { quoted: msg });
}

async function htmlunescape(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.htmlunescape <text>`' }, { quoted: msg });
    const map = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
    await sock.sendMessage(from, { text: `📄 *Unescaped:*\n${q.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, m => map[m])}` }, { quoted: msg });
}

async function slugify(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.slugify <text>`' }, { quoted: msg });
    const slug = q.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    await sock.sendMessage(from, { text: `🔗 *Slug:*\n${slug}` }, { quoted: msg });
}

async function camelcase(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.camelcase <text>`' }, { quoted: msg });
    const words = q.trim().split(/\s+/);
    const out = words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
    await sock.sendMessage(from, { text: `🐫 *camelCase:*\n${out}` }, { quoted: msg });
}

async function snakecase(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.snakecase <text>`' }, { quoted: msg });
    const out = q.trim().split(/\s+/).join('_').toLowerCase();
    await sock.sendMessage(from, { text: `🐍 *snake_case:*\n${out}` }, { quoted: msg });
}

async function kebabcase(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.kebabcase <text>`' }, { quoted: msg });
    const out = q.trim().split(/\s+/).join('-').toLowerCase();
    await sock.sendMessage(from, { text: `🍢 *kebab-case:*\n${out}` }, { quoted: msg });
}

// ---- text stats ----

async function wordcount(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.wordcount <text>`' }, { quoted: msg });
    const words = q.trim().split(/\s+/).filter(Boolean).length;
    await sock.sendMessage(from, { text: `📊 *Words:* ${words}` }, { quoted: msg });
}

async function charcount(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.charcount <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `📊 *Characters:* ${q.length} (no spaces: ${q.replace(/\s/g, '').length})` }, { quoted: msg });
}

async function textstats(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.textstats <text>`' }, { quoted: msg });
    const words = q.trim().split(/\s+/).filter(Boolean).length;
    const sentences = (q.match(/[.!?]+/g) || []).length || 1;
    const vowels = (q.match(/[aeiouAEIOU]/g) || []).length;
    await sock.sendMessage(from, {
        text: `📊 *Text Stats*\n\n` +
              `▪️ Characters: ${q.length}\n` +
              `▪️ Words: ${words}\n` +
              `▪️ Sentences: ${sentences}\n` +
              `▪️ Vowels: ${vowels}`
    }, { quoted: msg });
}

async function vowelcount(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.vowelcount <text>`' }, { quoted: msg });
    const n = (q.match(/[aeiouAEIOU]/g) || []).length;
    await sock.sendMessage(from, { text: `🔤 *Vowels:* ${n}` }, { quoted: msg });
}

async function consonants(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.consonants <text>`' }, { quoted: msg });
    const n = (q.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
    await sock.sendMessage(from, { text: `🔤 *Consonants:* ${n}` }, { quoted: msg });
}

// ---- numbers ----

async function roman(sock, from, msg, args) {
    const num = parseInt(args[0]);
    if (!num || num <= 0 || num > 3999) return sock.sendMessage(from, { text: '⚠️ Usage: `.roman <1-3999>`' }, { quoted: msg });
    const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let n = num, out = '';
    for (let i = 0; i < vals.length; i++) { while (n >= vals[i]) { out += syms[i]; n -= vals[i]; } }
    await sock.sendMessage(from, { text: `🏛️ *Roman Numeral:* ${out}` }, { quoted: msg });
}

async function fromroman(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.fromroman <numeral>`' }, { quoted: msg });
    const map = { I:1, V:5, X:10, L:50, C:100, D:500, M:1000 };
    const s = q.toUpperCase().trim();
    if (!/^[IVXLCDM]+$/.test(s)) return sock.sendMessage(from, { text: '❌ Invalid roman numeral.' }, { quoted: msg });
    let total = 0;
    for (let i = 0; i < s.length; i++) {
        const cur = map[s[i]], next = map[s[i + 1]];
        total += (next && cur < next) ? -cur : cur;
    }
    await sock.sendMessage(from, { text: `🔢 *Number:* ${total}` }, { quoted: msg });
}

async function ascii(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.ascii <text or number>`' }, { quoted: msg });
    if (/^\d+$/.test(q.trim())) {
        await sock.sendMessage(from, { text: `🔡 *Character:* ${String.fromCharCode(parseInt(q.trim()))}` }, { quoted: msg });
    } else {
        const codes = q.split('').map(c => c.charCodeAt(0)).join(' ');
        await sock.sendMessage(from, { text: `🔢 *ASCII Codes:*\n${codes}` }, { quoted: msg });
    }
}

async function percentage(sock, from, msg, args) {
    const [pct, num] = args.map(parseFloat);
    if (isNaN(pct) || isNaN(num)) return sock.sendMessage(from, { text: '⚠️ Usage: `.percentage <percent> <number>`\nExample: `.percentage 20 500`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `📊 ${pct}% of ${num} = *${((pct / 100) * num).toFixed(2)}*` }, { quoted: msg });
}

async function discount(sock, from, msg, args) {
    const [price, pct] = args.map(parseFloat);
    if (isNaN(price) || isNaN(pct)) return sock.sendMessage(from, { text: '⚠️ Usage: `.discount <price> <percent_off>`\nExample: `.discount 1000 15`' }, { quoted: msg });
    const off = (price * pct) / 100;
    await sock.sendMessage(from, { text: `🏷️ *Original:* ${price}\n💸 *Discount:* ${off.toFixed(2)}\n✅ *Final Price:* ${(price - off).toFixed(2)}` }, { quoted: msg });
}

async function tip(sock, from, msg, args) {
    const [bill, pct] = args.map(parseFloat);
    if (isNaN(bill) || isNaN(pct)) return sock.sendMessage(from, { text: '⚠️ Usage: `.tip <bill_amount> <percent>`\nExample: `.tip 2000 10`' }, { quoted: msg });
    const t = (bill * pct) / 100;
    await sock.sendMessage(from, { text: `🍽️ *Bill:* ${bill}\n💰 *Tip (${pct}%):* ${t.toFixed(2)}\n✅ *Total:* ${(bill + t).toFixed(2)}` }, { quoted: msg });
}

async function splitbill(sock, from, msg, args) {
    const [amount, people] = args.map(parseFloat);
    if (!amount || !people) return sock.sendMessage(from, { text: '⚠️ Usage: `.splitbill <amount> <people>`\nExample: `.splitbill 4000 4`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🧾 *Total:* ${amount}\n👥 *People:* ${people}\n✅ *Per Person:* ${(amount / people).toFixed(2)}` }, { quoted: msg });
}

async function loaninterest(sock, from, msg, args) {
    const [principal, rate, years] = args.map(parseFloat);
    if (!principal || !rate || !years) return sock.sendMessage(from, { text: '⚠️ Usage: `.loaninterest <principal> <rate%> <years>`\nExample: `.loaninterest 100000 8 3`' }, { quoted: msg });
    const interest = (principal * rate * years) / 100;
    await sock.sendMessage(from, { text: `🏦 *Principal:* ${principal}\n📈 *Interest:* ${interest.toFixed(2)}\n✅ *Total Payable:* ${(principal + interest).toFixed(2)}` }, { quoted: msg });
}

async function leapyear(sock, from, msg, args) {
    const y = parseInt(args[0]);
    if (!y) return sock.sendMessage(from, { text: '⚠️ Usage: `.leapyear <year>`' }, { quoted: msg });
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    await sock.sendMessage(from, { text: isLeap ? `✅ ${y} is a leap year.` : `❌ ${y} is not a leap year.` }, { quoted: msg });
}

async function daysleft(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.daysleft YYYY-MM-DD`' }, { quoted: msg });
    const target = new Date(q);
    if (isNaN(target.getTime())) return sock.sendMessage(from, { text: '❌ Invalid date format. Use YYYY-MM-DD.' }, { quoted: msg });
    const diff = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
    await sock.sendMessage(from, { text: diff >= 0 ? `📅 *${diff} days* remaining.` : `📅 That date was *${Math.abs(diff)} days* ago.` }, { quoted: msg });
}

async function zodiac(sock, from, msg, q) {
    if (!q || !/^\d{1,2}-\d{1,2}$/.test(q.trim())) return sock.sendMessage(from, { text: '⚠️ Usage: `.zodiac MM-DD`\nExample: `.zodiac 05-21`' }, { quoted: msg });
    const [mm, dd] = q.trim().split('-').map(Number);
    const signs = [
        [[1,20],[2,18],'Aquarius ♒'], [[2,19],[3,20],'Pisces ♓'], [[3,21],[4,19],'Aries ♈'],
        [[4,20],[5,20],'Taurus ♉'], [[5,21],[6,20],'Gemini ♊'], [[6,21],[7,22],'Cancer ♋'],
        [[7,23],[8,22],'Leo ♌'], [[8,23],[9,22],'Virgo ♍'], [[9,23],[10,22],'Libra ♎'],
        [[10,23],[11,21],'Scorpio ♏'], [[11,22],[12,21],'Sagittarius ♐'], [[12,22],[1,19],'Capricorn ♑']
    ];
    let result = 'Capricorn ♑';
    for (const [start, end, name] of signs) {
        if ((mm === start[0] && dd >= start[1]) || (mm === end[0] && dd <= end[1])) { result = name; break; }
    }
    await sock.sendMessage(from, { text: `♈ *Zodiac Sign:* ${result}` }, { quoted: msg });
}

// ---- fun text effects ----

async function spongebob(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.spongebob <text>`' }, { quoted: msg });
    const out = q.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
    await sock.sendMessage(from, { text: out }, { quoted: msg });
}

async function zalgo(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.zalgo <text>`' }, { quoted: msg });
    const marks = ['\u030d','\u0316','\u0301','\u0300','\u0308','\u0307','\u0302','\u0303'];
    const out = q.split('').map(c => c + marks[Math.floor(Math.random() * marks.length)] + (Math.random() > 0.5 ? marks[Math.floor(Math.random() * marks.length)] : '')).join('');
    await sock.sendMessage(from, { text: out }, { quoted: msg });
}

async function fullwidth(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.fullwidth <text>`' }, { quoted: msg });
    const out = q.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0)).replace(/ /g, '\u3000');
    await sock.sendMessage(from, { text: out }, { quoted: msg });
}

async function smallcaps(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.smallcaps <text>`' }, { quoted: msg });
    const map = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
    const out = q.toLowerCase().split('').map(c => map[c] || c).join('');
    await sock.sendMessage(from, { text: out }, { quoted: msg });
}

async function strikethrough(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.strikethrough <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `~${q}~` }, { quoted: msg });
}

async function mirror(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.mirror <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: q.split('').reverse().join('') }, { quoted: msg });
}

async function shuffle(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.shuffle <text>`' }, { quoted: msg });
    const arr = q.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    await sock.sendMessage(from, { text: arr.join('') }, { quoted: msg });
}

async function duplicate(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.duplicate <text>`\nRemoves repeated words.' }, { quoted: msg });
    const out = [...new Set(q.split(/\s+/))].join(' ');
    await sock.sendMessage(from, { text: `✅ *Cleaned:*\n${out}` }, { quoted: msg });
}

// ---- personal utility (stored per-user in botData) ----

async function todo(sock, from, msg, args, q, sender, botData, saveBotData) {
    if (!botData.todos) botData.todos = {};
    if (!botData.todos[sender]) botData.todos[sender] = [];
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'add') {
        const item = args.slice(1).join(' ');
        if (!item) return sock.sendMessage(from, { text: '⚠️ Usage: `.todo add <task>`' }, { quoted: msg });
        botData.todos[sender].push({ text: item, done: false });
        saveBotData();
        return sock.sendMessage(from, { text: `✅ Task added: ${item}` }, { quoted: msg });
    }
    if (sub === 'done') {
        const idx = parseInt(args[1]) - 1;
        const list = botData.todos[sender];
        if (isNaN(idx) || !list[idx]) return sock.sendMessage(from, { text: '⚠️ Usage: `.todo done <number>`' }, { quoted: msg });
        list[idx].done = true;
        saveBotData();
        return sock.sendMessage(from, { text: `✅ Marked done: ${list[idx].text}` }, { quoted: msg });
    }
    if (sub === 'clear') {
        botData.todos[sender] = [];
        saveBotData();
        return sock.sendMessage(from, { text: '🗑️ Todo list cleared.' }, { quoted: msg });
    }
    // list (default)
    const list = botData.todos[sender];
    if (!list.length) return sock.sendMessage(from, { text: '📋 Your todo list is empty.\nUse `.todo add <task>`' }, { quoted: msg });
    const text = list.map((t, i) => `${t.done ? '✅' : '⬜'} ${i + 1}. ${t.text}`).join('\n');
    await sock.sendMessage(from, { text: `📋 *Your Todo List:*\n\n${text}\n\n_.todo add | .todo done <n> | .todo clear_` }, { quoted: msg });
}

async function note(sock, from, msg, args, q, sender, botData, saveBotData) {
    if (!botData.notes) botData.notes = {};
    if (!botData.notes[sender]) botData.notes[sender] = [];
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'save') {
        const text = args.slice(1).join(' ');
        if (!text) return sock.sendMessage(from, { text: '⚠️ Usage: `.note save <text>`' }, { quoted: msg });
        botData.notes[sender].push(text);
        saveBotData();
        return sock.sendMessage(from, { text: `📝 Note saved (#${botData.notes[sender].length})` }, { quoted: msg });
    }
    if (sub === 'clear') {
        botData.notes[sender] = [];
        saveBotData();
        return sock.sendMessage(from, { text: '🗑️ Notes cleared.' }, { quoted: msg });
    }
    const list = botData.notes[sender];
    if (!list.length) return sock.sendMessage(from, { text: '📝 No saved notes.\nUse `.note save <text>`' }, { quoted: msg });
    const text = list.map((n, i) => `${i + 1}. ${n}`).join('\n');
    await sock.sendMessage(from, { text: `📝 *Your Notes:*\n\n${text}\n\n_.note save | .note clear_` }, { quoted: msg });
}

async function remind(sock, from, msg, args, q) {
    const minutes = parseFloat(args[0]);
    const reminderText = args.slice(1).join(' ');
    if (!minutes || minutes <= 0 || !reminderText) return sock.sendMessage(from, { text: '⚠️ Usage: `.remind <minutes> <text>`\nExample: `.remind 10 Meeting time`' }, { quoted: msg });
    if (minutes > 1440) return sock.sendMessage(from, { text: '⚠️ Max reminder time is 1440 minutes (24 hours).' }, { quoted: msg });
    await sock.sendMessage(from, { text: `⏰ Reminder set for *${minutes} min* from now:\n"${reminderText}"` }, { quoted: msg });
    setTimeout(async () => {
        try { await sock.sendMessage(from, { text: `⏰ *Reminder!*\n${reminderText}` }, { quoted: msg }); } catch (e) {}
    }, minutes * 60 * 1000);
}

async function gencode(sock, from, msg, args) {
    const len = Math.min(Math.max(parseInt(args[0]) || 6, 4), 10);
    const code = Math.floor(Math.random() * Math.pow(10, len)).toString().padStart(len, '0');
    await sock.sendMessage(from, { text: `🔢 *Generated Code:* ${code}` }, { quoted: msg });
}

module.exports = {
    rot13, urlencode, urldecode, htmlescape, htmlunescape, slugify, camelcase, snakecase, kebabcase,
    wordcount, charcount, textstats, vowelcount, consonants,
    roman, fromroman, ascii, percentage, discount, tip, splitbill, loaninterest, leapyear, daysleft, zodiac,
    spongebob, zalgo, fullwidth, smallcaps, strikethrough, mirror, shuffle, duplicate,
    todo, note, remind, gencode
};
