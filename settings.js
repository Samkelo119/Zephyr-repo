module.exports = {

    // ==============================
    // 🤖 ZEPHYR MD BOT CONFIG
    // ==============================

    botName: "⚡ ZEPHYR X MD BOT",
    version: "3.0.0",

    ownerName: "👑 MRDIEHARD TECH",
    ownerNumber: process.env.OWNER_NUMBER || "27621834910",

    // Bot Status
    prefix: ".",
    mode: "private",
    timezone: "Asia/Karachi",

    // API KEYS
    giphyApiKey: process.env.GIPHY_API_KEY || "dc6zaTOxFJmzC",

    // Channel
    channel: {
        name: "AWAIS CYBER GANG",
        url: "https://whatsapp.com/channel/0029VbBzlMlIt5rzSeMBE922"
    },

    // Features Default
    features: {

        autoReact: true,
        autoRead: false,
        autoTyping: true,
        autoRecording: true,

        antiCall: true,
        antiDelete: true,
        antiLink: true,

        autoStatus: false,
        aiReply: false
    },


    // Messages
    messages: {

        online:
        `
╭━━━〔 ⚡ ZEPHYR MD BOT 〕━━━╮

✅ System Online
🚀 Multi Device Active
🛡️ Security Enabled

Powered By zephyr Gang
╰━━━━━━━━━━━━━━━━╯
        `,


        pair:
        `
🔐 Pairing System Started

⚡ Secure Connection
🤖 ZEPHYR MD Bot
        `,


        error:
        "❌ System Error Occurred"
    },


    // Security
    security: {

        sessionBackup: true,
        maxMessagesCache: 3000,
        reconnect: true,
        antiCrash: true
    },


    // Owner Commands
    ownerCommands: [
        "public",
        "private",
        "broadcast",
        "restart",
        "eval"
    ]

};