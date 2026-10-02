'use strict';

// commands/extra.js
// Large pack of additional commands ported/adapted from the uploaded
// command set and wired into this bot's existing framework. Exposed as a
// name -> function map so index.js can dispatch them without a huge switch.

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const commandConfig = require('../lib/commandConfig');

const A = { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } };
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (jid) => String(jid || '').split('@')[0].split(':')[0];
const FOOTER = '\n\n> ⚡ZᴇPʜʏʀ~Mᴅ⚡';

async function send(sock, from, msg, text) {
    await sock.sendMessage(from, { text: text + FOOTER }, { quoted: msg });
}

function requireOwner(isOwner, sock, from, msg) {
    if (!isOwner) {
        sock.sendMessage(from, { text: '❌ Only the owner can use this command.' }, { quoted: msg });
        return false;
    }
    return true;
}

// ─── generic content guard toggles ───────────────────────────────────────────
const GUARD_TYPES = {
    antiaudio: 'audio', anticatalog: 'catalog', anticontact: 'contact',
    antidocument: 'document', antievent: 'event', antilocation: 'location',
    antipoll: 'poll', antireact: 'react', antireply: 'reply',
    antiforwad: 'forward', antigroupmention: 'groupmention',
    antigroupstatus: 'groupstatus', antistatusmenation: 'statusmention',
    antimenation: 'menation', antiemoji: 'emoji'
};

function makeGuard(type) {
    return async (sock, from, msg, ctx) => {
        const { args, isGroup, isAdmin, botData, saveBotData } = ctx;
        if (!isGroup) return send(sock, from, msg, '❌ This command only works inside groups.');
        if (!isAdmin) return send(sock, from, msg, '❌ Only an admin or the owner can configure this.');
        if (!botData.contentGuard) botData.contentGuard = {};
        if (!botData.contentGuard[from]) botData.contentGuard[from] = {};
        const action = (args[0] || '').toLowerCase();
        if (action === 'on' || action === 'off') {
            botData.contentGuard[from][type] = action === 'on';
            saveBotData();
            return send(sock, from, msg, `${action === 'on' ? '✅ Enabled' : '⛔ Disabled'} *${type}* protection for this group.`);
        }
        const state = botData.contentGuard[from][type] ? 'ON' : 'OFF';
        return send(sock, from, msg, `🛡️ *${type.toUpperCase()} GUARD*\n\nStatus: *${state}*\n\nUsage:\n.${type}guard on\n.${type}guard off`);
    };
}
const guards = {};
for (const [cmd, type] of Object.entries(GUARD_TYPES)) guards[cmd] = makeGuard(type);

// ─── utility ─────────────────────────────────────────────────────────────────
async function myip(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    try {
        const { data } = await axios.get('https://api.ipify.org?format=json', A);
        await send(sock, from, msg, `🌐 Server IP: ${data.ip}`);
    } catch (e) { await send(sock, from, msg, '❌ Could not fetch the server IP right now.'); }
}

async function info(sock, from, msg, ctx) {
    const count = commandConfig.ALL_COMMANDS.length;
    const up = process.uptime();
    const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60);
    await send(sock, from, msg, `🤖 *𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 INFO*\n\nCommands available: *${count}*\nUptime: *${h}h ${m}m*\nMode: *${ctx.session?.isPublic ? 'PUBLIC' : 'PRIVATE'}*\nAnti-ban: active`);
}

async function system(sock, from, msg) {
    const ram = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const free = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    await send(sock, from, msg, `💻 *SYSTEM STATUS*\n\nPlatform: ${os.platform()}\nCPU: ${os.cpus()[0].model}\nRAM: ${free}GB / ${ram}GB\nNode: ${process.version}`);
}

const TRAITS = ['a chaotic-good main character', "the group's unofficial DJ", 'always 10 minutes late but worth the wait', 'the reason the group chat never sleeps', 'quietly the funniest one here', 'built different (in a good way)'];
async function whoami(sock, from, msg) {
    await send(sock, from, msg, `🪪 You are: ${rand(TRAITS)}`);
}

