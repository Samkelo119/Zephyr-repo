/**
 * AWAIS CYBER BOT - AUTO RECORDING TOGGLE
 * Feature: Show "recording audio..." presence before every bot reply
 */

async function autorecordingCommand(sock, from, msg, isAdmin, botData, saveBotData, userId, args) {
    if (!isAdmin) {
        return await sock.sendMessage(from, { text: "❌ Only the owner can use this command." }, { quoted: msg });
    }

    if (!botData.recordingSettings) botData.recordingSettings = {};
    const action = args[0]?.toLowerCase();

    if (action === 'on') {
        botData.recordingSettings[userId] = true;
        saveBotData();
        await sock.sendMessage(from, { text: "🎙️ Auto Recording has been turned ON." }, { quoted: msg });
    } else if (action === 'off') {
        botData.recordingSettings[userId] = false;
        saveBotData();
        await sock.sendMessage(from, { text: "🎙️ Auto Recording has been turned OFF." }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "⚠️ Usage: .autorecording on / .autorecording off" }, { quoted: msg });
    }
}

module.exports = autorecordingCommand;
