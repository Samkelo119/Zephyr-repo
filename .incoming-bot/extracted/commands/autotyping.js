/**
 * AWAIS CYBER BOT - AUTO TYPING TOGGLE
 * Feature: Show "typing..." presence before every bot reply
 */

async function autotypingCommand(sock, from, msg, isAdmin, botData, saveBotData, userId, args) {
    if (!isAdmin) {
        return await sock.sendMessage(from, { text: "❌ Only the owner can use this command." }, { quoted: msg });
    }

    if (!botData.typingSettings) botData.typingSettings = {};
    const action = args[0]?.toLowerCase();

    if (action === 'on') {
        botData.typingSettings[userId] = true;
        saveBotData();
        await sock.sendMessage(from, { text: "⌨️ Auto Typing has been turned ON." }, { quoted: msg });
    } else if (action === 'off') {
        botData.typingSettings[userId] = false;
        saveBotData();
        await sock.sendMessage(from, { text: "⌨️ Auto Typing has been turned OFF." }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "⚠️ Usage: .autotyping on / .autotyping off" }, { quoted: msg });
    }
}

module.exports = autotypingCommand;