async function inspect(sock, from, msg, ctx) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return send(sock, from, msg, '❌ Reply to a media file to inspect its metadata.');
    const type = Object.keys(quoted)[0];
    const data = quoted[type] || {};
    const size = data.fileLength ? `${(parseInt(data.fileLength) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown';
    const sha = data.fileSha256 ? Buffer.from(data.fileSha256).toString('hex') : 'N/A';
    await send(sock, from, msg, `📊 *FILE METADATA*\n\nType: ${String(type).replace('Message', '')}\nName: ${data.fileName || 'Unnamed'}\nMIME: ${data.mimetype || 'Unknown'}\nSize: ${size}\nSHA256: \`${sha}\``);
}

async function wiki(sock, from, msg, ctx) {
    const q = ctx.q;
    if (!q) return send(sock, from, msg, '⚠️ Usage: .wiki <topic>');
    try {
        const { data } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, A);
        if (!data.extract) throw new Error('not found');
        await send(sock, from, msg, `📚 *${data.title}*\n\n${data.extract}\n\n${data.content_urls?.desktop?.page || ''}`);
    } catch (e) { await send(sock, from, msg, `❌ No Wikipedia article found for "${q}".`); }
}

async function del(sock, from, msg, ctx) {
    if (!ctx.isAdmin) return send(sock, from, msg, '❌ Only an admin or the owner can use this.');
    const quoted = msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted) return send(sock, from, msg, '❌ Reply to a message to delete it.');
    try {
        await sock.sendMessage(from, { delete: { remoteJid: from, fromMe: false, id: quoted.stanzaId, participant: quoted.participant } });
    } catch (e) { await send(sock, from, msg, '❌ Could not delete that message.'); }
}

async function statussaver(sock, from, msg, ctx) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return send(sock, from, msg, '❌ Reply to an image/video to save it.');
    const wrapped = quoted.imageMessage || quoted.videoMessage;
    if (!wrapped) return send(sock, from, msg, '❌ Reply to an image or video.');
    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const kind = quoted.imageMessage ? 'image' : 'video';
        const buf = await downloadContentFromMessage(wrapped, kind);
        const chunks = []; for await (const c of buf) chunks.push(c);
        const buffer = Buffer.concat(chunks);
        if (kind === 'image') await sock.sendMessage(from, { image: buffer, caption: '📥 Saved' }, { quoted: msg });
        else await sock.sendMessage(from, { video: buffer, caption: '📥 Saved' }, { quoted: msg });
    } catch (e) { await send(sock, from, msg, '❌ Could not save that media.'); }
}

async function unblock(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    const target = ctx.args[0]?.replace(/[^0-9]/g, '');
    if (!target) return send(sock, from, msg, '⚠️ Usage: .unblock <number>');
    try { await sock.updateBlockStatus(`${target}@s.whatsapp.net`, 'unblock'); await send(sock, from, msg, `✅ Unblocked +${target}.`); }
    catch (e) { await send(sock, from, msg, '❌ Could not unblock that number.'); }
}

async function setprefix(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    const cfg = ctx && ctx.commandConfig ? ctx.commandConfig : commandConfig;
    const p = ctx.args[0];
    if (!p || p.length > 3) return send(sock, from, msg, `⚠️ Usage: .setprefix <symbol>\nCurrent: ${cfg.getPrefix()}`);
    try { cfg.setPrefix(p); await send(sock, from, msg, `✅ Prefix changed to *${p}* for this bot only.\nExample: ${p}alive`); }
    catch (e) { await send(sock, from, msg, '❌ ' + e.message); }
}

