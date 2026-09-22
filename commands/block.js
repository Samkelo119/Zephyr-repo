// commands/block.js
// 👑 AWAIS CYBER — bot-wide user block list + global "known users" log.
//
// SECURITY FIX (this rebuild): this command used to be gated by a
// hardcoded "secret key" string embedded directly in the source code —
// which was also printed back out in the command's own help text the
// moment anyone typed ".block" without it. That meant ANY WhatsApp user
// could read the real key straight from the bot's reply, then use it to
// dump the full user database (names + numbers of everyone who ever
// messaged the bot) or block/unblock any number. It also happened to be
// the same string as the Admin Panel's default password, so leaking it
// leaked panel access too. All of that is removed — this now uses the
// same isOwner check every other owner-only command in this bot uses.

module.exports = async (sock, from, msg, botData, saveBotData, args, sender, isOwner) => {
    try {
        if (!isOwner) {
            return await sock.sendMessage(from, { text: "❌ Only the bot owner can use this command." }, { quoted: msg });
        }

        // Database Setup
        if (!botData.blockedUsers || typeof botData.blockedUsers !== 'object') botData.blockedUsers = {};
        if (!botData.allBotUsers || typeof botData.allBotUsers !== 'object') botData.allBotUsers = {};

        // Auto-log active users globally
        const rawFrom = from ? from.split('@')[0].split(':')[0] : '';
        if (from && !from.endsWith('@g.us') && from !== 'status@broadcast' && msg.key.fromMe !== true) {
            const cleanLogJid = rawFrom + '@s.whatsapp.net';
            if (!Object.prototype.hasOwnProperty.call(botData.allBotUsers, cleanLogJid)) {
                botData.allBotUsers[cleanLogJid] = msg.pushName || 'WhatsApp User';
                saveBotData();
            }
        }

        let subCommand = args[0]?.toLowerCase();
        if (subCommand === 'users') subCommand = 'user';
        const secondArg = args[1]?.toLowerCase();

        // 1️⃣ .block user -> Display global database user log
        if (subCommand === 'user' && !secondArg) {
            const usersList = Object.keys(botData.allBotUsers);
            if (usersList.length === 0) {
                return await sock.sendMessage(from, { text: "📂 *DATABASE EMPTY*\n\nNo user records found in the network logs yet." }, { quoted: msg });
            }

            let response = `📋 *🤖 𝘡𝘌𝘗𝘏𝘠𝘙 𝘉𝘖𝘛 - GLOBAL USERS LOG* 📋\n\n`;
            usersList.forEach((u, index) => {
                const userName = botData.allBotUsers[u] || 'Unknown User';
                response += `${index + 1}. 👤 *${userName}*\n   🔗 @${u.split('@')[0]}\n`;
            });
            return await sock.sendMessage(from, { text: response, mentions: usersList }, { quoted: msg });
        }

        // 2️⃣ .block list user -> Display blacklisted numbers
        if (subCommand === 'list' && secondArg === 'user') {
            const blockedList = Object.keys(botData.blockedUsers);
            if (blockedList.length === 0) {
                return await sock.sendMessage(from, { text: "🎉 *FIREWALL CLEAN*\n\nNo targets are currently isolated from the bot network." }, { quoted: msg });
            }

            let response = `🚫 *🔒 𝘡𝘌𝘗𝘏𝘠𝘙 BOT - BLACKLISTED TARGETS* 🚫\n\n`;
            blockedList.forEach((u, index) => {
                const name = botData.allBotUsers[u] || "Restricted Target";
                response += `${index + 1}. ❌ *${name}*\n   🔗 @${u.split('@')[0]}\n`;
            });
            return await sock.sendMessage(from, { text: response, mentions: blockedList }, { quoted: msg });
        }

        // 3️⃣ .block user [number/reply] [on/off] -> Toggle Firewall Block
        if (subCommand === 'user' && secondArg) {
            let inputNumber = secondArg;
            let action = args[2]?.toLowerCase();

            let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
                         msg.message?.extendedTextMessage?.contextInfo?.participant;

            if (!target && inputNumber) {
                if (inputNumber === 'on' || inputNumber === 'off') {
                    action = inputNumber;
                    target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                } else {
                    const cleanInput = inputNumber.replace(/[^0-9]/g, '');
                    if (cleanInput.length >= 10) {
                        target = cleanInput + '@s.whatsapp.net';
                    }
                }
            }

            if (!target) {
                return await sock.sendMessage(from, { text: `⚠️ *PARSING ERROR*\n\nPlease provide a valid number.\n\nExample: \`.block user 923xxxxxxxxx on\`` }, { quoted: msg });
            }

            const targetClean = target.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const targetJid = `${targetClean}@s.whatsapp.net`;

            if (action === 'on') {
                const ownerNumber = require('../settings').ownerNumber;
                if (targetClean === ownerNumber) {
                    return await sock.sendMessage(from, { text: "❌ *SECURITY DENIED*\n\nOperation aborted. You cannot blacklist the bot owner." }, { quoted: msg });
                }
                botData.blockedUsers[targetJid] = true;
                saveBotData();
                return await sock.sendMessage(from, { text: `🚫 *PERMANENT BLOCK ACTIVATED*\n\nTarget @${targetClean} has been isolated from the infrastructure. Packets dropped.`, mentions: [targetJid] }, { quoted: msg });
            }
            else if (action === 'off') {
                if (Object.prototype.hasOwnProperty.call(botData.blockedUsers, targetJid)) {
                    delete botData.blockedUsers[targetJid];
                    saveBotData();
                    return await sock.sendMessage(from, { text: `✅ *TARGET RESTORED*\n\nTarget @${targetClean} cleared from the blacklist firewall. Services active.`, mentions: [targetJid] }, { quoted: msg });
                } else {
                    return await sock.sendMessage(from, { text: "❌ *STATUS ERROR*\n\nThis target is already active or unblocked within the network." }, { quoted: msg });
                }
            } else {
                return await sock.sendMessage(from, { text: "⚠️ *SYNTAX ERROR*\n\nPlease state the final action status parameter (`on` / `off`)." }, { quoted: msg });
            }
        }

        // Help Panel Interface
        const helpText = `⚡ *𝘡𝘌𝘗𝘏𝘠𝘙 INTERNAL SECURITY CONTROLLER* ⚡\n\n` +
                         `1️⃣ *Fetch Global Database Logs:* \n   * \`.block user\`\n\n` +
                         `2️⃣ *Fetch Firewall Blacklist:* \n   * \`.block list user\`\n\n` +
                         `3️⃣ *Deploy Permanent System Block:* \n   * \`.block user 923xxxxxxxxx on\`\n\n` +
                         `4️⃣ *Purge Block / Restore Access:* \n   * \`.block user 923xxxxxxxxx off\``;

        await sock.sendMessage(from, { text: helpText }, { quoted: msg });

    } catch (error) {
        console.error("Error in block system:", error);
        await sock.sendMessage(from, { text: "❌ *CRITICAL SYSTEM ERROR:* " + error.message }, { quoted: msg });
    }
};
