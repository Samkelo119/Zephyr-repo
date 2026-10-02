module.exports = {
    botName: "𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋",
    version: "3.0.0",
    ownerName: "MRDIEHARD TECH",
    ownerNumber: process.env.OWNER_NUMBER || "27621834910",
    prefix: ".",
    mode: "private",
    timezone: "Africa/Johannesburg",
    footer: "\n\n╭───────────────╮\n   ⚡ 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 ⚡\n╰───────────────╯",
    giphyApiKey: process.env.GIPHY_API_KEY || "dc6zaTOxFJmzC",
    channel: {
        name: "⚡ZᴇPʜʏʀ~Mᴅ⚡",
        url: "https://whatsapp.com/channel/0029Vb8p6DV8aKvNTp6n8n45"
    },
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
    messages: {
        online: "𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 is online.\nMulti device active.\nSecurity enabled.",
        pair: "𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 pairing started.\nSecure connection ready.",
        error: "System error occurred."
    },
    security: {
        sessionBackup: true,
        maxMessagesCache: 3000,
        reconnect: true,
        antiCrash: true
    },
    ownerCommands: [
        "public",
        "private",
        "broadcast",
        "restart",
        "eval"
    ]
};