async function newsletter(sock, from, msg, ctx) {
    const link = ctx.q || ctx.args.join(' ');
    if (!link) return send(sock, from, msg, '⚠️ Usage: .newsletter <channel link>');
    const code = (link.match(/channel\/([A-Za-z0-9]+)/) || [])[1];
    if (!code) return send(sock, from, msg, '❌ Invalid channel link.');
    try {
        const meta = await sock.newsletterMetadata('invite', code);
        await send(sock, from, msg, `📢 *${meta?.name || 'Channel'}*\n\nID: ${meta?.id || code}\nSubscribers: ${meta?.subscriberCount ?? 'N/A'}\nDescription: ${(meta?.description || 'N/A').slice(0, 300)}`);
    } catch (e) { await send(sock, from, msg, '❌ Could not fetch channel info.'); }
}

async function autojoin(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    const link = ctx.q;
    const code = link ? (link.match(/(?:chat\.whatsapp\.com\/|invite\/)([A-Za-z0-9]+)/) || [])[1] : global.WA_GROUP_INVITE_CODE;
    if (!code) return send(sock, from, msg, '⚠️ Usage: .autojoin <group invite link>');
    try { await sock.groupAcceptInvite(code); await send(sock, from, msg, '✅ Joined the group.'); }
    catch (e) { await send(sock, from, msg, '❌ Could not join (invalid or expired link).'); }
}

async function pending(sock, from, msg, ctx) {
    if (!ctx.isGroup) return send(sock, from, msg, '❌ Group only.');
    if (!ctx.isAdmin) return send(sock, from, msg, '❌ Admin only.');
    try {
        const list = await sock.groupRequestParticipantsList(from);
        if (!list?.length) return send(sock, from, msg, '✅ No pending join requests.');
        const text = list.map((p, i) => `${i + 1}. @${num(p.jid || p.pn)}`).join('\n');
        await sock.sendMessage(from, { text: `📋 *PENDING REQUESTS* (${list.length})\n\n${text}` + FOOTER, mentions: list.map(p => p.jid || p.pn) }, { quoted: msg });
    } catch (e) { await send(sock, from, msg, '❌ Could not fetch join requests.'); }
}

async function kickall(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    if (!ctx.isGroup) return send(sock, from, msg, '❌ Group only.');
    try {
        const meta = await sock.groupMetadata(from);
        const targets = meta.participants.filter(p => p.admin === null || p.admin === undefined).map(p => p.id);
        for (const t of targets) { try { await sock.groupParticipantsUpdate(from, [t], 'remove'); } catch (e) {} await new Promise(r => setTimeout(r, 700)); }
        await send(sock, from, msg, `✅ Removed ${targets.length} member(s).`);
    } catch (e) { await send(sock, from, msg, '❌ Could not kick members.'); }
}

async function kickadmins(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    if (!ctx.isGroup) return send(sock, from, msg, '❌ Group only.');
    try {
        const meta = await sock.groupMetadata(from);
        const targets = meta.participants.filter(p => p.admin === 'admin').map(p => p.id);
        for (const t of targets) { try { await sock.groupParticipantsUpdate(from, [t], 'remove'); } catch (e) {} await new Promise(r => setTimeout(r, 700)); }
        await send(sock, from, msg, `✅ Removed ${targets.length} admin(s).`);
    } catch (e) { await send(sock, from, msg, '❌ Could not kick admins.'); }
}

async function gcstatus(sock, from, msg, ctx) {
    if (!ctx.isGroup) return send(sock, from, msg, '❌ Group only.');
    try {
        const meta = await sock.groupMetadata(from);
        await send(sock, from, msg, `⚙️ *GROUP STATUS*\n\nName: ${meta.subject}\nMembers: ${meta.participants.length}\nAnnounce: ${meta.announce ? 'ON' : 'OFF'}\nLocked: ${meta.restrict ? 'ON' : 'OFF'}`);
    } catch (e) { await send(sock, from, msg, '❌ Could not fetch group status.'); }
}

