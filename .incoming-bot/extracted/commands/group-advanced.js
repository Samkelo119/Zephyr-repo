// commands/group-advanced.js
// 👑 AWAIS CYBER — Batch 2: 25 advanced GROUP commands.
//
// ⚠️ Important WhatsApp-platform limit (not a code limit): actions like
// promote/demote/setgname/setgdesc/setgpic/lock/unlock/addmember/grouplink
// ONLY work if the BOT'S OWN NUMBER is a WhatsApp group admin. That's
// enforced by WhatsApp's servers — no code can bypass it. Info-only commands
// (listmembers, tagadmins, exportmembers, inviteinfo, groupcount,
// activelist) work without the bot being admin.

async function promote(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return sock.sendMessage(from, { text: '⚠️ Kisi ko reply ya mention karo.' }, { quoted: msg });
    try {
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} ab admin hai.`, mentions: [target] }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function demote(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return sock.sendMessage(from, { text: '⚠️ Kisi ko reply ya mention karo.' }, { quoted: msg });
    try {
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} admin se hata diya.`, mentions: [target] }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function setgname(sock, from, msg, isGroup, isAdmin, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.setgname <new name>`' }, { quoted: msg });
    try {
        await sock.groupUpdateSubject(from, q);
        await sock.sendMessage(from, { text: '✅ Group name update ho gaya.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function setgdesc(sock, from, msg, isGroup, isAdmin, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.setgdesc <new description>`' }, { quoted: msg });
    try {
        await sock.groupUpdateDescription(from, q);
        await sock.sendMessage(from, { text: '✅ Group description update ho gaya.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function setgpic(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = quoted?.imageMessage || msg.message?.imageMessage;
    if (!imgMsg) return sock.sendMessage(from, { text: '⚠️ Ek image ko reply karo (ya image ke sath caption `.setgpic` bhejo).' }, { quoted: msg });
    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const sharp = require('sharp');
        const stream = await downloadContentFromMessage(imgMsg, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        const jpeg = await sharp(buffer).resize(640, 640).jpeg().toBuffer();
        await sock.updateProfilePicture(from, jpeg);
        await sock.sendMessage(from, { text: '✅ Group DP update ho gayi.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function grouplink(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    try {
        const code = await sock.groupInviteCode(from);
        await sock.sendMessage(from, { text: `🔗 https://chat.whatsapp.com/${code}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function revokelink(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    try {
        const code = await sock.groupRevokeInvite(from);
        await sock.sendMessage(from, { text: `✅ Naya link: https://chat.whatsapp.com/${code}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function lockgroup(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    try {
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: '🔒 Ab sirf admins message bhej sakte hain.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function unlockgroup(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: '🔓 Ab sab members message bhej sakte hain.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function lockedit(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    try {
        await sock.groupSettingUpdate(from, 'locked');
        await sock.sendMessage(from, { text: '🔒 Ab sirf admins group info (name/pic/desc) edit kar sakte hain.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function unlockedit(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    try {
        await sock.groupSettingUpdate(from, 'unlocked');
        await sock.sendMessage(from, { text: '🔓 Ab sab members group info edit kar sakte hain.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed. Bot ko group admin banao pehle.' }, { quoted: msg });
    }
}

async function leavegroup(sock, from, msg, isGroup, isAdmin) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner use kar sakta hai.' }, { quoted: msg });
    try {
        await sock.sendMessage(from, { text: '👋 Bot is group se leave kar raha hai...' }, { quoted: msg });
        await sock.groupLeave(from);
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Leave nahi ho saka.' }, { quoted: msg });
    }
}

async function listmembers(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        const text = `👥 *Members (${meta.participants.length}):*\n\n` + meta.participants.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
        await sock.sendMessage(from, { text, mentions: meta.participants.map(p => p.id) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ List nahi mil saki.' }, { quoted: msg });
    }
}

async function activelist(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        const members = meta.participants.filter(p => !p.admin);
        const text = `🙋 *Non-admin members (${members.length}):*\n\n` + members.map((p, i) => `${i + 1}. @${p.id.split('@')[0]}`).join('\n');
        await sock.sendMessage(from, { text, mentions: members.map(p => p.id) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ List nahi mil saki.' }, { quoted: msg });
    }
}

async function tagadmins(sock, from, msg, isGroup, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        const admins = meta.participants.filter(p => p.admin);
        const text = (q || '📢 Attention admins!') + '\n\n' + admins.map(a => `@${a.id.split('@')[0]}`).join(' ');
        await sock.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Failed.' }, { quoted: msg });
    }
}

async function warn(sock, from, msg, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return sock.sendMessage(from, { text: '⚠️ Kisi ko reply ya mention karo.' }, { quoted: msg });
    if (!botData.warnings) botData.warnings = {};
    if (!botData.warnings[from]) botData.warnings[from] = {};
    botData.warnings[from][target] = (botData.warnings[from][target] || 0) + 1;
    const count = botData.warnings[from][target];
    saveBotData();
    let text = `⚠️ @${target.split('@')[0]} ko warning di gayi. (${count}/3)`;
    if (count >= 3) {
        try {
            await sock.groupParticipantsUpdate(from, [target], 'remove');
            text += `\n\n🚫 3 warnings puri — user remove kar diya gaya.`;
            botData.warnings[from][target] = 0;
            saveBotData();
        } catch (e) {
            text += `\n\n❌ 3 warnings puri lekin remove nahi kar saka (bot admin nahi hai).`;
        }
    }
    await sock.sendMessage(from, { text, mentions: [target] }, { quoted: msg });
}

async function warnings(sock, from, msg, isGroup, botData) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.key.participant;
    const count = botData.warnings?.[from]?.[target] || 0;
    await sock.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} ki warnings: ${count}/3`, mentions: [target] }, { quoted: msg });
}

async function resetwarn(sock, from, msg, isGroup, isAdmin, botData, saveBotData) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return sock.sendMessage(from, { text: '⚠️ Kisi ko reply ya mention karo.' }, { quoted: msg });
    if (botData.warnings?.[from]) botData.warnings[from][target] = 0;
    saveBotData();
    await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} ki warnings reset ho gayin.`, mentions: [target] }, { quoted: msg });
}

async function exportmembers(sock, from, msg, isGroup) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    try {
        const meta = await sock.groupMetadata(from);
        const list = meta.participants.map(p => p.id.split('@')[0]).join('\n');
        await sock.sendMessage(from, {
            document: Buffer.from(list, 'utf-8'),
            mimetype: 'text/plain',
            fileName: `${meta.subject.replace(/[^a-z0-9]/gi, '_')}_members.txt`
        }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Export nahi ho saka.' }, { quoted: msg });
    }
}

async function groupcreate(sock, from, msg, isAdmin, q) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner use kar sakta hai.' }, { quoted: msg });
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.groupcreate <group name>`' }, { quoted: msg });
    try {
        const result = await sock.groupCreate(q, []);
        await sock.sendMessage(from, { text: `✅ Group "${q}" create ho gaya.\n🆔 ${result.id}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Group create nahi ho saka.' }, { quoted: msg });
    }
}

async function addmember(sock, from, msg, isGroup, isAdmin, q) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Sirf group mein chalti hai.' }, { quoted: msg });
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner/admin use kar sakta hai.' }, { quoted: msg });
    const number = (q || '').replace(/[^0-9]/g, '');
    if (!number) return sock.sendMessage(from, { text: '⚠️ Usage: `.addmember 923001234567`' }, { quoted: msg });
    try {
        await sock.groupParticipantsUpdate(from, [`${number}@s.whatsapp.net`], 'add');
        await sock.sendMessage(from, { text: `✅ ${number} ko add kar diya.` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Add nahi ho saka (bot admin nahi, ya number invalid/privacy settings).' }, { quoted: msg });
    }
}

async function broadcast(sock, from, msg, isAdmin, botData, q) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner use kar sakta hai.' }, { quoted: msg });
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.broadcast <message>`' }, { quoted: msg });
    const groups = Object.keys(botData.knownGroups || {});
    if (!groups.length) return sock.sendMessage(from, { text: 'ℹ️ Abhi tak koi group record nahi hai. Groups mein kuch commands chalne ke baad yeh list ban jayegi.' }, { quoted: msg });
    let sent = 0;
    for (const g of groups) {
        try { await sock.sendMessage(g, { text: `📢 *Broadcast:*\n\n${q}` }); sent++; } catch (e) {}
    }
    await sock.sendMessage(from, { text: `✅ Broadcast ${sent}/${groups.length} groups mein bhej diya.` }, { quoted: msg });
}

async function inviteinfo(sock, from, msg, q) {
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.inviteinfo <chat.whatsapp.com link>`' }, { quoted: msg });
    const code = q.split('/').pop();
    try {
        const info = await sock.groupGetInviteInfo(code);
        await sock.sendMessage(from, { text: `🔗 *Invite Info*\n\n📛 Name: ${info.subject}\n👥 Members: ${info.size || info.participants?.length || '-'}\n📝 Desc: ${info.desc || '-'}` }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Invalid ya expired link.' }, { quoted: msg });
    }
}

async function joingroup(sock, from, msg, isAdmin, q) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Sirf owner use kar sakta hai.' }, { quoted: msg });
    if (!q) return sock.sendMessage(from, { text: '⚠️ Usage: `.joingroup <chat.whatsapp.com link>`' }, { quoted: msg });
    const code = q.split('/').pop();
    try {
        await sock.groupAcceptInvite(code);
        await sock.sendMessage(from, { text: '✅ Group join ho gaya.' }, { quoted: msg });
    } catch (e) {
        await sock.sendMessage(from, { text: '❌ Join nahi ho saka (link invalid/expired).' }, { quoted: msg });
    }
}

async function groupcount(sock, from, msg, botData) {
    const count = Object.keys(botData.knownGroups || {}).length;
    await sock.sendMessage(from, { text: `📊 Bot abhi tak ${count} groups mein active dekha gaya hai.` }, { quoted: msg });
}

module.exports = {
    promote, demote, setgname, setgdesc, setgpic, grouplink, revokelink,
    lockgroup, unlockgroup, lockedit, unlockedit, leavegroup, listmembers,
    activelist, tagadmins, warn, warnings, resetwarn, exportmembers,
    groupcreate, addmember, broadcast, inviteinfo, joingroup, groupcount
};
