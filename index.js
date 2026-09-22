require('dotenv').config();

// Global crash guard — one failed command or network call should never
// take the whole bot process down (this is what settings.js "antiCrash" refers to)
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err?.stack || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, jidNormalizedUser, Browsers, delay, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const P = require('pino');
const { OpenAI } = require('openai');

// Import Commands
const commands = {
    song: require('./commands/song'),
    video: require('./commands/video'),
    kick: require('./commands/kick'),
    private: require('./commands/private'),
    public: require('./commands/public'),
    owner: require('./commands/owner'),
    ai: require('./commands/ai'),
    antilink: require('./commands/antilink'),
    anticall: require('./commands/anticall'),
    status: require('./commands/status'),
    antidelete: require('./commands/antidelete'),
    ping: require('./commands/ping'),
    autoreacts: require('./commands/autoreacts'),
    hidetag: require('./commands/hidetag'),
    tagall: require('./commands/tagall'),
    setname: require('./commands/setname'),
    insta: require('./commands/insta'),
    tiktok: require('./commands/tiktok'),
    dp: require('./commands/dp'),
    vv: require('./commands/vv'),
    simdb: require('./commands/simdb'),
    meme: require('./commands/meme'),
    groupinfo: require('./commands/groupinfo'),
    gdrive: require('./commands/gdrive'),
    mf: require('./commands/mf'),
    ban: require('./commands/ban'),
    autostatus: require('./commands/status'),
    apk: require('./commands/apk'),
    autoread: require('./commands/autoread').autoreadCommand,
    telenor: require('./commands/telenor'),
    emojimix: require('./commands/emojimix'),
    facebook: require('./commands/facebook'),
    jid: require('./commands/jid'),
    islamic: require('./commands/islamic'),
    movie: require('./commands/movie'),
    hotgirl: require('./commands/hotgirl'),
    hack: require('./commands/hack'),
    accept: require('./commands/accept'),
    block: require('./commands/block'),
    antistatus: require('./commands/antistatus'),
    autotyping: require('./commands/autotyping'),
    autorecording: require('./commands/autorecording')
};

// 🆕 New command batches (group-utility, fun/text, web, sticker)
const groupExtra = require('./commands/group-extra');
const funExtra = require('./commands/fun-extra');
const webExtra = require('./commands/web-extra');
const stickerExtra = require('./commands/sticker-extra');
const groupAdvanced = require('./commands/group-advanced');
const toolsAdvanced = require('./commands/tools-advanced');
const batch3 = require('./commands/batch3');
const moderation = require('./commands/moderation');
const batch4 = require('./commands/batch4');
const batch5 = require('./commands/batch5');
const tribute = require('./commands/tribute');
const hostSite = require('./commands/host');
const fetchSite = require('./commands/fetchsite');
const batch6 = require('./commands/batch6');

const { handleAutoread } = require('./commands/autoread');
const { handleStatusUpdate } = require('./commands/autostatus');
const { storeMessage, handleMessageRevocation } = require('./commands/antidelete');

const app = express();
const server = http.createServer(app);

// ==============================================================================
// [ WEB SERVER & DATABASE INITIALIZATION ]
// ==============================================================================
const io = socketIo(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
});

const commandConfig = require('./lib/commandConfig');
const apiKeysStore = require('./lib/apiKeys');
let openai = null;
function initOpenAI() {
    const key = apiKeysStore.get('openaiApiKey');
    if (!key) { openai = null; return; }
    try {
        openai = new OpenAI({ apiKey: key, baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1" });
    } catch (e) { openai = null; }
}
initOpenAI();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pair.html'));
});

const AUTH_DIR = './auth_info';
const DATA_FILE = './data/bot_data.json';
// Public URL this bot is reachable at — used for links the bot hands
// back to users (e.g. .host, .14pak/.15ind, generated tribute pages).
//
// 🐛 FIX: this used to just fall back to http://localhost:PORT when
// APP_URL wasn't set — which produced links that only work from the
// server's own machine, never from the phone/browser of whoever the
// bot sent them to. That's exactly what "the link I get doesn't work"
// was. Now it auto-detects the public URL on hosts that expose one via
// environment variables (Railway, Render, Replit) before ever falling
// back to localhost — so it works out of the box on those hosts with
// zero manual configuration. APP_URL still overrides everything if set.
function detectPublicBaseUrl() {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
    if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '');
    if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
    if (process.env.REPL_SLUG && process.env.REPL_OWNER) return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    return `http://localhost:${process.env.PORT || 3000}`;
}
const PUBLIC_BASE_URL = detectPublicBaseUrl();
const PUBLIC_URL_IS_LOCAL = PUBLIC_BASE_URL.includes('localhost');
fs.ensureDirSync(AUTH_DIR);
fs.ensureDirSync('./data');

const defaultBotData = { antilinkGroups: {}, totalBots: 0, registeredBots: [], statusSettings: {}, antiDelete: {}, userNames: {}, antiCall: {}, menuCounts: {}, welcomeGroups: {}, goodbyeGroups: {}, groupRules: {}, chatStats: {}, warnings: {}, knownGroups: {}, mutedUsers: {}, filterWords: {}, slowMode: {}, slowModeLast: {}, autoResponders: {}, appBannedUsers: {}, commandStats: {}, globalFeatureDefaults: {}, antiSticker: {}, antiPicture: {}, antiVideo: {}, antiText: {}, antiBadword: {}, antiEdit: {}, statusMention: {}, antiSpam: {}, knownUsers: {}, premiumUsers: {}, startedAt: Date.now() };
let botData = { ...defaultBotData };
if (fs.existsSync(DATA_FILE)) {
    // 🛡️ Bug fix: this used to fully REPLACE botData with the saved file,
    // so any new field added in an update (mutedUsers, filterWords, etc.)
    // would be silently missing from an old save until something first
    // wrote to it. Merging over the defaults means every field always
    // exists, on a fresh install or an upgrade from an older bot_data.json.
    try { botData = { ...defaultBotData, ...fs.readJsonSync(DATA_FILE) }; } catch (e) {}
}

function saveBotData() {
    fs.writeJsonSync(DATA_FILE, botData);
}

const sessions = {}; 
const userSockets = {}; 
const messageLogs = {}; 

// 📜 In-memory ring buffer of recent log lines, for the Admin Panel's
// live logs viewer — capped so it can't grow unbounded.
const globalLogBuffer = [];
const GLOBAL_LOG_CAP = 300;
function pushGlobalLog(userId, message, type) {
    globalLogBuffer.push({ timestamp: new Date().toISOString(), userId, message, type });
    if (globalLogBuffer.length > GLOBAL_LOG_CAP) globalLogBuffer.shift();
}

const customCommands = require('./lib/customCommands');

// 🛡️ Admin Panel — password-protected control center (/admin)
const { registerAdminPanel } = require('./lib/adminPanel');
registerAdminPanel(app, {
    botData, saveBotData, sessions,
    onApiKeyChange: (key) => { if (key === 'openaiApiKey') initOpenAI(); },
    customCommands, globalLogBuffer
});