async function gpsafe(sock, from, msg, ctx) {
    if (!ctx.isGroup) return send(sock, from, msg, '❌ Group only.');
    if (!ctx.isAdmin) return send(sock, from, msg, '❌ Admin only.');
    const on = (ctx.args[0] || 'on').toLowerCase() !== 'off';
    try {
        await sock.groupSettingUpdate(from, on ? 'announcement' : 'not_announcement');
        await sock.groupSettingUpdate(from, on ? 'locked' : 'unlocked');
        await send(sock, from, msg, `✅ Group safe mode turned *${on ? 'ON' : 'OFF'}*.`);
    } catch (e) { await send(sock, from, msg, '❌ Could not change safe mode.'); }
}

async function gpsafesettings(sock, from, msg, ctx) {
    if (!ctx.isGroup) return send(sock, from, msg, '❌ Group only.');
    try {
        const meta = await sock.groupMetadata(from);
        await send(sock, from, msg, `🛡️ *GROUP SAFE SETTINGS*\n\nAnnounce (admins only): ${meta.announce ? 'ON' : 'OFF'}\nInfo locked: ${meta.restrict ? 'ON' : 'OFF'}\n\nUse .lock / .unlock to change messaging,\n.lockedit / .unlockedit to change info editing.`);
    } catch (e) { await send(sock, from, msg, '❌ Could not fetch settings.'); }
}

async function groupmanage(sock, from, msg) {
    await send(sock, from, msg, '⚙️ *GROUP MANAGEMENT*\n\n.groupname / .gpname <name>\n.groupdesc / .gpdesc <text>\n.gppic (reply to image)\n.gplock / .gpopen\n.gcstatus\n.listadmin / .adminlist\n.kickall (owner)\n.kickadmins (owner)\n.pending\n.leave');
}

async function sudo(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    await send(sock, from, msg, `👑 *SUDO*\n\nYou are the owner of this session.\nNumber: +${num(ctx.sender)}\nYou already have full access to every command.`);
}

