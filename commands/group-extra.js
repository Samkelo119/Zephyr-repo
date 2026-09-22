// commands/group-extra.js
// 👑 AWAIS CYBER — Group utility commands that work WITHOUT the bot needing
// WhatsApp group-admin rights. (Actions that WhatsApp itself restricts to
// admins — kick/promote/change name/change icon — still need the bot
// account to be a real WA group admin; that's a platform rule, not something
// code can bypass.)

async function groupname(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        await sock.sendMessage(from, { text: `📛 *Group Name:*\n${meta.subject}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Group info nahi mil saka.' }, { quoted: msg });
    }
}

async function groupdesc(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        await sock.sendMessage(from, { text: `📝 *Group Description:*\n${meta.desc || '_Koi description set nahi hai._'}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Description nahi mil saka.' }, { quoted: msg });
    }
}

async function membercount(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        await sock.sendMessage(from, { text: `👥 *Total Members:* ${meta.participants.length}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Member count nahi mil saka.' }, { quoted: msg });
    }
}

async function adminlist(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
        if (!admins.length) return sock.sendMessage(from, { text: 'ℹ️ Is group mein koi admin set nahi (ya bot fetch nahi kar saka).' }, { quoted: msg });
        let text = `👑 *Group Admins (${admins.length}):*\n\n`;
        admins.forEach((a, i) => { text += `${i + 1}. @${a.id.split('@')[0]}\n`; });
        await sock.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Admin list nahi mil saki.' }, { quoted: msg });
    }
}

async function whois(sock, from, msg, isGroup) {
    try {
        let target = msg.message?.extendedTextMessage?.contextInfo?.participant
            || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
            || msg.key.participant || msg.key.remoteJid;

        let text = `🪪 *WHOIS*\n\n👤 *Number:* @${target.split('@')[0]}\n🔗 *JID:* ${target}`;

        if (isGroup) {
            try {
                const meta = await sock.groupMetadata(from);
                const p = meta.participants.find(x => x.id === target);
                if (p) text += `\n🛡️ *Role:* ${p.admin ? p.admin : 'member'}`;
            } catch (e) {}
        }

        await sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Info nahi mil saki.' }, { quoted: msg });
    }
}

async function chatid(sock, from, msg) {
    await sock.sendMessage(from, { text: `🆔 *Chat ID:*\n${from}` }, { quoted: msg });
}

async function runtime(sock, from, msg, botData) {
    const ms = Date.now() - (botData.startedAt || Date.now());
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / (1000 * 60)) % 60;
    const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    await sock.sendMessage(from, { text: `⏱️ *Bot Runtime:*\n${d}d ${h}h ${m}m ${s}s` }, { quoted: msg });
}

async function rules(sock, from, msg, args, isGroup, botData, saveBotData, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    if (!botData.groupRules) botData.groupRules = {};
    if (args[0] === 'set' && q.slice(4).trim()) {
        botData.groupRules[from] = q.slice(4).trim();
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Group rules save ho gaye.' }, { quoted: msg });
    }
    const r = botData.groupRules[from];
    await sock.sendMessage(from, { text: r ? `📜 *Group Rules:*\n\n${r}` : 'ℹ️ Rules set nahi hain. Set karne ke liye: `.rules set <text>`' }, { quoted: msg });
}

async function welcome(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/bot-controller yeh set kar sakta hai.' }, { quoted: msg });
    if (!botData.welcomeGroups) botData.welcomeGroups = {};
    const sub = args[0];
    if (sub === 'on') {
        botData.welcomeGroups[from] = botData.welcomeGroups[from] || {};
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Welcome messages ON ho gaye.' }, { quoted: msg });
    }
    if (sub === 'off') {
        delete botData.welcomeGroups[from];
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Welcome messages OFF ho gaye.' }, { quoted: msg });
    }
    if (sub === 'set') {
        const message = q.slice(4).trim();
        if (!message) return sock.sendMessage(from, { text: '⚠️ Usage: `.welcome set <text>` (@user, @group use kar sakte ho)' }, { quoted: msg });
        botData.welcomeGroups[from] = { message };
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Custom welcome message set ho gaya.' }, { quoted: msg });
    }
    await sock.sendMessage(from, { text: '⚙️ Usage: `.welcome on` / `.welcome off` / `.welcome set <text>`' }, { quoted: msg });
}

async function goodbye(sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Yeh command sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/bot-controller yeh set kar sakta hai.' }, { quoted: msg });
    if (!botData.goodbyeGroups) botData.goodbyeGroups = {};
    const sub = args[0];
    if (sub === 'on') {
        botData.goodbyeGroups[from] = botData.goodbyeGroups[from] || {};
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Goodbye messages ON ho gaye.' }, { quoted: msg });
    }
    if (sub === 'off') {
        delete botData.goodbyeGroups[from];
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Goodbye messages OFF ho gaye.' }, { quoted: msg });
    }
    if (sub === 'set') {
        const message = q.slice(4).trim();
        if (!message) return sock.sendMessage(from, { text: '⚠️ Usage: `.goodbye set <text>` (@user use kar sakte ho)' }, { quoted: msg });
        botData.goodbyeGroups[from] = { message };
        saveBotData();
        return sock.sendMessage(from, { text: '✅ Custom goodbye message set ho gaya.' }, { quoted: msg });
    }
    await sock.sendMessage(from, { text: '⚙️ Usage: `.goodbye on` / `.goodbye off` / `.goodbye set <text>`' }, { quoted: msg });
}

async function poll(sock, from, msg, q) {
    if (!q || !q.includes('|')) {
        return sock.sendMessage(from, { text: '⚠️ Usage: `.poll Question | Option1 | Option2 | Option3`' }, { quoted: msg });
    }
    const parts = q.split('|').map(s => s.trim()).filter(Boolean);
    const question = parts[0];
    const options = parts.slice(1, 13);
    if (options.length < 2) {
        return sock.sendMessage(from, { text: '⚠️ Kam az kam 2 options do.' }, { quoted: msg });
    }
    try {
        await sock.sendMessage(from, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Poll create nahi ho saka.' }, { quoted: msg });
    }
}

module.exports = {
    groupname, groupdesc, membercount, adminlist, whois,
    chatid, runtime, rules, welcome, goodbye, poll
};
