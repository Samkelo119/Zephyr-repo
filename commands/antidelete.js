/**
 * 👑 𝘡𝘌𝘗𝘏𝘠𝘙 ULTRA-BOT - ANTI-DELETE SHIELD MODULE
 * ⚡ Feature: Real-time Message Revocation Interception & Media Recovery
 */

const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

// Ensure tmp dir exists
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Function to get folder size in MB
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }
        return totalSize / (1024 * 1024);
    } catch (err) {
        return 0;
    }
};

// Function to clean temp folder if size exceeds 100MB
const cleanTempFolderIfLarge = () => {
    try {
        if (getFolderSizeInMB(TEMP_MEDIA_DIR) > 100) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file));
            }
        }
    } catch (err) {}
};

setInterval(cleanTempFolderIfLarge, 60 * 1000);

async function handleAntideleteCommand(sock, chatId, message, isAdmin, botData, saveBotData, userId, args) {
    if (!isAdmin) {
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        return await sock.sendMessage(chatId, { text: "❌ *[SECURITY OVERRIDE]* Only the root owner can configure the interceptor rules." }, { quoted: message });
    }

    const match = args[0]?.toLowerCase();
    if (!botData.antiDelete) botData.antiDelete = {};

    if (!match) {
        const isEnabled = botData.antiDelete[userId] || false;
        await sock.sendMessage(chatId, { react: { text: '⚙️', key: message.key } });
        return sock.sendMessage(chatId, {
            text: `╭━━━〔 🛡️ *𝗔𝗡𝗧𝗜-𝗗𝗘𝗟𝗘𝗧𝗘 𝗦𝗘𝗧𝗨𝗣* 〕━━━╮\n\n` +
                   `🤖 *𝗕𝗢𝗧:* 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋\n` +
                   `⚙️ *Interceptor:* Message Revocation Monitor\n` +
                   `📊 *Status:* ${isEnabled ? '✅ Enabled [100% Active]' : '❌ Disabled [Standby]'}\n\n` +
                   `🛠️ *Configuration Commands:*\n` +
                   `👉 \`.antidelete on\` - (Enable Interceptor Shield)\n` +
                   `👉 \`.antidelete off\` - (Disable Interceptor Shield)\n\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: message });
    }

    if (match === 'on') {
        botData.antiDelete[userId] = true;
        saveBotData();
        await sock.sendMessage(chatId, { react: { text: '🛡️', key: message.key } });
        return sock.sendMessage(chatId, {
            text: `╭━━━〔 🛡️ *𝗦𝗛𝗜𝗘𝗟𝗗 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋\n` +
                  `⚙️ *Module:* Anti-Delete Interceptor\n` +
                  `⚡ *Status:* Monitoring Packet Logs...\n\n` +
                  `💀 _The network layers will now actively intercept and recover all deleted text/media structures._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: message });

    } else if (match === 'off') {
        botData.antiDelete[userId] = false;
        saveBotData();
        await sock.sendMessage(chatId, { react: { text: '⚠️', key: message.key } });
        return sock.sendMessage(chatId, {
            text: `╭━━━〔 ⚠️ *𝗦𝗛𝗜𝗘𝗟𝗗 𝗗𝗘𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗* 〕━━━╮\n\n` +
                  `🤖 *𝗕𝗢𝗧:* 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋\n` +
                  `🚨 *Status:* Interceptor Firewall Stopped\n\n` +
                  `⚠️ _Warning: Revoked messages will no longer be traced or stored in the temporary buffer._\n\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: message });
    } else {
        await sock.sendMessage(chatId, { react: { text: '❓', key: message.key } });
        return sock.sendMessage(chatId, { text: '❌ *Invalid Command Syntax! Use .antidelete to review configurations.*' }, { quoted: message });
    }
}

async function storeMessage(message, botData, userId) {
    try {
        // 🐛 CRITICAL FIX: this used to run for EVERY message in EVERY
        // chat, for EVERY user of the bot, permanently — downloading and
        // storing images/videos/stickers to disk regardless of whether
        // anyone had ever run `.antidelete on`. That's both a resource
        // leak (unbounded disk/memory growth) and very likely a source
        // of the "random messages" reports — the revocation handler
        // below would auto-DM the owner an "intercept report" for every
        // single deleted message in every group, on every account,
        // whether they wanted the feature or not. Now it's a genuine
        // opt-in: nothing is stored or reported unless that specific
        // user has run `.antidelete on`.
        if (!botData?.antiDelete?.[userId]) return;

        const messageId = message.key?.id;
        if (!messageId) return;

        let content = '';
        let mediaType = '';
        let mediaPath = '';
        const sender = message.key.participant || message.key.remoteJid;

        const msg = message.message?.ephemeralMessage?.message || 
                    message.message?.viewOnceMessage?.message || 
                    message.message?.viewOnceMessageV2?.message || 
                    message.message;

        if (!msg) return;

        if (msg.conversation) {
            content = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
            content = msg.extendedTextMessage.text;
        } else if (msg.imageMessage) {
            mediaType = 'image';
            content = msg.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(msg.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (msg.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(msg.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        } else if (msg.videoMessage) {
            mediaType = 'video';
            content = msg.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(msg.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (msg.audioMessage) {
            mediaType = 'audio';
            const buffer = await downloadContentFromMessage(msg.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            chat: message.key.remoteJid,
            group: message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });
    } catch (err) {}
}

async function handleMessageRevocation(sock, revocationMessage, botData, userId) {
    try {
        if (!botData?.antiDelete?.[userId]) return; // opt-in only — see fix note in storeMessage above

        const ownerNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botUserId = sock.user.id.split('@')[0].split(':')[0];

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;

        if (deletedBy.includes(sock.user.id) || deletedBy === ownerNumber) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];

        let sourceLabel;
        if (original.group) {
            let groupName = original.group;
            try { const meta = await sock.groupMetadata(original.group); groupName = meta.subject || groupName; } catch (e) {}
            sourceLabel = `👥 *Group:* ${groupName}\n🔗 *Chat ID:* ${original.group}`;
        } else {
            sourceLabel = `💬 *Chat:* Direct message (${original.chat || sender})`;
        }

        let report = `╭━━━〔 📡 *𝗜𝗡𝗧𝗘𝗥𝗖𝗘𝗣𝗧 𝗥𝗘𝗣𝗢𝗥𝗧* 〕━━━╮\n\n` +
                     `👤 *Sender:* @${senderName}\n` +
                     `🗑️ *Deleted By:* @${deletedBy.split('@')[0]}\n` +
                     `${sourceLabel}\n` +
                     `🕒 *Time Log:* ${new Date().toLocaleTimeString()}\n` +
                     `📂 *Data Type:* ${original.mediaType || 'Text'}\n` +
                     `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        if (original.content) {
            report += `📝 *Recovered Content:*\n\`\`\`${original.content}\`\`\``;
        }

        await sock.sendMessage(ownerNumber, { text: report, mentions: [deletedBy, sender] });

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = { caption: `⚡ *Recovered ${original.mediaType}* from @${senderName}`, mentions: [sender] };
            if (original.mediaType === 'image') await sock.sendMessage(ownerNumber, { image: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'sticker') await sock.sendMessage(ownerNumber, { sticker: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'video') await sock.sendMessage(ownerNumber, { video: { url: original.mediaPath }, ...mediaOptions });
            else if (original.mediaType === 'audio') await sock.sendMessage(ownerNumber, { audio: { url: original.mediaPath }, mimetype: 'audio/mp4', ...mediaOptions });
            
            // Delete file after sending
            setTimeout(() => {
                try { if (fs.existsSync(original.mediaPath)) fs.unlinkSync(original.mediaPath); } catch (err) {}
            }, 5000);
        }
        messageStore.delete(messageId);
    } catch (err) {}
}

module.exports = handleAntideleteCommand;
module.exports.storeMessage = storeMessage;
module.exports.handleMessageRevocation = handleMessageRevocation;
