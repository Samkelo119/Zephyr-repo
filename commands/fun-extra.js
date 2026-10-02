// commands/fun-extra.js
// 👑 AWAIS CYBER — Fun & text-utility commands. All pure local logic (no
// external API calls) so they always work, DM or group, with or without
// WhatsApp admin rights.

const settings = require('../settings');

const quotes = [
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Believe you can and you're halfway there.",
    "Hard times don't create heroes. It is during the hard times that heroes reveal themselves.",
    "The only way to do great work is to love what you do.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Sometimes later becomes never. Do it now.",
    "Little things make big days."
];

const jokes = [
    "I told my computer I needed a break, and now it won't stop sending me KitKat ads. 😂",
    "Why don't scientists trust atoms? Because they make up everything. 🤣",
    "I would tell you a UDP joke, but you might not get it. 📶😂",
    "Why did the developer go broke? Because he used up all his cache. 😅",
    "I'm reading a book about anti-gravity. It's impossible to put down. 😂"
];

const facts = [
    "Honey never spoils — archaeologists have found 3000-year-old honey in Egyptian tombs that's still edible.",
    "Octopuses have three hearts and blue blood.",
    "Bananas are berries, but strawberries aren't.",
    "A day on Venus is longer than a year on Venus.",
    "The Great Wall of China is not visible from space with the naked eye — that's a myth."
];