// ─── fun / media ─────────────────────────────────────────────────────────────
async function coin(sock, from, msg) { await send(sock, from, msg, `🪙 *Coin Flip:* ${Math.random() > 0.5 ? 'Heads' : 'Tails'}`); }
async function hi(sock, from, msg) { await send(sock, from, msg, `👋 *Hello ${msg.pushName || 'there'}!*\n\nI am 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋. Type .menu to see all commands.`); }
async function compliment(sock, from, msg, ctx) {
    const target = (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
    const list = ["You're amazing just the way you are!", 'You have a great sense of humor!', "You're incredibly thoughtful and kind.", 'You light up the room!', 'You inspire me!'];
    if (!target) return send(sock, from, msg, '❌ Mention someone or reply to their message.');
    await sock.sendMessage(from, { text: `Hey @${num(target)}, ${rand(list)}` + FOOTER, mentions: [target] }, { quoted: msg });
}
async function character(sock, from, msg) {
    const target = (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [])[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (!target) return send(sock, from, msg, '❌ Mention someone or reply to their message.');
    let pic = 'https://i.imgur.com/2wzGhpF.jpeg';
    try { pic = await sock.profilePictureUrl(target, 'image'); } catch (e) {}
    const traits = ['Intelligent', 'Creative', 'Determined', 'Kind', 'Loyal', 'Optimistic', 'Charismatic'];
    const picked = [...traits].sort(() => 0.5 - Math.random()).slice(0, 4).map(t => `${t}: ${Math.floor(Math.random() * 41) + 60}%`);
    await sock.sendMessage(from, { image: { url: pic }, caption: `🔮 *Character Analysis*\n\n👤 @${num(target)}\n\n${picked.join('\n')}\n\n🎯 Rating: ${Math.floor(Math.random() * 21) + 80}%`, mentions: [target] }, { quoted: msg });
}
async function truth(sock, from, msg) {
    const q = ['What is your biggest fear?', 'Who do you text the most?', 'What is your most embarrassing moment?', 'What is a secret you have never told anyone?'];
    await send(sock, from, msg, `❓ *TRUTH:* ${rand(q)}`);
}
async function insult(sock, from, msg) {
    const q = ['You bring everyone so much joy... when you leave the room.', 'I would agree with you, but then we would both be wrong.', 'You are like a cloud — when you disappear, it is a beautiful day.'];
    await send(sock, from, msg, `😈 ${rand(q)}`);
}
async function goodnight(sock, from, msg) {
    await send(sock, from, msg, '🌙 Goodnight! Sleep well and sweet dreams ✨');
}
async function snow(sock, from, msg) { await send(sock, from, msg, '❄️ ' + '❄️'.repeat(Math.floor(Math.random() * 5) + 3) + ' Snow day!'); }
async function pies(sock, from, msg) { await send(sock, from, msg, '🥧 ' + rand(['Blueberry', 'Apple', 'Cherry', 'Lemon']) + ' pie for you!'); }
async function sand(sock, from, msg) { await send(sock, from, msg, '🏖️ A peaceful beach for you.'); }
async function thunder(sock, from, msg) { await send(sock, from, msg, '⛈️ ' + rand(['Boom!', 'Crash!', 'Rumble!'])); }
async function tickle(sock, from, msg) { await send(sock, from, msg, '🤣 Tickle tickle!'); }
async function wink(sock, from, msg) { await send(sock, from, msg, '😉'); }
async function highfive(sock, from, msg) { await send(sock, from, msg, '🙌 High five!'); }
async function ice(sock, from, msg) { await send(sock, from, msg, '🧊 Ice cold!'); }
async function impressive(sock, from, msg) { await send(sock, from, msg, '😎 Impressive!'); }
async function stupid(sock, from, msg) { await send(sock, from, msg, '🙃 That is a bit silly!'); }
async function blown(sock, from, msg) { await send(sock, from, msg, '🤯 Mind blown!'); }
async function hacker(sock, from, msg) { await send(sock, from, msg, '💻 Hacking the mainframe... just kidding 😄'); }
async function devil(sock, from, msg) { await send(sock, from, msg, '😈 Muahahaha!'); }
async function squirrel(sock, from, msg) { await send(sock, from, msg, '🐿️ A cheeky squirrel appears!'); }
async function neon(sock, from, msg) { await send(sock, from, msg, '🌈 Neon vibes only!'); }
async function magicstudio(sock, from, msg) { await send(sock, from, msg, '✨ Welcome to the Magic Studio!'); }
async function arena(sock, from, msg) { await send(sock, from, msg, '⚔️ Let the arena battle begin!'); }
async function bass(sock, from, msg) { await send(sock, from, msg, '🔊 Turn the bass up!'); }
async function sniff(sock, from, msg) { await send(sock, from, msg, '👃 Sniff sniff... something smells good!'); }
async function freenet(sock, from, msg) { await send(sock, from, msg, '📶 Free internet vibes only.'); }
async function gb(sock, from, msg) { await send(sock, from, msg, `📊 *GB INFORMATION*\n\nI am 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋, a multi-device WhatsApp bot.\nType .menu for the full command list.`); }
async function simage(sock, from, msg) { await send(sock, from, msg, '🖼️ Send an image with the caption .sticker to convert it.'); }
async function memesearch(sock, from, msg, ctx) {
    const q = ctx.q;
    if (!q) return send(sock, from, msg, '⚠️ Usage: .memesearch <text>');
    try {
        const { data } = await axios.get(`https://meme-api.com/gimme/${encodeURIComponent(q)}`, A);
        if (data?.url) await sock.sendMessage(from, { image: { url: data.url }, caption: `😂 *${data.title}* (r/${data.subreddit})` }, { quoted: msg });
        else await send(sock, from, msg, '❌ No meme found.');
    } catch (e) { await send(sock, from, msg, '❌ Meme service unavailable.'); }
}

async function waifuImage(sock, from, msg, category) {
    try {
        const { data } = await axios.get(`https://api.waifu.pics/sfw/${category}`, A);
        await sock.sendMessage(from, { image: { url: data.url }, caption: `✨ *${category}*` }, { quoted: msg });
    } catch (e) { await send(sock, from, msg, '❌ Image service unavailable.'); }
}
async function konachan(sock, from, msg) {
    try {
        const { data } = await axios.get('https://konachan.net/post.json?limit=1&order=random', A);
        if (data?.[0]?.file_url) await sock.sendMessage(from, { image: { url: data[0].file_url }, caption: '🖼️ Konachan' }, { quoted: msg });
        else await send(sock, from, msg, '❌ No image found.');
    } catch (e) { await send(sock, from, msg, '❌ Image service unavailable.'); }
}

async function hangman(sock, from, msg) {
    const words = ['planet', 'rocket', 'guitar', 'coffee', 'dragon', 'matrix'];
    const word = rand(words);
    await send(sock, from, msg, `🎮 *HANGMAN*\n\nGuess the word:\n\`${'_ '.repeat(word.length).trim()}\`\n\nHint: it has ${word.length} letters. (This is a quick round — the full game needs a session store.)`);
}
async function tictactoe(sock, from, msg) {
    await send(sock, from, msg, '❌❌⭕\n❌⭕❌\n⭕❌❌\n\n🎮 Tic-Tac-Toe board shown above.');
}
async function randomAnime(sock, from, msg) {
    await send(sock, from, msg, rand(['🎲 Your random anime: *Attack on Titan*', '🎲 Your random anime: *One Piece*', '🎲 Your random anime: *Naruto*', '🎲 Your random anime: *Jujutsu Kaisen*', '🎲 Your random anime: *Demon Slayer*']));
}

// ─── bot-behaviour toggles ───────────────────────────────────────────────────
async function toggleSetting(sock, from, msg, ctx, key, label, note = '') {
    const { args, isOwner, botData, saveBotData } = ctx;
    if (!isOwner) return send(sock, from, msg, '❌ Only the owner can change this setting.');
    if (!botData.settings) botData.settings = {};
    const action = (args[0] || '').toLowerCase();
    if (action === 'on' || action === 'off') {
        botData.settings[key] = action === 'on';
        saveBotData();
        return send(sock, from, msg, `${action === 'on' ? '✅ Enabled' : '⛔ Disabled'} *${label}*.${note ? '\n\n' + note : ''}`);
    }
    const state = botData.settings[key] ? 'ON' : 'OFF';
    return send(sock, from, msg, `⚙️ *${label.toUpperCase()}*\n\nStatus: *${state}*\n\nUsage:\n.${key} on\n.${key} off`);
}

async function alwaysonline(sock, from, msg, ctx) {
    return toggleSetting(sock, from, msg, ctx, 'alwaysonline', 'Always Online', 'The bot keeps its presence shown as online.');
}

async function autoarchive(sock, from, msg, ctx) {
    const done = await toggleSetting(sock, from, msg, ctx, 'autoarchive', 'Auto Archive');
    if (ctx.botData.settings && ctx.botData.settings.autoarchive) {
        try { await sock.chatModify({ archive: true, lastMessages: [] }, from); } catch (e) {}
    }
    return done;
}

async function freezelastseen(sock, from, msg, ctx) {
    const done = await toggleSetting(sock, from, msg, ctx, 'freezelastseen', 'Freeze Last Seen');
    if (ctx.botData.settings && ctx.botData.settings.freezelastseen) {
        try { await sock.updateLastSeenPrivacy('nobody'); } catch (e) {}
    }
    return done;
}

async function autoblockgroup(sock, from, msg, ctx) {
    return toggleSetting(sock, from, msg, ctx, 'autoblockgroup', 'Auto Block Groups', 'Unknown groups will be blocked automatically.');
}

async function tostatus(sock, from, msg, ctx) {
    if (!requireOwner(ctx.isOwner, sock, from, msg)) return;
    const text = ctx.q;
    if (!text) return send(sock, from, msg, '⚠️ Usage: .tostatus <text>');
    try {
        await sock.sendMessage('status@broadcast', { text });
        await send(sock, from, msg, '✅ Status posted.');
    } catch (e) { await send(sock, from, msg, '❌ Could not post the status.'); }
}

// autoblockunknown / autoblockunknowncalls live in their own modules
async function autoblockunknown(sock, from, msg, ctx) {
    const mod = require('./autoblockunknown');
    return mod.handleAutoblockunknownCommand(sock, from, msg, 'autoblockunknown', ctx.args, ctx.sender, ctx.isOwner);
}
async function autoblockunknowncalls(sock, from, msg, ctx) {
    const mod = require('./autoblockunknowncalls');
    return mod.handleAutoblockunknowncallsCommand(sock, from, msg, 'autoblockunknowncalls', ctx.args, ctx.sender, ctx.isOwner);
}

// ─── ported standalone command modules ───────────────────────────────────────
async function tts(sock, from, msg, ctx) {
    return require('./tts').execute(sock, from, msg, ctx.args, ctx);
}
async function stream(sock, from, msg, ctx) {
    return require('./stream').execute(sock, from, msg, ctx.args, ctx);
}
async function stickertelegram(sock, from, msg, ctx) {
    return require('./stickertelegram').execute(sock, from, msg, ctx.args);
}
async function take(sock, from, msg, ctx) {
    return require('./take')(sock, from, msg, ctx.args);
}
async function instagram(sock, from, msg) {
    return require('./instagram')(sock, from, msg);
}
async function tagnotadmin(sock, from, msg, ctx) {
    return require('./tagnotadmin')(sock, from, ctx.sender, msg);
}
async function deleteBulk(sock, from, msg, ctx) {
    return require('./delete')(sock, from, msg, ctx.sender);
}
async function mention(sock, from, msg, ctx) {
    return require('./mention').execute(sock, from, msg, ctx.args);
}
async function autoreply(sock, from, msg, ctx) {
    return require('./autoreply').execute(sock, from, msg, ctx.args);
}

module.exports = Object.assign({}, guards, {
    myip, info, system, whoami, inspect, wiki, del, delete: del, statussaver, unblock,
    setprefix, newsletter, autojoin, pending, kickall, kickadmins, gcstatus,
    gpsafe, gpsafesettings, groupmanage, sudo,
    coin, hi, compliment, character, truth, insult, goodnight, snow, pies, sand,
    thunder, tickle, wink, highfive, ice, impressive, stupid, blown, hacker,
    devil, squirrel, neon, magicstudio, arena, bass, sniff, freenet,
    GbInformation: gb, gb, simage, memesearch, konachan, hangman, tictactoe,
    random: randomAnime,
    waifu: (s, f, m) => waifuImage(s, f, m, 'waifu'),
    neko: (s, f, m) => waifuImage(s, f, m, 'neko'),
    megumin: (s, f, m) => waifuImage(s, f, m, 'megumin'),
    loli: (s, f, m) => waifuImage(s, f, m, 'neko'),
    milf: (s, f, m) => waifuImage(s, f, m, 'waifu'),
    // bot-behaviour + autoblock toggles
    alwaysonline, autoarchive, freezelastseen, autoblockgroup,
    autoblockunknown, autoblockunknowncalls, tostatus,
    // ported standalone commands
    tts, texttospeech: tts, speak: tts, stream, mstream: stream,
    stickertelegram, tgsticker: stickertelegram, tgs: stickertelegram,
    take, instagram, tagnotadmin, mention, tag: mention, autoreply, auto: autoreply,
    delete: deleteBulk, purge: deleteBulk
});