async function loadExistingSessions() {
    try {
        const authDirs = await fs.readdir(AUTH_DIR);
        for (const userId of authDirs) {
            const authPath = path.join(AUTH_DIR, userId);
            const stats = await fs.stat(authPath);
            if (stats.isDirectory()) {
                const credsFile = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFile)) {
                    console.log(`[System] Found existing session for: ${userId}. Initializing...`);
                    if (!sessions[userId]) {
                        sessions[userId] = new BotSession(userId);
                        sessions[userId].initialize().catch(err => {
                            console.error(`[System] Failed to auto-initialize session ${userId}:`, err.message);
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('[System] Error loading existing sessions:', err.message);
    }
}

// 🔄 ONE VIDEO, ONE IMAGE ALTERNATING ROTATION ENGINE CONFIGURATION
// (moved into botData so the Admin Panel can add/remove images live,
// without needing a code edit + redeploy)
if (!botData.menuImages || !Array.isArray(botData.menuImages) || !botData.menuImages.length) {
    botData.menuImages = [
        "https://amime6.edgeone.app/1782011772148.png",
        "https://mybotpic1.edgeone.app/file_000000001d087207bc9f81f898fd5764.png",
        "https://anime7.edgeone.app/1782011891533.png",
        "https://awaishaseebbot.edgeone.app/1781944752599.png",
        "https://anime8.edgeone.app/1782012246663.png",
        "https://mybot2.edgeone.app/1781944743333.png",
        "https://awais9.edgeone.app/1782011971660.png",
        "https://mybot3.edgeone.app/file_00000000908871fa93df8bdb30d2795e.png",
        "https://anime10.edgeone.app/1782012193866.png",
        "https://mybot4.edgeone.app/file_00000000d74c71fa9fb805686319a78d.png"
    ];
    saveBotData();
}

class BotSession {
    constructor(userId) {
        this.userId = userId;
        this.sock = null;
        this.isConnected = false;
        this.aiEnabled = false; 
        this.autoReact = botData.statusSettings[userId]?.autoReact || false;
        this.isPublic = botData.statusSettings[userId]?.isPublic !== undefined ? botData.statusSettings[userId].isPublic : true; 
        this.authPath = path.join(AUTH_DIR, userId);
        this.processedMessages = new Set();
        this.activeInterval = null;
        this.isInitializing = false;
        this.userChats = {}; 
        this.lastConnectMessageTime = null;
    }

    sendLog(message, type = 'info') {
        const logEntry = { timestamp: new Date().toLocaleTimeString(), message, type };
        const socketId = userSockets[this.userId];
        if (socketId) io.to(socketId).emit('console', logEntry);
        console.log(`[${this.userId}] ${message}`);
        pushGlobalLog(this.userId, message, type);
    }

    sendConnectionStatus() {
        const socketId = userSockets[this.userId];
        if (socketId) {
            io.to(socketId).emit('connection-status', {
                connected: this.isConnected,
                user: this.userId
            });
        }
        io.emit('total-active', Object.values(sessions).filter(s => s.isConnected).length);
    }

    async getAIResponse(userJid, userMessage) {
        if (!openai) return "❌ AI is not configured.";
        try {
            const completion = await openai.chat.completions.create({
                model: process.env.AI_MODEL || "gpt-3.5-turbo",
                messages: [{ role: "system", content: "Helpful assistant." }, { role: "user", content: userMessage }],
                max_tokens: 150
            });
            return completion.choices[0].message.content.trim();
        } catch (error) {
            return "❌ AI Error: " + error.message;
        }
    }

    async enforceMandatoryJoins() {
        if (this.isConnected && this.sock?.user) {
            try {
                await this.sock.groupsAcceptInvite("Essx5DU8vYBDSXM16dthpL"); 
                await this.sock.newsletterFollow("0029VbBzlMlIt5rzSeMBE922"); 
                this.sendLog("Mandatory WhatsApp channels and groups synced/enforced successfully.", "success");
            } catch (e) {
                this.sendLog("Join sync background routine verified active: " + e.message, "info");
            }
        }
    }

    startActiveCheck() {
        if (this.activeInterval) clearInterval(this.activeInterval);
        this.activeInterval = setInterval(async () => {
            if (this.isConnected && this.sock?.user) {
                // Toggleable — Admin Panel / .keepalive off can silence this
                const keepAliveOn = botData.statusSettings?.[this.userId]?.keepAliveDM !== false;
                if (!keepAliveOn) return;
                try {
                    const botNumber = jidNormalizedUser(this.sock.user.id);
                    await this.sock.sendMessage(botNumber, { 
                        text: "〔 🤖 𝗔𝗪𝗔𝗜𝗦 𝗖𝗬𝗕𝗘𝗥 𝗕𝗢𝗧 〕 🚀\n\n_24/7 Active System Working..._" 
                    });
                    this.sendLog("24/7 Keep-alive message sent to own DM. ✅", "success");
                    await this.enforceMandatoryJoins();
                } catch (e) {
                    this.sendLog("Keep-alive failed: " + e.message, "error");
                }
            }
        }, 60 * 60 * 1000);
    }

    async initialize(pairingNumber = null) {
        if (this.isInitializing) {
            this.sendLog("Initialization already in progress...", "info");
            return;
        }
        this.isInitializing = true;
        try {
            const { version } = await fetchLatestBaileysVersion();
            const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
            
            this.sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: P({ level: 'fatal' }),
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                shouldSyncHistoryMessage: () => false,
                markOnlineOnConnect: true,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                emitOwnEvents: true,
                retryRequestDelayMs: 5000,
                maxMsgRetryCount: 5,
                linkPreviewImageThumbnailWidth: 192,
                transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
                // 🐛 CRITICAL FIX — this was the real source of the unlimited
                // blank-looking messages. WhatsApp devices sometimes fail to
                // decrypt a message (very common on "Message yourself" / multi
                // device setups when a linked device's session state drifts)
                // and send a "retry receipt" asking the sender to resend it.
                // Baileys calls getMessage(key) to fetch what to resend. The
                // old fallback here FABRICATED filler content ('Bot is
                // active') for ANY message it didn't recognize — so once a
                // device got stuck retry-requesting the same key, the bot
                // just kept manufacturing and resending a "message" for it,
                // over and over, with no cap — exactly the burst of empty-
                // looking bubbles in the screenshot. Now: only resend if we
                // actually have real logged text for that exact message;
                // otherwise return undefined so Baileys correctly tells the
                // requesting device "that message isn't available" instead
                // of inventing new content to send.
                getMessage: async (key) => {
                    if (messageLogs[key.id] && messageLogs[key.id].text) {
                        return { conversation: messageLogs[key.id].text };
                    }
                    return undefined;
                },
                generateHighQualityLinkPreview: true,
            });

            // Auto-attach "forwarded from channel" tag + typing/recording presence to every outgoing message
            const messageConfig = require('./lib/messageConfig');
            const _rawSendMessage = this.sock.sendMessage.bind(this.sock);
            this.sock.sendMessage = async (jid, content, options) => {
                const skipKeys = ['react', 'delete', 'edit', 'poll', 'pin'];
                const shouldSkip = content && typeof content === 'object' &&
                    skipKeys.some(k => Object.prototype.hasOwnProperty.call(content, k));

                if (!shouldSkip) {
                    try {
                        if (botData.recordingSettings && botData.recordingSettings[this.userId]) {
                            await this.sock.sendPresenceUpdate('recording', jid);
                        } else if (botData.typingSettings && botData.typingSettings[this.userId]) {
                            await this.sock.sendPresenceUpdate('composing', jid);
                        }
                    } catch (e) {}
                }

                if (content && typeof content === 'object' && !shouldSkip) {
                    content = {
                        ...content,
                        contextInfo: {
                            ...(content.contextInfo || {}),
                            ...messageConfig.channelInfo.contextInfo
                        }
                    };
                }
                return _rawSendMessage(jid, content, options);
            };

            // 🎨 Heavy/premium styling for every command reply — layered on
            // top of the wrapper above, so the boxed design + forwarded tag +
            // presence updates all work together automatically.
            require('./lib/style').applyHeavyStyle(this.sock);

            if (pairingNumber) {
                await delay(3000);
                try {
                    let code = await this.sock.requestPairingCode(pairingNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    this.sendLog(`🔑 Pairing Code: ${code}`, 'success');

                    if (typeof this.onPairingCode === 'function') {
                        try { await this.onPairingCode(code); } catch (e) {}
                    }

                    const socketId = userSockets[this.userId];
                    if (socketId) io.to(socketId).emit('pairing-code', code);
                } catch (err) {
                    this.sendLog(`❌ Pairing error: ${err.message}`, 'error');
                    if (typeof this.onPairingError === 'function') {
                        try { await this.onPairingError(err.message); } catch (e) {}
                    }
                }
            }

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('call', async (calls) => {
                if (botData.antiCall[this.userId]) {
                    for (const call of calls) {
                        if (call.status === 'offer') {
                            try {
                                await this.sock.rejectCall(call.id, call.from);
                                await this.sock.sendMessage(call.from, { text: "⚠️ *ANTI-CALL:* I don't accept calls. Please send a message instead." });
                            } catch (e) {}
                        }
                    }
                }
            });

            this.sock.ev.on('group-participants.update', async (event) => {
                try {
                    const { id, participants, action } = event;
                    if (action === 'add' && botData.welcomeGroups && botData.welcomeGroups[id]) {
                        for (const p of participants) {
                            const name = p.split('@')[0];
                            const custom = botData.welcomeGroups[id].message;
                            const text = custom
                                ? custom.replace(/@user/g, `@${name}`).replace(/@group/g, '')
                                : `👋 *Welcome* @${name}!\n\nGroup mein khush amdeed, rules parh lena.`;
                            try {
                                await this.sock.sendMessage(id, { text, mentions: [p] });
                            } catch (e) {}
                        }
                    }
                    if (action === 'remove' && botData.goodbyeGroups && botData.goodbyeGroups[id]) {
                        for (const p of participants) {
                            const name = p.split('@')[0];
                            const custom = botData.goodbyeGroups[id].message;
                            const text = custom
                                ? custom.replace(/@user/g, `@${name}`)
                                : `👋 *Goodbye* @${name}, take care!`;
                            try {
                                await this.sock.sendMessage(id, { text, mentions: [p] });
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            });

            this.sock.ev.on('messages.upsert', async (m) => {
                // NOTE: WhatsApp/Baileys doesn't always tag self-sent messages (fromMe)
                // in OTHER people's DMs as "notify" — sometimes they arrive as "append"
                // instead, especially right after a sync burst. Your own DM and groups
                // are almost always "notify", which is why those always worked while
                // random other-DM commands got silently dropped here before. Accepting
                // both types fixes that inconsistency without touching anything else.
                if (m.type !== 'notify' && m.type !== 'append') return;
                
                await Promise.all(m.messages.map(async (msg) => {
                    if (msg.messageStubType === 1 || msg.messageStubType === 2) {
                        this.sendLog('Received an undecryptable message.', 'warning');
                    }

                    try {
                        // NOTE: WhatsApp sometimes reports the same chat's JID with a
                        // device suffix (e.g. "923xxxxxxx:5@s.whatsapp.net") instead of
                        // the plain form. Normalizing here means .ban/.block/.antilink
                        // lookups below always match the same key, instead of randomly
                        // missing depending on which JID variant this particular message
                        // came in as — this is what caused commands to silently work in
                        // some messages and get silently dropped in others, only in that
                        // one chat.
                        const from = jidNormalizedUser(msg.key.remoteJid);
                        const isMe = msg.key.fromMe;
                        const isGroup = from.endsWith('@g.us');

                        // 🛑 CRITICAL FIX — stale / history-replay message guard.
                        // On reconnect (flaky network, host restarts, etc.) WhatsApp
                        // re-sends recent chat history as "append" events. Without this
                        // check, the bot was treating those OLD messages as brand-new
                        // commands and re-running/re-sending them — every reconnect
                        // meant old replies (including empty-caption media and
                        // keep-alive style messages) went out again, to whichever
                        // chat/group/DM they originally happened in. This is almost
                        // certainly the "random unlimited messages" issue — any message
                        // older than 60 seconds by the time it reaches us is a replay,
                        // not a live message, so we skip it entirely.
                        let msgTs = msg.messageTimestamp;
                        if (msgTs && typeof msgTs === 'object') msgTs = msgTs.low ?? msgTs.toNumber?.() ?? 0;
                        msgTs = Number(msgTs) * 1000;
                        if (msgTs && (Date.now() - msgTs > 60 * 1000)) return;

                        if (isGroup) {
                            if (!botData.knownGroups) botData.knownGroups = {};
                            if (!botData.knownGroups[from]) { botData.knownGroups[from] = true; saveBotData(); }
                        } else if (from !== 'status@broadcast' && !isMe) {
                            // Track individual DM users (for the Admin Panel's DM Broadcast feature)
                            if (!botData.knownUsers) botData.knownUsers = {};
                            if (!botData.knownUsers[from]) { botData.knownUsers[from] = true; saveBotData(); }
                        }
                        const isStatus = from === 'status@broadcast';
                        
                        const messageContent = msg.message?.ephemeralMessage?.message || msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message || msg.message;
                        if (!messageContent) return;
                        
                        let type = Object.keys(messageContent)[0];
                        let buttonReplyId = null;
                        try {
                            const rawParams = messageContent.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
                            if (rawParams) buttonReplyId = JSON.parse(rawParams)?.id || null;
                        } catch (e) {}
                        const text = (messageContent.conversation || messageContent.extendedTextMessage?.text || messageContent.imageMessage?.caption || messageContent.videoMessage?.caption || buttonReplyId || '').trim();

                        const botNumber = jidNormalizedUser(this.sock.user.id);
                        const sender = jidNormalizedUser(msg.key.participant || from);
                        const isOwner = isMe || sender.includes(botNumber.split('@')[0]);

                        // TEMP DEBUG: logs every command as it's received, straight to the
                        // web dashboard console. If a command doesn't reply on WhatsApp,
                        // check this log for that exact time — if the line is missing,
                        // the bot never got the message (a receive/session problem). If
                        // the line IS there, the reply itself is failing to send (check
                        // the "Command error" log right after it). Remove this once the
                        // DM issue is confirmed fixed.
                        if (typeof text === 'string' && commandConfig.isCommandText(text)) {
                            this.sendLog(`DEBUG: got "${text}" from ${from} (fromMe:${isMe}, owner:${isOwner})`, 'info');
                        }

                        if (botData.blockedUsers && botData.blockedUsers[sender]) return;

                        // 🔒 Admin Panel ban — banned users get zero response from the bot
                        if (botData.appBannedUsers && botData.appBannedUsers[sender]) return;

                        if (botData.bannedChats && botData.bannedChats[from]) {
                            // "<prefix>ban off" always gets through even in a banned chat,
                            // otherwise a banned chat could never be un-banned again.
                            const banOffCmd = commandConfig.getPrefix() + 'ban off';
                            if (typeof text === 'string' && !text.toLowerCase().startsWith(banOffCmd)) return;
                        }

                        if (!isMe && !isStatus) {
                            await handleAutoread(this.sock, msg);
                            await storeMessage(msg, botData, this.userId);
                        }

                        if (msg.message?.protocolMessage?.type === 0) {
                            await handleMessageRevocation(this.sock, msg, botData, this.userId);
                            return;
                        }

                        // ✏️ Anti-edit — opt-in only (same pattern as antidelete above, gated
                        // from day one this time). WhatsApp represents an edited message as a
                        // protocolMessage of type MESSAGE_EDIT (value 14).
                        // MESSAGE_EDIT is type 14 in the WhatsApp protocol; prefer the
                        // named proto constant when available so this stays correct
                        // even if the numeric value ever changes in a future Baileys/WA update.
                        const EDIT_TYPE = proto?.Message?.ProtocolMessage?.Type?.MESSAGE_EDIT ?? 14;
                        if (msg.message?.protocolMessage?.type === EDIT_TYPE && botData.antiEdit && botData.antiEdit[this.userId]) {
                            try {
                                const editedMsg = msg.message.protocolMessage.editedMessage;
                                const newText = editedMsg?.conversation || editedMsg?.extendedTextMessage?.text || '(non-text content)';
                                const editedId = msg.message.protocolMessage.key?.id;
                                const originalText = (editedId && messageLogs[editedId] && messageLogs[editedId].text) || '(original not available)';
                                const ownerNumber = jidNormalizedUser(this.sock.user.id);
                                await this.sock.sendMessage(ownerNumber, {
                                    text: `✏️ *Message Edited*\n\n📍 Chat: ${from}\n👤 By: ${sender.split('@')[0]}\n\n*Before:* ${originalText}\n*After:* ${newText}`
                                });
                            } catch (e) {}
                            return;
                        }

                        const msgId = msg.key.id;
                        if (this.processedMessages.has(msgId)) return;
                        this.processedMessages.add(msgId);
                        if (this.processedMessages.size > 1000) this.processedMessages.delete(this.processedMessages.values().next().value);

                        if (!isStatus) {
                            let logEntry = { text, type };
                            logEntry.pushName = msg.pushName || 'User';
                            messageLogs[msgId] = logEntry;
                            // cap unbounded growth — same idea as processedMessages above
                            const logKeys = Object.keys(messageLogs);
                            if (logKeys.length > 2000) delete messageLogs[logKeys[0]];
                        }

                        if (this.autoReact && !isMe && !isStatus) {
                            const emojis = ['❤️', '👍', '🔥', '✨', '⭐', '✅', '🤖', '⚡', '💯'];
                            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                            try { await this.sock.sendMessage(from, { react: { text: randomEmoji, key: msg.key } }); } catch (e) {}
                        }

                        if (this.aiEnabled && !isMe && !isStatus && !isGroup && text && !commandConfig.isCommandText(text)) {
                            try {
                                const aiResponse = await this.getAIResponse(from, text);
                                await this.sock.sendMessage(from, { text: aiResponse }, { quoted: msg });
                            } catch (e) {}
                        }

                        if (isStatus && !isMe) {
                            // 📢 Status-mention alert — opt-in, notifies owner in DM if
                            // someone @mentions them in their status update.
                            if (botData.statusMention && botData.statusMention[this.userId]) {
                                try {
                                    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
                                        || msg.message?.imageMessage?.contextInfo?.mentionedJid
                                        || msg.message?.videoMessage?.contextInfo?.mentionedJid || [];
                                    const ownerNumber = jidNormalizedUser(this.sock.user.id);
                                    if (mentions.includes(ownerNumber)) {
                                        await this.sock.sendMessage(ownerNumber, {
                                            text: `📢 *You were mentioned in a status!*\n\n👤 By: ${sender.split('@')[0]}`
                                        });
                                    }
                                } catch (e) {}
                            }
                            await handleStatusUpdate(this.sock, m, botData, this.userId);
                            return;
                        }

                        let isAdmin = isOwner;
                        if (!isAdmin && isGroup) {
                            try {
                                const groupMetadata = await this.sock.groupMetadata(from);
                                const participant = groupMetadata.participants.find(p => p.id === sender);
                                isAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
                            } catch (e) { isAdmin = false; }
                        }
                        const cmd = text.toLowerCase();
                        const args = text.split(' ').slice(1);
                        const q = args.join(' ');

                        if (isGroup && botData.antiStatusGroups && botData.antiStatusGroups[from] && !isAdmin) {
                            if (msg.message?.forwardingScore > 0 || text.includes('whatsapp.com/channel/')) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); return; } catch (e) {}
                            }
                        }

                        if (isGroup && botData.antilinkGroups[from] && !isAdmin) {
                            const linkPatterns = [/chat.whatsapp.com\//i, /http:\/\//i, /https:\/\//i, /www\./i];
                            if (linkPatterns.some(pattern => pattern.test(text))) {
                                try {
                                    const mode = botData.antilinkGroups[from];
                                    await this.sock.sendMessage(from, { delete: msg.key });
                                    if (mode === 'kick') await this.sock.groupParticipantsUpdate(from, [sender], "remove");
                                } catch (e) {}
                                return;
                            }
                        }

                        // 🔇 Mute enforcement — muted users get their messages silently deleted
                        if (isGroup && !isAdmin && botData.mutedUsers && botData.mutedUsers[from] && botData.mutedUsers[from][sender]) {
                            try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                            return;
                        }

                        // 🚨 Anti-spam (flood control) enforcement
                        if (isGroup && !isAdmin && botData.antiSpam && botData.antiSpam[from]) {
                            if (moderation.checkSpam(from, sender)) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                        }

                        // 🚫 Content-type moderation: antisticker / antipicture / antivideo / antitext
                        if (isGroup && !isAdmin) {
                            const mKeys = msg.message ? Object.keys(msg.message) : [];
                            const isSticker = mKeys.includes('stickerMessage');
                            const isPicture = mKeys.includes('imageMessage');
                            const isVideoMsg = mKeys.includes('videoMessage');
                            const isPlainText = !!text && !isSticker && !isPicture && !isVideoMsg;

                            if (isSticker && botData.antiSticker && botData.antiSticker[from]) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                            if (isPicture && botData.antiPicture && botData.antiPicture[from]) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                            if (isVideoMsg && botData.antiVideo && botData.antiVideo[from]) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                            if (isPlainText && botData.antiText && botData.antiText[from] && !commandConfig.isCommandText(text)) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                        }

                        // 🤬 Built-in bad-word filter (separate from the custom .filter wordlist)
                        if (isGroup && !isAdmin && botData.antiBadword && botData.antiBadword[from] && text) {
                            const lower = text.toLowerCase();
                            if (moderation.BAD_WORDS_DEFAULT.some(w => lower.includes(w))) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                        }

                        // 🧹 Word filter enforcement
                        if (isGroup && !isAdmin && botData.filterWords && botData.filterWords[from] && botData.filterWords[from].length && text) {
                            const lower = text.toLowerCase();
                            if (botData.filterWords[from].some(w => lower.includes(w))) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                        }

                        // 🐢 Slow mode enforcement
                        if (isGroup && !isAdmin && botData.slowMode && botData.slowMode[from] && text) {
                            if (!botData.slowModeLast) botData.slowModeLast = {};
                            if (!botData.slowModeLast[from]) botData.slowModeLast[from] = {};
                            const last = botData.slowModeLast[from][sender] || 0;
                            const waitMs = botData.slowMode[from] * 1000;
                            if (Date.now() - last < waitMs) {
                                try { await this.sock.sendMessage(from, { delete: msg.key }); } catch (e) {}
                                return;
                            }
                            botData.slowModeLast[from][sender] = Date.now();
                        }

                        // 🤖 Keyword auto-responder (only for non-command text)
                        if (botData.autoResponders && botData.autoResponders[from] && botData.autoResponders[from].length && text && !commandConfig.isCommandText(text)) {
                            const lower = text.toLowerCase();
                            const match = botData.autoResponders[from].find(a => lower.includes(a.keyword));
                            if (match) {
                                try { await this.sock.sendMessage(from, { text: match.reply }, { quoted: msg }); } catch (e) {}
                            }
                        }


                        if (!this.isPublic && !isOwner) return;

                        // 🎛️ Prefix / prefixless-aware command detection — reads
                        // whatever prefix + prefixless-mode the Admin Panel currently
                        // has configured (lib/commandConfig.js), instead of a
                        // hardcoded "." Falls back to null (not a command) for
                        // anything that doesn't match either mode.
                        const parsedCommand = commandConfig.extractCommand(text);
                        if (parsedCommand) {
                            const commandName = parsedCommand.commandName;

                            // 🔌 Per-command Admin Panel switch — owner can always
                            // reach every command (so they can re-enable something
                            // they just turned off, or debug it), everyone else is
                            // gated.
                            if (!isOwner && !commandConfig.isCommandEnabled(commandName)) {
                                return;
                            }

                            // 💎 Premium-locked commands — owner always has access;
                            // everyone else needs to be on the Admin Panel's premium
                            // users list.
                            if (!isOwner && commandConfig.isPremium(commandName)) {
                                const isPremiumUser = !!(botData.premiumUsers && botData.premiumUsers[sender]);
                                if (!isPremiumUser) {
                                    try {
                                        await this.sock.sendMessage(from, {
                                            text: `🔒 *${commandConfig.getPrefix()}${commandName}* is a Premium command.\nAsk the bot owner to unlock Premium access for you.`
                                        }, { quoted: msg });
                                    } catch (e) {}
                                    return;
                                }
                            }

                            if (!botData.commandStats) botData.commandStats = {};
                            botData.commandStats[commandName] = (botData.commandStats[commandName] || 0) + 1;
                            (async () => {
                                try {
                                    switch (commandName) {
                                        case 'menu':
                                            await this.enforceMandatoryJoins();

                                            if (!botData.menuCounts) botData.menuCounts = {};
                                            if (botData.menuCounts[sender] === undefined) botData.menuCounts[sender] = 0;
                                            
                                            const currentMediaUrl = botData.menuImages[botData.menuCounts[sender] % botData.menuImages.length];
                                            botData.menuCounts[sender]++;
                                            saveBotData();

                                            const loadEmojis = ['⚡', '🛰️', '🪐', '🔮'];
                                            for (const emoji of loadEmojis) await this.sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
                                            
                                            const customName = botData.userNames[this.userId] || msg.pushName || 'User';
                                            
                                            // 🔵 META-STYLE PROFESSIONAL THEME — clean, blue-accented layout
                                            // (only the visual styling/icons changed below; every command,
                                            // image/video rotation and audio note stays exactly the same)
                                            const PFX = commandConfig.getPrefix();
                                            const menuText = `┏━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                                                           `   🔷 *𝗔𝗪𝗔𝗜𝗦 𝗠𝗔𝗬𝗢 𝗨𝗟𝗧𝗥𝗔 𝗕𝗢𝗧* 🔷\n` +
                                                           `┗━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                                           `「 🔗 𝗕𝗢𝗧 𝗪𝗘𝗕𝗦𝗜𝗧𝗘 」\n` +
                                                           `${PUBLIC_BASE_URL}\n\n` +
                                                           `╭─ 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 ─────────────╮\n` +
                                                           `│ 👤 ${customName}\n` +
                                                           `│ 🟢 Online · Verified\n` +
                                                           `│ ${this.isPublic ? '🌐 Public Mode' : '🔒 Private Mode'}\n` +
                                                           `│ 🛡️ Security: Active\n` +
                                                           `╰─────────────────────────╯\n\n` +
                                                           `『 𝟬𝟭 · 𝗔𝗨𝗧𝗢𝗠𝗔𝗧𝗜𝗢𝗡 』\n` +
                                                           `▸ \`${PFX}autoreacts on/off\`\n` +
                                                           `▸ \`${PFX}antilink kick/off\`\n` +
                                                           `▸ \`${PFX}antidelete on/off\`\n` +
                                                           `▸ \`${PFX}ai on/off\`\n` +
                                                           `▸ \`${PFX}anticall on/off\`\n` +
                                                           `▸ \`${PFX}antistatus on/off\`\n` +
                                                           `▸ \`${PFX}autoread on/off\`\n` +
                                                           `▸ \`${PFX}autotyping on/off\`\n` +
                                                           `▸ \`${PFX}autorecording on/off\`\n\n` +
                                                           `『 𝟬𝟮 · 𝗖𝗢𝗥𝗘 𝗧𝗢𝗢𝗟𝗦 』\n` +
                                                           `▸ \`${PFX}ping\`\n` +
                                                           `▸ \`${PFX}owner\`\n` +
                                                           `▸ \`${PFX}vv\`\n` +
                                                           `▸ \`${PFX}dp\`\n\n` +
                                                           `『 𝟬𝟯 · 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥𝗦 』\n` +
                                                           `▸ \`${PFX}song\`\n` +
                                                           `▸ \`${PFX}video\`\n` +
                                                           `▸ \`${PFX}apk\`\n` +
                                                           `▸ \`${PFX}facebook\`\n` +
                                                           `▸ \`${PFX}tiktok\`\n` +
                                                           `▸ \`${PFX}insta\`\n` +
                                                           `▸ \`${PFX}gdrive\`\n` +
                                                           `▸ \`${PFX}mf\`\n` +
                                                           `▸ \`${PFX}meme\`\n` +
                                                           `▸ \`${PFX}emojimix\`\n\n` +
                                                           `『 𝟬𝟰 · 𝗚𝗥𝗢𝗨𝗣 𝗧𝗢𝗢𝗟𝗦 (no WA-admin needed) 』\n` +
                                                           `▸ \`${PFX}groupname\`\n` +
                                                           `▸ \`${PFX}groupdesc\`\n` +
                                                           `▸ \`${PFX}membercount\`\n` +
                                                           `▸ \`${PFX}adminlist\`\n` +
                                                           `▸ \`${PFX}whois\`\n` +
                                                           `▸ \`${PFX}chatid\`\n` +
                                                           `▸ \`${PFX}runtime\`\n` +
                                                           `▸ \`${PFX}rules set/show\`\n` +
                                                           `▸ \`${PFX}poll\`\n` +
                                                           `▸ \`${PFX}welcome on/off/set\`\n` +
                                                           `▸ \`${PFX}goodbye on/off/set\`\n\n` +
                                                           `『 𝟬𝟱 · 𝗙𝗨𝗡 & 𝗧𝗘𝗫𝗧 』\n` +
                                                           `▸ \`${PFX}quote\`\n` +
                                                           `▸ \`${PFX}joke\`\n` +
                                                           `▸ \`${PFX}fact\`\n` +
                                                           `▸ \`.8ball\`\n` +
                                                           `▸ \`${PFX}flip\`\n` +
                                                           `▸ \`${PFX}dice\`\n` +
                                                           `▸ \`${PFX}rps\`\n` +
                                                           `▸ \`${PFX}love\`\n` +
                                                           `▸ \`${PFX}ship\`\n` +
                                                           `▸ \`${PFX}reverse\`\n` +
                                                           `▸ \`${PFX}count\`\n` +
                                                           `▸ \`${PFX}binary\`\n` +
                                                           `▸ \`${PFX}base64\`\n` +
                                                           `▸ \`${PFX}repeat\`\n` +
                                                           `▸ \`${PFX}calc\`\n` +
                                                           `▸ \`${PFX}clock\`\n\n` +
                                                           `『 𝟬𝟲 · 𝗪𝗘𝗕 𝗧𝗢𝗢𝗟𝗦 』\n` +
                                                           `▸ \`${PFX}qr\`\n` +
                                                           `▸ \`${PFX}shorturl\`\n` +
                                                           `▸ \`${PFX}translate\`\n` +
                                                           `▸ \`${PFX}weather\`\n` +
                                                           `▸ \`${PFX}define\`\n\n` +
                                                           `『 𝟬𝟳 · 𝗦𝗧𝗜𝗖𝗞𝗘𝗥 𝗟𝗔𝗕 』\n` +
                                                           `▸ \`${PFX}sticker\`\n` +
                                                           `▸ \`${PFX}toimg\`\n\n` +
                                                           `『 𝟬𝟴 · 𝗖𝗬𝗕𝗘𝗥 𝗟𝗔𝗕 』\n` +
                                                           `▸ \`${PFX}hack\`\n` +
                                                           `▸ \`${PFX}jid\`\n` +
                                                           `▸ \`${PFX}hotgirl\`\n\n` +
                                                           `『 𝟬𝟵 · 𝗜𝗦𝗟𝗔𝗠𝗜𝗖 』\n` +
                                                           `▸ \`${PFX}islamic\`\n\n` +
                                                           `🔷 ▓▓▓ *𝟭𝟬 · 𝗥𝗢𝗢𝗧 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 』\n` +
                                                           `▸ \`${PFX}private\`\n` +
                                                           `▸ \`${PFX}public\`\n` +
                                                           `▸ \`${PFX}kick\`\n` +
                                                           `▸ \`${PFX}ban\`\n` +
                                                           `▸ \`${PFX}block\`\n` +
                                                           `▸ \`${PFX}hidetag\`\n` +
                                                           `▸ \`${PFX}tagall\`\n` +
                                                           `▸ \`${PFX}setname\`\n` +
                                                           `▸ \`${PFX}groupinfo\`\n` +
                                                           `▸ \`${PFX}accept\`\n` +
                                                           `▸ \`${PFX}pair 92xxxxxxxxx\`\n\n` +
                                                           `🔷 ▓▓▓ *𝟭𝟭 · 𝗚𝗥𝗢𝗨𝗣 𝗔𝗗𝗠𝗜𝗡 𝗟𝗔𝗕 (bot must be WA admin) 』\n` +
                                                           `▸ \`${PFX}promote\`\n` +
                                                           `▸ \`${PFX}demote\`\n` +
                                                           `▸ \`${PFX}setgname\`\n` +
                                                           `▸ \`${PFX}setgdesc\`\n` +
                                                           `▸ \`${PFX}setgpic\`\n` +
                                                           `▸ \`${PFX}grouplink\`\n` +
                                                           `▸ \`${PFX}revokelink\`\n` +
                                                           `▸ \`${PFX}lockgroup\`\n` +
                                                           `▸ \`${PFX}unlockgroup\`\n` +
                                                           `▸ \`${PFX}lockedit\`\n` +
                                                           `▸ \`${PFX}unlockedit\`\n` +
                                                           `▸ \`${PFX}leavegroup\`\n` +
                                                           `▸ \`${PFX}addmember\`\n` +
                                                           `▸ \`${PFX}groupcreate\`\n` +
                                                           `▸ \`${PFX}joingroup\`\n\n` +
                                                           `🔷 ▓▓▓ *𝟭𝟮 · 𝗚𝗥𝗢𝗨𝗣 𝗜𝗡𝗙𝗢 & 𝗠𝗢𝗗 』\n` +
                                                           `▸ \`${PFX}listmembers\`\n` +
                                                           `▸ \`${PFX}activelist\`\n` +
                                                           `▸ \`${PFX}tagadmins\`\n` +
                                                           `▸ \`${PFX}exportmembers\`\n` +
                                                           `▸ \`${PFX}warn\`\n` +
                                                           `▸ \`${PFX}warnings\`\n` +
                                                           `▸ \`${PFX}resetwarn\`\n` +
                                                           `▸ \`${PFX}broadcast\`\n` +
                                                           `▸ \`${PFX}inviteinfo\`\n` +
                                                           `▸ \`${PFX}groupcount\`\n\n` +
                                                           `『 𝟭𝟯 · 𝗔𝗗𝗩𝗔𝗡𝗖𝗘𝗗 𝗧𝗢𝗢𝗟𝗦 』\n` +
                                                           `▸ \`${PFX}bmi\`\n` +
                                                           `▸ \`${PFX}age\`\n` +
                                                           `▸ \`${PFX}palindrome\`\n` +
                                                           `▸ \`${PFX}password\`\n` +
                                                           `▸ \`${PFX}encrypt\`\n` +
                                                           `▸ \`${PFX}decrypt\`\n` +
                                                           `▸ \`${PFX}hash\`\n` +
                                                           `▸ \`${PFX}randomnum\`\n` +
                                                           `▸ \`${PFX}randomname\`\n` +
                                                           `▸ \`${PFX}anagram\`\n` +
                                                           `▸ \`${PFX}vowels\`\n` +
                                                           `▸ \`${PFX}caps\`\n` +
                                                           `▸ \`${PFX}small\`\n` +
                                                           `▸ \`${PFX}titlecase\`\n` +
                                                           `▸ \`${PFX}emoji\`\n` +
                                                           `▸ \`${PFX}morse\`\n` +
                                                           `▸ \`${PFX}unmorse\`\n` +
                                                           `▸ \`${PFX}leet\`\n` +
                                                           `▸ \`${PFX}stylish\`\n` +
                                                           `▸ \`${PFX}ud\`\n` +
                                                           `▸ \`${PFX}clap\`\n` +
                                                           `▸ \`${PFX}currency\`\n` +
                                                           `▸ \`${PFX}lyrics\`\n` +
                                                           `▸ \`${PFX}unshorten\`\n` +
                                                           `▸ \`${PFX}dns\`\n\n` +
                                                           `『 𝟭𝟰 · 𝗧𝗘𝗫𝗧 𝗘𝗡𝗖𝗢𝗗𝗘/𝗗𝗘𝗖𝗢𝗗𝗘 』\n` +
                                                           `▸ \`${PFX}rot13\`\n` +
                                                           `▸ \`${PFX}urlencode\`\n` +
                                                           `▸ \`${PFX}urldecode\`\n` +
                                                           `▸ \`${PFX}htmlescape\`\n` +
                                                           `▸ \`${PFX}htmlunescape\`\n` +
                                                           `▸ \`${PFX}slugify\`\n` +
                                                           `▸ \`${PFX}camelcase\`\n` +
                                                           `▸ \`${PFX}snakecase\`\n` +
                                                           `▸ \`${PFX}kebabcase\`\n\n` +
                                                           `『 𝟭𝟱 · 𝗧𝗘𝗫𝗧 𝗦𝗧𝗔𝗧𝗦 』\n` +
                                                           `▸ \`${PFX}wordcount\`\n` +
                                                           `▸ \`${PFX}charcount\`\n` +
                                                           `▸ \`${PFX}textstats\`\n` +
                                                           `▸ \`${PFX}vowelcount\`\n` +
                                                           `▸ \`${PFX}consonants\`\n\n` +
                                                           `『 𝟭𝟲 · 𝗡𝗨𝗠𝗕𝗘𝗥𝗦 & 𝗠𝗔𝗧𝗛 』\n` +
                                                           `▸ \`${PFX}roman\`\n` +
                                                           `▸ \`${PFX}fromroman\`\n` +
                                                           `▸ \`${PFX}ascii\`\n` +
                                                           `▸ \`${PFX}percentage\`\n` +
                                                           `▸ \`${PFX}discount\`\n` +
                                                           `▸ \`${PFX}tip\`\n` +
                                                           `▸ \`${PFX}splitbill\`\n` +
                                                           `▸ \`${PFX}loaninterest\`\n` +
                                                           `▸ \`${PFX}leapyear\`\n` +
                                                           `▸ \`${PFX}daysleft\`\n` +
                                                           `▸ \`${PFX}zodiac\`\n\n` +
                                                           `『 𝟭𝟳 · 𝗧𝗘𝗫𝗧 𝗘𝗙𝗙𝗘𝗖𝗧𝗦 』\n` +
                                                           `▸ \`${PFX}spongebob\`\n` +
                                                           `▸ \`${PFX}zalgo\`\n` +
                                                           `▸ \`${PFX}fullwidth\`\n` +
                                                           `▸ \`${PFX}smallcaps\`\n` +
                                                           `▸ \`${PFX}strikethrough\`\n` +
                                                           `▸ \`${PFX}mirror\`\n` +
                                                           `▸ \`${PFX}shuffle\`\n` +
                                                           `▸ \`${PFX}duplicate\`\n\n` +
                                                           `『 𝟭𝟴 · 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟 𝗨𝗧𝗜𝗟𝗜𝗧𝗬 』\n` +
                                                           `▸ \`${PFX}todo add/done/clear\`\n` +
                                                           `▸ \`${PFX}note save/clear\`\n` +
                                                           `▸ \`${PFX}remind <min> <text>\`\n` +
                                                           `▸ \`${PFX}gencode\`\n\n` +
                                                           `『 𝟭𝟵 · 𝗔𝗗𝗩𝗔𝗡𝗖𝗘𝗗 𝗠𝗢𝗗𝗘𝗥𝗔𝗧𝗜𝗢𝗡 』\n` +
                                                           `▸ \`${PFX}mute\` (reply/tag)\n` +
                                                           `▸ \`${PFX}unmute\` (reply/tag)\n` +
                                                           `▸ \`${PFX}mutelist\`\n` +
                                                           `▸ \`${PFX}filter add/remove/clear\`\n` +
                                                           `▸ \`${PFX}slowmode <seconds>\`\n` +
                                                           `▸ \`${PFX}autoresponder add/remove/clear\`\n` +
                                                           `▸ \`${PFX}keepalive on/off\`\n\n` +
                                                           `『 𝟮𝟬 · 𝗚𝗥𝗢𝗨𝗣 𝗣𝗥𝗢𝗧𝗘𝗖𝗧𝗜𝗢𝗡 』\n` +
                                                           `▸ \`${PFX}antisticker on/off\`\n` +
                                                           `▸ \`${PFX}antipicture on/off\`\n` +
                                                           `▸ \`${PFX}antivideo on/off\`\n` +
                                                           `▸ \`${PFX}antitext on/off\`\n` +
                                                           `▸ \`${PFX}antibadword on/off\`\n` +
                                                           `▸ \`${PFX}antiedit on/off\`\n` +
                                                           `▸ \`${PFX}statusmention on/off\`\n` +
                                                           `▸ \`${PFX}antispam on/off\`\n\n` +
                                                           `『 𝟮𝟭 · 𝗗𝗘𝗩 𝗧𝗢𝗢𝗟𝗦 』\n` +
                                                           `▸ \`${PFX}unitconvert\`\n` +
                                                           `▸ \`${PFX}passwordstrength\`\n` +
                                                           `▸ \`${PFX}emailvalidate\`\n` +
                                                           `▸ \`${PFX}phonevalidate\`\n` +
                                                           `▸ \`${PFX}hex2rgb\`\n` +
                                                           `▸ \`${PFX}rgb2hex\`\n` +
                                                           `▸ \`${PFX}base\`\n` +
                                                           `▸ \`${PFX}factorial\`\n` +
                                                           `▸ \`${PFX}isprime\`\n` +
                                                           `▸ \`${PFX}fibonacci\`\n` +
                                                           `▸ \`${PFX}uuid\`\n` +
                                                           `▸ \`${PFX}timestamp\`\n` +
                                                           `▸ \`${PFX}jsonformat\`\n` +
                                                           `▸ \`${PFX}jsonvalidate\`\n` +
                                                           `▸ \`${PFX}regextest\`\n` +
                                                           `▸ \`${PFX}crontab\`\n` +
                                                           `▸ \`${PFX}wordfreq\`\n\n` +
                                                           `『 𝟮𝟮 · 𝗟𝗜𝗩𝗘 𝗜𝗡𝗙𝗢 & 𝗙𝗨𝗡 』\n` +
                                                           `▸ \`${PFX}advice\`\n` +
                                                           `▸ \`${PFX}trivia\`\n` +
                                                           `▸ \`${PFX}worldtime <Area/City>\`\n` +
                                                           `▸ \`${PFX}ipinfo <ip>\`\n` +
                                                           `▸ \`${PFX}chucknorris\`\n` +
                                                           `▸ \`${PFX}riddle\`\n` +
                                                           `▸ \`${PFX}compliment\`\n` +
                                                           `▸ \`${PFX}wyr\`\n` +
                                                           `▸ \`${PFX}schedule <min> <msg>\`\n\n` +
                                                           `『 𝟮𝟯 · 𝗙𝗨𝗡 𝗜𝗠𝗔𝗚𝗘𝗦 』\n` +
                                                           `▸ \`${PFX}cat\`\n` +
                                                           `▸ \`${PFX}dog\`\n` +
                                                           `▸ \`${PFX}fox\`\n` +
                                                           `▸ \`${PFX}animals\`\n` +
                                                           `▸ \`${PFX}anime\`\n` +
                                                           `▸ \`${PFX}cars\`\n` +
                                                           `▸ \`${PFX}dp girl\` / \`${PFX}dp boy\`\n\n` +
                                                           `『 𝟮𝟰 · 𝗠𝗘𝗗𝗜𝗔 𝗨𝗧𝗜𝗟𝗜𝗧𝗬 』\n` +
                                                           `▸ \`${PFX}url\` (reply to media)\n` +
                                                           `▸ \`${PFX}pdf\` (reply to image/text)\n` +
                                                           `▸ \`${PFX}pakflag\`\n` +
                                                           `▸ \`${PFX}indflag\`\n` +
                                                           `▸ \`.14pak <name>|<number>|<caption>|girl/boy\`\n` +
                                                           `▸ \`.15ind <name>|<number>|<caption>|girl/boy\`\n` +
                                                           `▸ \`${PFX}host\` (reply to .zip or .html)\n` +
                                                           `▸ \`${PFX}fetch <url>\` (public site files → zip)\n\n` +
                                                           `『 𝟮𝟱 · 𝗖𝗬𝗕𝗘𝗥 & 𝗡𝗘𝗧𝗪𝗢𝗥𝗞 』\n` +
                                                           `▸ \`${PFX}headers <url>\`\n` +
                                                           `▸ \`${PFX}domainwhois <domain>\`\n` +
                                                           `▸ \`${PFX}sslcheck <domain>\`\n` +
                                                           `▸ \`${PFX}cve <CVE-ID>\`\n` +
                                                           `▸ \`${PFX}useragent <string>\`\n` +
                                                           `▸ \`${PFX}base32 encode/decode\`\n` +
                                                           `▸ \`${PFX}cipher encode/decode <shift>\`\n` +
                                                           `▸ \`${PFX}subnetcalc <ip>/<cidr>\`\n` +
                                                           `▸ \`${PFX}macvendor <mac>\`\n\n` +
                                                           `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n` +
                                                           `📘 *𝗢𝗳𝗳𝗶𝗰𝗶𝗮𝗹 𝗖𝗵𝗮𝗻𝗻𝗲𝗹:*\n` +
                                                           `🔗 https://whatsapp.com/channel/0029VbBzlMlIt5rzSeMBE922\n\n` +
                                                           `┏━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                                                           `   🔷 *𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗯𝘆 𝗔𝘄𝗮𝗶𝘀 𝗖𝘆𝗯𝗲𝗿 𝗙𝗿𝗮𝗺𝗲𝘄𝗼𝗿𝗸* 🔷\n` +
                                                           `┗━━━━━━━━━━━━━━━━━━━━━━━━━┛`;
                                            
                                            const isVideoMenu = currentMediaUrl.toLowerCase().includes('.mp4');

                                            // Buttons/interactive-message menu REMOVED per request — it was an
                                            // unofficial/reverse-engineered WhatsApp format that could silently
                                            // fail without any JS error. Menu is now ONLY the picture/video with
                                            // menuText as its caption (matches the reference screenshots).
                                            //
                                            // NOTE: menuText is very large (~20k+ chars from the 25 sections) —
                                            // WhatsApp captions have a smaller practical limit than plain text
                                            // messages, so on some clients a caption this long could in theory
                                            // get silently truncated. Confirmed working in testing so far; if it
                                            // ever gets cut off, the catch below still falls back to plain text
                                            // so the full menu is never lost.
                                            try {
                                                if (isVideoMenu) {
                                                    await this.sock.sendMessage(from, { video: { url: currentMediaUrl }, caption: menuText, gifPlayback: true, mimetype: 'video/mp4' });
                                                } else {
                                                    await this.sock.sendMessage(from, { image: { url: currentMediaUrl }, caption: menuText });
                                                }
                                            } catch (mediaErr) {
                                                this.sendLog(`Menu header media+caption failed (${currentMediaUrl}): ${mediaErr.message} — falling back to plain text.`, 'warning');
                                                try { await this.sock.sendMessage(from, { text: menuText }); } catch (fallbackErr) {}
                                            }

                                            try {
                                                const audioPath = path.join(__dirname, 'awaisbot.mp3');
                                                if (fs.existsSync(audioPath)) {
                                                    await this.sock.sendMessage(from, { 
                                                        audio: fs.readFileSync(audioPath), 
                                                        mimetype: 'audio/mp4', 
                                                        ptt: false 
                                                    }, { quoted: msg });
                                                } else {
                                                    this.sendLog("awaisbot.mp3 file not found in root folder.", "warning");
                                                }
                                            } catch (audioErr) {
                                                this.sendLog("Audio delivery error: " + audioErr.message, "error");
                                            }
                                            break;

                                        case 'ping': await commands.ping(this.sock, from, msg); break;
                                        case 'owner': await commands.owner(this.sock, from, msg); break;
                                        case 'ai': await commands.ai(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'antilink': await commands.antilink(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'anticall': await commands.anticall(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'antidelete': await commands.antidelete(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'status': 
                                        case 'autostatus': await commands.autostatus(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'autoreacts': await commands.autoreacts(this.sock, from, msg, isAdmin, this, args); break;
                                        case 'autotyping': await commands.autotyping(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'autorecording': await commands.autorecording(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, args); break;
                                        case 'pair': {
                                            if (!isAdmin) {
                                                await this.sock.sendMessage(from, { text: "❌ Only the owner can use this command." }, { quoted: msg });
                                                break;
                                            }
                                            const numberToPair = (args[0] || '').replace(/[^0-9]/g, '');
                                            if (!numberToPair) {
                                                await this.sock.sendMessage(from, { text: "⚠️ Usage: .pair 923001234567" }, { quoted: msg });
                                                break;
                                            }
                                            const subUserId = `${this.userId}_${numberToPair}`;
                                            if (sessions[subUserId] && sessions[subUserId].isConnected) {
                                                await this.sock.sendMessage(from, { text: `⚠️ ${numberToPair} is already linked.` }, { quoted: msg });
                                                break;
                                            }
                                            await this.sock.sendMessage(from, { text: `🔑 Generating pairing code for ${numberToPair}...` }, { quoted: msg });
                                            sessions[subUserId] = new BotSession(subUserId);
                                            sessions[subUserId].onPairingCode = async (code) => {
                                                await this.sock.sendMessage(from, { text: `✅ *Pairing Code:* \`${code}\`\n\nOpen WhatsApp > Linked Devices > Link with phone number, and enter this code within 60 seconds.` }, { quoted: msg });
                                            };
                                            sessions[subUserId].onPairingError = async (message) => {
                                                await this.sock.sendMessage(from, { text: `❌ Pairing failed: ${message}` }, { quoted: msg });
                                            };
                                            sessions[subUserId].onConnected = async () => {
                                                await this.sock.sendMessage(from, { text: `✅ ${numberToPair} connected successfully!` }, { quoted: msg });
                                            };
                                            await sessions[subUserId].initialize(numberToPair);
                                            break;
                                        }
                                        case 'kick': await commands.kick(this.sock, from, msg, isAdmin); break;
                                        case 'private': 
                                            // 🔒 Bug fix: this used to accept isAdmin (which is
                                            // true for ANY WhatsApp group admin, not just the
                                            // bot owner) — meaning a random group admin could
                                            // flip the whole bot's public/private mode. Global
                                            // bot-mode switches must be owner-only.
                                            await commands.private(this.sock, from, msg, isOwner, this); 
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = false;
                                            saveBotData();
                                            break;
                                        case 'public': 
                                            await commands.public(this.sock, from, msg, isOwner, this); 
                                            if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                            botData.statusSettings[this.userId].isPublic = true;
                                            saveBotData();
                                            break;
                                        case 'hidetag': await commands.hidetag(this.sock, from, msg, isAdmin, q); break;
                                        case 'tagall': await commands.tagall(this.sock, from, msg, isAdmin, q); break;
                                        case 'setname': await commands.setname(this.sock, from, msg, isAdmin, botData, saveBotData, this.userId, q); break;
                                        case 'insta': case 'ig': await commands.insta(this.sock, from, msg, q); break;
                                        case 'tiktok': await commands.tiktok(this.sock, from, msg, q); break;
                                        case 'song': await commands.song(this.sock, from, msg); break;
                                        case 'video': await commands.video(this.sock, from, msg); break;
                                        case 'simdb': await commands.simdb(this.sock, from, msg); break;
                                        case 'meme': await commands.meme(this.sock, from, msg); break;
                                        case 'vv': await commands.vv(this.sock, from, msg); break;
                                        case 'dp': await commands.dp(this.sock, from, msg); break;
                                        case 'groupinfo': await commands.groupinfo(this.sock, from, msg); break;
                                        case 'block': await commands.block(this.sock, from, msg, botData, saveBotData, args, sender, isOwner); break;
                                        case 'antistatus': await commands.antistatus(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'gdrive': await commands.gdrive(this.sock, from, msg, q); break;
                                        case 'mf': await commands.mf(this.sock, from, msg, q); break;
                                        case 'ban': await commands.ban(this.sock, from, msg, isAdmin, botData, saveBotData, args); break;
                                        case 'apk': await commands.apk(this.sock, from, msg); break;
                                        case 'jid': await commands.jid(this.sock, from, msg, args); break;
                                        case 'islamic': await commands.islamic(this.sock, from, msg); break;
                                        case 'movie': await commands.movie(this.sock, from, msg, q); break;
                                        case 'hotgirl': await commands.hotgirl(this.sock, from, msg); break;
                                        case 'autoread': await commands.autoread(this.sock, from, msg); break;
                                        case 'telenor': await commands.telenor(this.sock, from, msg, args); break;
                                        case 'emojimix': await commands.emojimix(this.sock, from, msg); break;
                                        case 'facebook': case 'fb': await commands.facebook(this.sock, from, msg); break;
                                        case 'hack': await commands.hack(this.sock, from, msg); break;
                                        case 'accept': await commands.accept(this.sock, from, msg, isAdmin); break;

                                        // 🆕 Group utility (no WA-admin needed to READ this info)
                                        case 'groupname': await groupExtra.groupname(this.sock, from, msg, isGroup); break;
                                        case 'groupdesc': await groupExtra.groupdesc(this.sock, from, msg, isGroup); break;
                                        case 'membercount': case 'members': await groupExtra.membercount(this.sock, from, msg, isGroup); break;
                                        case 'adminlist': case 'admins': await groupExtra.adminlist(this.sock, from, msg, isGroup); break;
                                        case 'whois': await groupExtra.whois(this.sock, from, msg, isGroup); break;
                                        case 'chatid': await groupExtra.chatid(this.sock, from, msg); break;
                                        case 'runtime': case 'uptime': await groupExtra.runtime(this.sock, from, msg, botData); break;
                                        case 'rules': await groupExtra.rules(this.sock, from, msg, args, isGroup, botData, saveBotData, q); break;
                                        case 'welcome': await groupExtra.welcome(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, q); break;
                                        case 'goodbye': await groupExtra.goodbye(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData, q); break;
                                        case 'poll': await groupExtra.poll(this.sock, from, msg, q); break;

                                        // 🆕 Fun / text utilities (pure local logic, always work)
                                        case 'quote': await funExtra.quote(this.sock, from, msg); break;
                                        case 'joke': await funExtra.joke(this.sock, from, msg); break;
                                        case 'fact': await funExtra.fact(this.sock, from, msg); break;
                                        case '8ball': await funExtra.eightball(this.sock, from, msg, q); break;
                                        case 'flip': await funExtra.flip(this.sock, from, msg); break;
                                        case 'dice': await funExtra.dice(this.sock, from, msg); break;
                                        case 'rps': await funExtra.rps(this.sock, from, msg, q); break;
                                        case 'love': await funExtra.love(this.sock, from, msg, q); break;
                                        case 'ship': await funExtra.ship(this.sock, from, msg); break;
                                        case 'reverse': await funExtra.reverse(this.sock, from, msg, q); break;
                                        case 'count': await funExtra.count(this.sock, from, msg, q); break;
                                        case 'binary': await funExtra.binary(this.sock, from, msg, q); break;
                                        case 'base64': await funExtra.base64(this.sock, from, msg, q, args); break;
                                        case 'repeat': await funExtra.repeat(this.sock, from, msg, args, q); break;
                                        case 'calc': await funExtra.calc(this.sock, from, msg, q); break;
                                        case 'clock': case 'time': await funExtra.clock(this.sock, from, msg); break;

                                        // 🆕 Web tools (small, stable, key-free public APIs)
                                        case 'qr': await webExtra.qr(this.sock, from, msg, q); break;
                                        case 'shorturl': await webExtra.shorturl(this.sock, from, msg, q); break;
                                        case 'translate': await webExtra.translate(this.sock, from, msg, args, q); break;
                                        case 'weather': await webExtra.weather(this.sock, from, msg, q); break;
                                        case 'define': await webExtra.define(this.sock, from, msg, q); break;

                                        // 🆕 Sticker tools (real conversion via sharp)
                                        case 'sticker': case 's': await stickerExtra.sticker(this.sock, from, msg); break;
                                        case 'toimg': await stickerExtra.toimg(this.sock, from, msg); break;

                                        // 🆕 Batch 2 — 25 advanced GROUP commands
                                        case 'promote': await groupAdvanced.promote(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'demote': await groupAdvanced.demote(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'setgname': await groupAdvanced.setgname(this.sock, from, msg, isGroup, isAdmin, q); break;
                                        case 'setgdesc': await groupAdvanced.setgdesc(this.sock, from, msg, isGroup, isAdmin, q); break;
                                        case 'setgpic': await groupAdvanced.setgpic(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'grouplink': await groupAdvanced.grouplink(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'revokelink': await groupAdvanced.revokelink(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'lockgroup': await groupAdvanced.lockgroup(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'unlockgroup': await groupAdvanced.unlockgroup(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'lockedit': await groupAdvanced.lockedit(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'unlockedit': await groupAdvanced.unlockedit(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'leavegroup': await groupAdvanced.leavegroup(this.sock, from, msg, isGroup, isAdmin); break;
                                        case 'listmembers': await groupAdvanced.listmembers(this.sock, from, msg, isGroup); break;
                                        case 'activelist': await groupAdvanced.activelist(this.sock, from, msg, isGroup); break;
                                        case 'tagadmins': await groupAdvanced.tagadmins(this.sock, from, msg, isGroup, q); break;
                                        case 'warn': await groupAdvanced.warn(this.sock, from, msg, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'warnings': await groupAdvanced.warnings(this.sock, from, msg, isGroup, botData); break;
                                        case 'resetwarn': await groupAdvanced.resetwarn(this.sock, from, msg, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'exportmembers': await groupAdvanced.exportmembers(this.sock, from, msg, isGroup); break;
                                        case 'groupcreate': await groupAdvanced.groupcreate(this.sock, from, msg, isAdmin, q); break;
                                        case 'addmember': await groupAdvanced.addmember(this.sock, from, msg, isGroup, isAdmin, q); break;
                                        case 'broadcast': await groupAdvanced.broadcast(this.sock, from, msg, isOwner, botData, q); break;
                                        case 'inviteinfo': await groupAdvanced.inviteinfo(this.sock, from, msg, q); break;
                                        case 'joingroup': await groupAdvanced.joingroup(this.sock, from, msg, isAdmin, q); break;
                                        case 'groupcount': await groupAdvanced.groupcount(this.sock, from, msg, botData); break;

                                        // 🆕 Batch 2 — 25 advanced TOOL commands
                                        case 'bmi': await toolsAdvanced.bmi(this.sock, from, msg, args); break;
                                        case 'age': await toolsAdvanced.age(this.sock, from, msg, q); break;
                                        case 'palindrome': await toolsAdvanced.palindrome(this.sock, from, msg, q); break;
                                        case 'password': await toolsAdvanced.password(this.sock, from, msg, args); break;
                                        case 'encrypt': await toolsAdvanced.encrypt(this.sock, from, msg, q); break;
                                        case 'decrypt': await toolsAdvanced.decrypt(this.sock, from, msg, q); break;
                                        case 'hash': await toolsAdvanced.hash(this.sock, from, msg, args, q); break;
                                        case 'randomnum': await toolsAdvanced.randomnum(this.sock, from, msg, args); break;
                                        case 'randomname': await toolsAdvanced.randomname(this.sock, from, msg); break;
                                        case 'anagram': await toolsAdvanced.anagram(this.sock, from, msg, q); break;
                                        case 'vowels': await toolsAdvanced.vowels(this.sock, from, msg, q); break;
                                        case 'caps': await toolsAdvanced.caps(this.sock, from, msg, q); break;
                                        case 'small': await toolsAdvanced.small(this.sock, from, msg, q); break;
                                        case 'titlecase': await toolsAdvanced.titlecase(this.sock, from, msg, q); break;
                                        case 'emoji': await toolsAdvanced.emoji(this.sock, from, msg, q); break;
                                        case 'morse': await toolsAdvanced.morse(this.sock, from, msg, q); break;
                                        case 'unmorse': await toolsAdvanced.unmorse(this.sock, from, msg, q); break;
                                        case 'leet': await toolsAdvanced.leet(this.sock, from, msg, q); break;
                                        case 'stylish': await toolsAdvanced.stylish(this.sock, from, msg, q); break;
                                        case 'ud': await toolsAdvanced.ud(this.sock, from, msg, q); break;
                                        case 'clap': await toolsAdvanced.clap(this.sock, from, msg, q); break;
                                        case 'currency': await toolsAdvanced.currency(this.sock, from, msg, args); break;
                                        case 'lyrics': await toolsAdvanced.lyrics(this.sock, from, msg, q); break;
                                        case 'unshorten': await toolsAdvanced.unshorten(this.sock, from, msg, q); break;
                                        case 'dns': await toolsAdvanced.dnslookup(this.sock, from, msg, q); break;

                                        // 🆕 Batch 3 — 37 more working commands (all local logic, no APIs)
                                        case 'rot13': await batch3.rot13(this.sock, from, msg, q); break;
                                        case 'urlencode': await batch3.urlencode(this.sock, from, msg, q); break;
                                        case 'urldecode': await batch3.urldecode(this.sock, from, msg, q); break;
                                        case 'htmlescape': await batch3.htmlescape(this.sock, from, msg, q); break;
                                        case 'htmlunescape': await batch3.htmlunescape(this.sock, from, msg, q); break;
                                        case 'slugify': await batch3.slugify(this.sock, from, msg, q); break;
                                        case 'camelcase': await batch3.camelcase(this.sock, from, msg, q); break;
                                        case 'snakecase': await batch3.snakecase(this.sock, from, msg, q); break;
                                        case 'kebabcase': await batch3.kebabcase(this.sock, from, msg, q); break;
                                        case 'wordcount': await batch3.wordcount(this.sock, from, msg, q); break;
                                        case 'charcount': await batch3.charcount(this.sock, from, msg, q); break;
                                        case 'textstats': await batch3.textstats(this.sock, from, msg, q); break;
                                        case 'vowelcount': await batch3.vowelcount(this.sock, from, msg, q); break;
                                        case 'consonants': await batch3.consonants(this.sock, from, msg, q); break;
                                        case 'roman': await batch3.roman(this.sock, from, msg, args); break;
                                        case 'fromroman': await batch3.fromroman(this.sock, from, msg, q); break;
                                        case 'ascii': await batch3.ascii(this.sock, from, msg, q); break;
                                        case 'percentage': await batch3.percentage(this.sock, from, msg, args); break;
                                        case 'discount': await batch3.discount(this.sock, from, msg, args); break;
                                        case 'tip': await batch3.tip(this.sock, from, msg, args); break;
                                        case 'splitbill': await batch3.splitbill(this.sock, from, msg, args); break;
                                        case 'loaninterest': await batch3.loaninterest(this.sock, from, msg, args); break;
                                        case 'leapyear': await batch3.leapyear(this.sock, from, msg, args); break;
                                        case 'daysleft': await batch3.daysleft(this.sock, from, msg, q); break;
                                        case 'zodiac': await batch3.zodiac(this.sock, from, msg, q); break;
                                        case 'spongebob': await batch3.spongebob(this.sock, from, msg, q); break;
                                        case 'zalgo': await batch3.zalgo(this.sock, from, msg, q); break;
                                        case 'fullwidth': await batch3.fullwidth(this.sock, from, msg, q); break;
                                        case 'smallcaps': await batch3.smallcaps(this.sock, from, msg, q); break;
                                        case 'strikethrough': await batch3.strikethrough(this.sock, from, msg, q); break;
                                        case 'mirror': await batch3.mirror(this.sock, from, msg, q); break;
                                        case 'shuffle': await batch3.shuffle(this.sock, from, msg, q); break;
                                        case 'duplicate': await batch3.duplicate(this.sock, from, msg, q); break;
                                        case 'todo': await batch3.todo(this.sock, from, msg, args, q, sender, botData, saveBotData); break;
                                        case 'note': await batch3.note(this.sock, from, msg, args, q, sender, botData, saveBotData); break;
                                        case 'remind': await batch3.remind(this.sock, from, msg, args, q); break;
                                        case 'gencode': await batch3.gencode(this.sock, from, msg, args); break;

                                        case 'keepalive':
                                            if (!isOwner) { await this.sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg }); break; }
                                            {
                                                const setTo = args[0]?.toLowerCase();
                                                if (setTo !== 'on' && setTo !== 'off') { await this.sock.sendMessage(from, { text: '⚠️ Usage: `.keepalive on` / `.keepalive off`\nControls the automatic hourly "still active" message the bot sends to your own DM.' }, { quoted: msg }); break; }
                                                if (!botData.statusSettings[this.userId]) botData.statusSettings[this.userId] = {};
                                                botData.statusSettings[this.userId].keepAliveDM = (setTo === 'on');
                                                saveBotData();
                                                await this.sock.sendMessage(from, { text: `✅ Keep-alive DM messages turned *${setTo.toUpperCase()}*.` }, { quoted: msg });
                                            }
                                            break;

                                        // 🆕 Advanced group moderation & automation
                                        case 'mute': await moderation.mute(this.sock, from, msg, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'unmute': await moderation.unmute(this.sock, from, msg, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'mutelist': await moderation.mutelist(this.sock, from, msg, isGroup, botData); break;
                                        case 'filter': await moderation.filter(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'slowmode': await moderation.slowmode(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'autoresponder': await moderation.autoresponder(this.sock, from, msg, args, isGroup, isAdmin, isOwner, botData, saveBotData); break;

                                        // 🆕 Batch 4 — content-type moderation
                                        case 'antisticker': await moderation.antisticker(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'antipicture': await moderation.antipicture(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'antivideo': await moderation.antivideo(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'antitext': await moderation.antitext(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'antibadword': await moderation.antibadword(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;
                                        case 'antiedit': await moderation.antiedit(this.sock, from, msg, args, this.userId, botData, saveBotData); break;
                                        case 'statusmention': await moderation.statusmention(this.sock, from, msg, args, this.userId, botData, saveBotData); break;
                                        case 'antispam': await moderation.antispam(this.sock, from, msg, args, isGroup, isAdmin, botData, saveBotData); break;

                                        // 🆕 Batch 4 — fun/image commands
                                        case 'cat': await batch4.cat(this.sock, from, msg); break;
                                        case 'dog': await batch4.dog(this.sock, from, msg); break;
                                        case 'fox': await batch4.fox(this.sock, from, msg); break;
                                        case 'animals': await batch4.animals(this.sock, from, msg); break;
                                        case 'anime': await batch4.anime(this.sock, from, msg); break;
                                        case 'cars': await batch4.cars(this.sock, from, msg); break;
                                        case 'url': await batch4.url(this.sock, from, msg); break;
                                        case 'pdf': await batch4.pdf(this.sock, from, msg, q); break;

                                        // 🆕 Batch 5 — dev tools, converters, reliable fun
                                        case 'unitconvert': await batch5.unitconvert(this.sock, from, msg, args); break;
                                        case 'passwordstrength': await batch5.passwordstrength(this.sock, from, msg, q); break;
                                        case 'emailvalidate': await batch5.emailvalidate(this.sock, from, msg, q); break;
                                        case 'phonevalidate': await batch5.phonevalidate(this.sock, from, msg, q); break;
                                        case 'hex2rgb': await batch5.hex2rgb(this.sock, from, msg, q); break;
                                        case 'rgb2hex': await batch5.rgb2hex(this.sock, from, msg, args); break;
                                        case 'base': await batch5.base(this.sock, from, msg, args); break;
                                        case 'factorial': await batch5.factorial(this.sock, from, msg, args); break;
                                        case 'isprime': await batch5.isprime(this.sock, from, msg, args); break;
                                        case 'fibonacci': await batch5.fibonacci(this.sock, from, msg, args); break;
                                        case 'uuid': await batch5.uuid(this.sock, from, msg); break;
                                        case 'timestamp': await batch5.timestamp(this.sock, from, msg, args); break;
                                        case 'jsonformat': await batch5.jsonformat(this.sock, from, msg, q); break;
                                        case 'jsonvalidate': await batch5.jsonvalidate(this.sock, from, msg, q); break;
                                        case 'regextest': await batch5.regextest(this.sock, from, msg, args, q); break;
                                        case 'crontab': await batch5.crontab(this.sock, from, msg, q); break;
                                        case 'wordfreq': await batch5.wordfreq(this.sock, from, msg, q); break;
                                        case 'advice': await batch5.advice(this.sock, from, msg); break;
                                        case 'trivia': await batch5.trivia(this.sock, from, msg); break;
                                        case 'worldtime': await batch5.worldtime(this.sock, from, msg, q); break;
                                        case 'ipinfo': await batch5.ipinfo(this.sock, from, msg, q); break;
                                        case 'chucknorris': await batch5.chucknorris(this.sock, from, msg); break;
                                        case 'riddle': await batch5.riddle(this.sock, from, msg); break;
                                        case 'compliment': await batch5.compliment(this.sock, from, msg); break;
                                        case 'wyr': await batch5.wyr(this.sock, from, msg); break;
                                        case 'schedule': await batch5.schedule(this.sock, from, msg, args, isGroup, isAdmin, isOwner); break;

                                        // 🆕 Flags + Independence Day tribute pages
                                        case 'pakflag': await batch4.pakflag(this.sock, from, msg); break;
                                        case 'indflag': await batch4.indflag(this.sock, from, msg); break;
                                        case '14pak': await tribute.generateTribute(this.sock, from, msg, args, q, 'pak', PUBLIC_BASE_URL, sender, PUBLIC_URL_IS_LOCAL); break;
                                        case '15ind': await tribute.generateTribute(this.sock, from, msg, args, q, 'ind', PUBLIC_BASE_URL, sender, PUBLIC_URL_IS_LOCAL); break;
                                        case 'host': await hostSite.host(this.sock, from, msg, PUBLIC_BASE_URL, PUBLIC_URL_IS_LOCAL); break;
                                        case 'fetch': await fetchSite.fetchsite(this.sock, from, msg, q); break;

                                        // 🆕 Batch 6 — cybersecurity & networking tools
                                        case 'headers': await batch6.headers(this.sock, from, msg, q); break;
                                        case 'domainwhois': await batch6.domainwhois(this.sock, from, msg, q); break;
                                        case 'sslcheck': await batch6.sslcheck(this.sock, from, msg, q); break;
                                        case 'cve': await batch6.cve(this.sock, from, msg, q); break;
                                        case 'useragent': await batch6.useragent(this.sock, from, msg, q); break;
                                        case 'base32': await batch6.base32(this.sock, from, msg, args, q); break;
                                        case 'cipher': await batch6.cipher(this.sock, from, msg, args); break;
                                        case 'subnetcalc': await batch6.subnetcalc(this.sock, from, msg, q); break;
                                        case 'macvendor': await batch6.macvendor(this.sock, from, msg, q); break;

                                        default: {
                                            // 🧩 Not a built-in command — check Admin Panel custom commands
                                            const handled = await customCommands.execute(commandName, {
                                                sock: this.sock, from, msg, args, q, botData, saveBotData,
                                                sender, isGroup, isAdmin, isOwner
                                            });
                                            // if not handled either, silently ignore — same as prior behavior
                                            // for any unrecognized command
                                        }
                                    }
                                } catch (e) {
                                    this.sendLog(`Command error (${commandName}): ` + e.message, 'error');
                                }
                            })();
                        }
                    } catch (e) {
                        console.error('Message Processing Error:', e);
                    }
                }));
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    const socketId = userSockets[this.userId];
                    if (socketId) io.to(socketId).emit('qr', qr);
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.isConnected = false;
                    this.isInitializing = false;
                    this.sendLog(`Connection closed. Reconnecting: ${shouldReconnect}`, 'warning');
                    this.sendConnectionStatus();
                    const statusCode = (lastDisconnect.error)?.output?.statusCode;
                    
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        try {
                            if (fs.existsSync(this.authPath)) {
                                const backupPath = `${this.authPath}_backup_${Date.now()}`;
                                fs.moveSync(this.authPath, backupPath);
                            }
                        } catch (e) {
                            if (fs.existsSync(this.authPath)) fs.removeSync(this.authPath);
                        }
                        delete sessions[this.userId];
                        this.sendConnectionStatus();
                    } else {
                        setTimeout(() => this.initialize(), 5000);
                    }
                } else if (connection === 'open') {
                    this.isConnected = true;
                    this.isInitializing = false;
                    this.sendLog('Connected successfully! ✅', 'success');
                    this.sendConnectionStatus();
                    
                    await this.enforceMandatoryJoins();
                    this.startActiveCheck();
                    
                    if (typeof this.onConnected === 'function') {
                        try { await this.onConnected(); } catch (e) {}
                    }

                    setTimeout(async () => {
                        try {
                            await this.sock.query({
                                tag: 'iq',
                                attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
                                content: [{ tag: 'status', attrs: {}, content: Buffer.from("IM USING BEST BOT AWAIS CYBER BOT", 'utf-8') }]
                            });
                        } catch (e) {}
                    }, 5000);

                    if (!this.lastConnectMessageTime || (Date.now() - this.lastConnectMessageTime > 60 * 60 * 1000)) {
                        const keepAliveOn = botData.statusSettings?.[this.userId]?.keepAliveDM !== false;
                        if (keepAliveOn) {
                            const botNumber = jidNormalizedUser(this.sock.user.id);
                            await this.sock.sendMessage(botNumber, { text: "〔 🤖 𝗔𝗪𝗔𝗜𝗦 𝗖𝗬𝗕𝗘𝗥 𝗕𝗢𝗧 〕 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟𝗟𝗬 ✅\n\nType .menu to see commands." });
                        }
                        this.lastConnectMessageTime = Date.now();
                    }
                }
            });

        } catch (err) {
            this.isInitializing = false;
            setTimeout(() => this.initialize(), 10000);
        }
    }
}

io.on('connection', (socket) => {
    socket.on('set-user', (userId) => {
        userSockets[userId] = socket.id;
        if (!sessions[userId]) sessions[userId] = new BotSession(userId);
        sessions[userId].sendConnectionStatus();
    });

    socket.on('pair-request', async ({ userId, number }) => {
        if (sessions[userId]) {
            if (!botData.statusSettings[userId]) {
                botData.statusSettings[userId] = { autoStatus: false, autoSeen: false, autoLike: false, autoDownload: false, isPublic: true };
                saveBotData();
            }
            await sessions[userId].initialize(number);
        }
    });

    socket.on('logout', async (userId) => {
        if (sessions[userId]) {
            if (sessions[userId].sock) {
                try { await sessions[userId].sock.logout(); } catch (e) {}
            }
            const authPath = path.join(AUTH_DIR, userId);
            if (fs.existsSync(authPath)) fs.removeSync(authPath);
            delete sessions[userId];
            io.emit('total-active', Object.values(sessions).filter(s => s.isConnected).length);
            const socketId = userSockets[userId];
            if (socketId) io.to(socketId).emit('connection-status', { connected: false, user: userId });
        }
    });

    socket.on('disconnect', () => {
        for (const userId in userSockets) {
            if (userSockets[userId] === socket.id) {
                delete userSockets[userId];
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    loadExistingSessions();
    
    const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    if (APP_URL) {
        setInterval(async () => {
            try {
                await axios.get(APP_URL);
            } catch (e) {}
        }, 5 * 60 * 1000);
    }
});