const eightBallReplies = [
    "✅ Yes, absolutely.", "✅ Yes, definitely.", "🤔 Maybe.", "❌ I don't think so.",
    "❌ Not a chance.", "🔮 Not clear yet, ask again.", "✅ One hundred percent yes.",
    "❌ I have my doubts.", "🤔 I can't say right now.", "✅ All signs point to yes."
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function quote(sock, from, msg) {
    await sock.sendMessage(from, { text: `💬 *Quote:*\n\n"${rand(quotes)}"` }, { quoted: msg });
}

async function joke(sock, from, msg) {
    await sock.sendMessage(from, { text: `😂 *Joke:*\n\n${rand(jokes)}` }, { quoted: msg });
}

async function fact(sock, from, msg) {
    await sock.sendMessage(from, { text: `🧠 *Random Fact:*\n\n${rand(facts)}` }, { quoted: msg });
}

async function eightball(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.8ball <sawal>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🎱 *Question:* ${q}\n🔮 *Answer:* ${rand(eightBallReplies)}` }, { quoted: msg });
}

async function flip(sock, from, msg) {
    await sock.sendMessage(from, { text: `🪙 *Coin Flip:* ${Math.random() < 0.5 ? 'Heads 🙂' : 'Tails 🙃'}` }, { quoted: msg });
}

async function dice(sock, from, msg) {
    await sock.sendMessage(from, { text: `🎲 *Dice Roll:* ${Math.floor(Math.random() * 6) + 1}` }, { quoted: msg });
}

async function rps(sock, from, msg, q) {
    const choices = ['rock', 'paper', 'scissors'];
    const userChoice = (q || '').toLowerCase().trim();
    if (!choices.includes(userChoice)) return sock.sendMessage(from, { text: '⚠️ Usage: `.rps rock` / `.rps paper` / `.rps scissors`' }, { quoted: msg });
    const botChoice = rand(choices);
    let result;
    if (userChoice === botChoice) result = "🤝 Draw!";
    else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
    ) result = "🎉 You win!";
    else result = "🤖 Bot wins!";
    await sock.sendMessage(from, { text: `✊✋✌️ *RPS*\n\n👤 You: ${userChoice}\n🤖 Bot: ${botChoice}\n\n${result}` }, { quoted: msg });
}

async function love(sock, from, msg, q) {
    if (!q || !q.includes(' ')) return sock.sendMessage(from, { text: '⚠️ Usage: `.love Name1 Name2`' }, { quoted: msg });
    const names = q.split(' ');
    const n1 = names[0], n2 = names.slice(1).join(' ');
    let seed = 0;
    for (const c of (n1 + n2)) seed += c.charCodeAt(0);
    const percent = seed % 101;
    await sock.sendMessage(from, { text: `💘 *Love Calculator*\n\n${n1} ❤️ ${n2}\n\n📊 Match: ${percent}%` }, { quoted: msg });
}

async function ship(sock, from, msg) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length < 2) return sock.sendMessage(from, { text: '⚠️ Usage: mention two people — `.ship @user1 @user2`' }, { quoted: msg });
    const [a, b] = mentioned;
    let seed = 0;
    for (const c of (a + b)) seed += c.charCodeAt(0);
    const percent = seed % 101;
    await sock.sendMessage(from, { text: `💞 *Ship Calculator*\n\n@${a.split('@')[0]} + @${b.split('@')[0]}\n\n📊 Compatibility: ${percent}%`, mentions: [a, b] }, { quoted: msg });
}

async function reverse(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.reverse <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: `🔄 ${q.split('').reverse().join('')}` }, { quoted: msg });
}

async function count(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.count <text>`' }, { quoted: msg });
    const words = q.trim().split(/\s+/).length;
    const chars = q.length;
    await sock.sendMessage(from, { text: `🔢 *Count*\n\n📝 Characters: ${chars}\n💬 Words: ${words}` }, { quoted: msg });
}

async function binary(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.binary <text>`' }, { quoted: msg });
    const bin = q.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    await sock.sendMessage(from, { text: `💻 *Binary:*\n\n${bin}` }, { quoted: msg });
}

async function base64(sock, from, msg, q, args) {
    if (!args[0] || !q) return sock.sendMessage(from, { text: '⚠️ Usage: `.base64 encode <text>` / `.base64 decode <text>`' }, { quoted: msg });
    const mode = args[0].toLowerCase();
    const data = q.slice(args[0].length).trim();
    try {
        if (mode === 'encode') {
            await sock.sendMessage(from, { text: `🔐 *Encoded:*\n\n${Buffer.from(data).toString('base64')}` }, { quoted: msg });
        } else if (mode === 'decode') {
            await sock.sendMessage(from, { text: `🔓 *Decoded:*\n\n${Buffer.from(data, 'base64').toString('utf-8')}` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: '⚠️ Usage: `.base64 encode <text>` / `.base64 decode <text>`' }, { quoted: msg });
        }
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Invalid input.' }, { quoted: msg });
    }
}

async function repeat(sock, from, msg, args, q) {
    const n = parseInt(args[0]);
    const text = q.slice(String(args[0] || '').length).trim();
    if (!n || n < 1 || n > 20 || !text) return sock.sendMessage(from, { text: '⚠️ Usage: `.repeat <count 1-20> <text>`' }, { quoted: msg });
    await sock.sendMessage(from, { text: Array(n).fill(text).join('\n') }, { quoted: msg });
}

async function calc(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.calc 12*5+3`' }, { quoted: msg });
    if (!/^[0-9+\-*/().\s%]+$/.test(q)) return sock.sendMessage(from, { text: '❌ Only numbers and + - * / ( ) % are allowed.' }, { quoted: msg });
    try {
        const result = Function(`"use strict"; return (${q})`)();
        await sock.sendMessage(from, { text: `🧮 *Calculator*\n\n${q} = *${result}*` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Invalid expression.' }, { quoted: msg });
    }
}

async function clock(sock, from, msg) {
    const now = new Date();
    const date = now.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'full' });
    const time = now.toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', timeStyle: 'medium' });
    await sock.sendMessage(from, {
        text:
            `🕐 *South African Time*\n\n` +
            `📅 *Date:* ${date}\n` +
            `🕰️ *Time:* ${time}\n` +
            `🌍 *Timezone:* Africa/Johannesburg (SAST)\n\n` +
            `${settings.footer}`
    }, { quoted: msg });
}


module.exports = {
    quote, joke, fact, eightball, flip, dice, rps, love, ship,
    reverse, count, binary, base64, repeat, calc, clock
};
