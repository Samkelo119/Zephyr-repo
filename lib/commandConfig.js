// lib/commandConfig.js
// 👑 AWAIS CYBER — Command control center.
// Single source of truth for: the active prefix, prefixless mode, and
// per-command enable/disable + premium-lock state. Read by index.js on
// every incoming message and written by the Admin Panel — no redeploy
// needed to change any of it.

const fs = require('fs-extra');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'command_config.json');

// Full list of every command name currently registered in index.js's
// dispatch switch. Keeping this list here (rather than scanning the
// switch at runtime) means the Admin Panel can show every command —
// including ones the bot owner has disabled — without needing the bot
// to parse its own source code.
const ALL_COMMANDS = [
    "14pak","15ind","8ball","accept","activelist","addmember","addpair","adminlist","admins","advice","age","ai",
    "aiChat","alive","alwaysonline","anagram","animals","anime","antiaudio","antibadword","antibot","anticall","anticatalog","anticontact",
    "antidelete","antidocument","antiedit","antiemoji","antievent","antiforwad","antigroupmention","antigroupstatus","antilink","antilocation","antimenation","antipicture",
    "antipoll","antireact","antireply","antispam","antistatus","antistatusmenation","antisticker","antitext","antivideo","apk","arena","ascii",
    "autoarchive","autoblockgroup","autoblockunknown","autoblockunknowncalls","autojoin","autoreacts","autoread","autorecording","autoresponder","autostatus","autotyping","ban",
    "base","base32","base64","bass","binary","block","blown","bmi","broadcast","calc","camelcase","caps",
    "cars","cat","character","charcount","chatgpt","chatid","chucknorris","cipher","clap","clearpair","clock","coin",
    "compliment","consonants","count","crontab","currency","cve","daysleft","decrypt","define","del","delete","delpair",
    "demote","devil","dice","discount","dns","dog","domainwhois","dp","duplicate","emailvalidate","emoji","emojimix",
    "encrypt","exportmembers","facebook","fact","factorial","fb","fetch","fibonacci","filter","flip","fox","freenet",
    "freezelastseen","fromroman","fullwidth","gb","gcstatus","gdrive","gencode","goodbye","goodnight","gpdesc","gplock",
    "gpname","gpopen","gppic","gpsafe","gpsafesettings","gpt","groupcount","groupcreate","groupdesc","groupinfo","grouplink","groupmanage",
    "groupname","hack","hacker","hangman","hash","headers","hex2rgb","hi","hidetag","highfive","host","hotgirl",
    "htmlescape","htmlunescape","ice","ig","impressive","indflag","info","inspect","insta","insult","inviteinfo","ipinfo",
    "islamic","isprime","jid","joingroup","joke","jsonformat","jsonvalidate","kebabcase","keepalive","kick","kickadmins","kickall",
    "konachan","leapyear","leave","leavegroup","leet","listadmin","listmembers","listpair","loaninterest","lock","lockedit","lockgroup",
    "loli","love","lyrics","macvendor","magicstudio","megumin","membercount","members","meme","memesearch","menu","mf",
    "milf","mirror","mode","morse","movie","music","mute","mutelist","myip","neko","neon","newsletter",
    "note","owner","pair","pakflag","palindrome","password","passwordstrength","pdf","pending","percentage","phonevalidate","pies",
    "ping","play","poll","private","promote","public","qr","quote","random","randomname","randomnum","regextest",
    "remind","repeat","resetwarn","reverse","revokelink","rgb2hex","riddle","roman","rot13","rps","rules","runtime",
    "s","sand","schedule","setgdesc","setgname","setgpic","setname","setprefix","ship","shorturl","shuffle","simage",
    "simdb","slowmode","slugify","small","smallcaps","snakecase","sniff","snow","song","splitbill","spongebob","squirrel",
    "sslcheck","status","statusmention","statussaver","sticker","strikethrough","stupid","stylish","subnetcalc","sudo","system","tagadmins",
    "tagall","tags","telenor","textstats","thunder","tickle","tictactoe","tiktok","time","timestamp","tip","titlecase",
    "todo","toimg","tostatus","translate","trivia","truth","ud","unblock","unitconvert","unlock","unlockedit","unlockgroup",
    "unmorse","unmute","unshorten","uptime","url","urldecode","urlencode","useragent","uuid","video","vowelcount","vowels",
    "vv","waifu","warn","warnings","weather","welcome","whoami","whois","wiki","wink","wordcount","wordfreq",
    "worldtime","wyr","yta","ytaudio","ytmp3","ytsong","zalgo","zodiac",
    "tts","texttospeech","speak","stream","mstream","stickertelegram","tgsticker","tgs","take",
    "instagram","tagnotadmin","mention","tag","autoreply","auto","purge",
    // 🧩 "ADD NEW COMMAND" pack (ai / owner / religion / general / group / tools)
    "antibad","antiblock","anticallmsg","antileft","autobio","autochatbot","bible","biblelookup",
    "biblesearch","callblock","callhistory","callmeback","catbox","channelreact","chatbot",
    "creategroup","debug","ff","ghost","gita","groupstatus","hijri","imagine","liturgy","location",
    "phone","prayertime","qibla","quran","reshare","savestatus","silentvv","sremoji","statusimg",
    "statusreact","statusseen","statusvid","statusview","torah","wipe","wipeall","yt",
    "add","join","refresh","refreshsessions"
];

// Commands that always stay owner-only regardless of Admin Panel state —
// these control the bot itself, so exposing an on/off switch for them
// to non-owners would be a security hole, not a feature.
const ALWAYS_OWNER_ONLY = new Set(["public", "private", "broadcast", "hack"]);

function defaultConfig() {
    const commands = {};
    for (const name of ALL_COMMANDS) {
        commands[name] = { enabled: true, premium: false };
    }
    return { prefix: ".", prefixlessMode: false, commands };
}

let config = defaultConfig();

function load() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const saved = fs.readJsonSync(CONFIG_FILE);
            const merged = defaultConfig();
            if (typeof saved.prefix === 'string' && saved.prefix.length > 0) merged.prefix = saved.prefix;
            if (typeof saved.prefixlessMode === 'boolean') merged.prefixlessMode = saved.prefixlessMode;
            if (saved.commands && typeof saved.commands === 'object') {
                for (const name of Object.keys(merged.commands)) {
                    if (saved.commands[name]) {
                        merged.commands[name] = {
                            enabled: saved.commands[name].enabled !== false,
                            premium: !!saved.commands[name].premium
                        };
                    }
                }
            }
            config = merged;
        }
    } catch (e) {
        console.error('[commandConfig] failed to load, using defaults:', e.message);
        config = defaultConfig();
    }
}

function persist() {
    try {
        fs.ensureDirSync(path.dirname(CONFIG_FILE));
        fs.writeJsonSync(CONFIG_FILE, config);
    } catch (e) {
        console.error('[commandConfig] failed to save:', e.message);
    }
}

load();

function getPrefix() {
    return config.prefix || ".";
}

function setPrefix(newPrefix) {
    if (typeof newPrefix !== 'string' || newPrefix.length === 0 || newPrefix.length > 3) {
        throw new Error('Prefix must be 1-3 characters.');
    }
    config.prefix = newPrefix;
    persist();
}

function getPrefixlessMode() {
    return !!config.prefixlessMode;
}

function setPrefixlessMode(enabled) {
    config.prefixlessMode = !!enabled;
    persist();
}

function isKnownCommand(name) {
    return Object.prototype.hasOwnProperty.call(config.commands, name);
}

function isCommandEnabled(name) {
    const entry = config.commands[name];
    if (!entry) return true; // unknown/new command names fail open (never accidentally silence a real command)
    return entry.enabled !== false;
}

function setCommandEnabled(name, enabled) {
    if (!isKnownCommand(name)) throw new Error('Unknown command: ' + name);
    config.commands[name].enabled = !!enabled;
    persist();
}

function isPremium(name) {
    const entry = config.commands[name];
    return !!(entry && entry.premium);
}

function setCommandPremium(name, premium) {
    if (!isKnownCommand(name)) throw new Error('Unknown command: ' + name);
    if (ALWAYS_OWNER_ONLY.has(name)) throw new Error('This command is owner-only and cannot be made premium/public.');
    config.commands[name].premium = !!premium;
    persist();
}

function isAlwaysOwnerOnly(name) {
    return ALWAYS_OWNER_ONLY.has(name);
}

function listAll() {
    return {
        prefix: getPrefix(),
        prefixlessMode: getPrefixlessMode(),
        commands: ALL_COMMANDS.map(name => ({
            name,
            enabled: isCommandEnabled(name),
            premium: isPremium(name),
            ownerOnly: isAlwaysOwnerOnly(name)
        }))
    };
}

// Parses an incoming message's text against the current prefix /
// prefixless config. Returns { commandName, args, q } or null if the
// text isn't a recognized command invocation at all.
function extractCommand(text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const lower = text.toLowerCase();
    const prefix = getPrefix();

    let commandName = null;
    if (prefix && lower.startsWith(prefix)) {
        commandName = lower.slice(prefix.length).split(' ')[0];
    } else if (getPrefixlessMode()) {
        const firstWord = lower.split(' ')[0];
        if (firstWord && isKnownCommand(firstWord)) {
            commandName = firstWord;
        }
    }
    if (!commandName) return null;

    const args = text.split(' ').slice(1);
    const q = args.join(' ');
    return { commandName, args, q };
}

// Used for the various "is this message a command, so skip auto-responder /
// anti-text / AI-reply for it" checks scattered through index.js — same
// prefix/prefixless rules as extractCommand, just a boolean.
function isCommandText(text) {
    return extractCommand(text) !== null;
}

module.exports = {
    ALL_COMMANDS,
    getPrefix, setPrefix,
    getPrefixlessMode, setPrefixlessMode,
    isKnownCommand, isCommandEnabled, setCommandEnabled,
    isPremium, setCommandPremium, isAlwaysOwnerOnly,
    listAll, extractCommand, isCommandText
};
