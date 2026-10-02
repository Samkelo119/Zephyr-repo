// lib/menu.js
// Stylish command menu for 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋. Every command registered in
// lib/commandConfig.js's ALL_COMMANDS is guaranteed to appear here: after the
// hand-grouped categories are rendered, anything not explicitly listed is
// appended under an "ADDITIONAL COMMANDS" section automatically.

const { ALL_COMMANDS } = require('./commandConfig');

const CATEGORIES = [
    ['ᴄᴏʀᴇ', ['menu', 'ping', 'alive', 'owner', 'info', 'runtime', 'uptime', 'whoami', 'whois',
        'system', 'myip', 'sudo', 'setprefix', 'mode', 'private', 'public', 'pair']],
    ['ᴀɪ', ['ai', 'aiChat', 'aichat', 'gpt', 'chatgpt', 'chatbot', 'imagine']],
    ['ʀᴇʟɪɢɪᴏɴ', ['bible', 'biblelookup', 'biblesearch', 'gita', 'hijri', 'liturgy', 'prayertime',
        'qibla', 'quran', 'torah']],
    ['ᴏᴡɴᴇʀ ᴛᴏᴏʟꜱ', ['alwaysonline', 'antiblock', 'antidelete', 'antiedit', 'autobio',
        'autochatbot', 'block', 'broadcast', 'callblock', 'callhistory', 'creategroup', 'ghost',
        'savestatus', 'silentvv', 'sremoji', 'status', 'statusimg', 'statusreact', 'statusseen',
        'statusvid', 'statusview']],
    ['ɢᴇɴᴇʀᴀʟ ᴛᴏᴏʟꜱ', ['callmeback', 'catbox', 'debug', 'ff', 'location', 'yt', 'reshare']],
    ['ɢʀᴏᴜᴘ ᴘʀᴏᴛᴇᴄᴛɪᴏɴ', ['antibad', 'antileft', 'groupstatus']],
    ['ᴄᴀʟʟ & ᴄᴏɴᴛᴀᴄᴛ', ['anticallmsg', 'channelreact', 'phone', 'unblock', 'wipe', 'wipeall']],
    ['ᴘᴀɪʀɪɴɢ', ['addpair', 'delpair', 'listpair', 'clearpair']],
    ['ᴅᴏᴡɴʟᴏᴀᴅᴇʀꜱ', ['song', 'play', 'music', 'ytmp3', 'ytsong', 'ytaudio', 'yta', 'video', 'apk',
        'facebook', 'fb', 'tiktok', 'insta', 'ig', 'gdrive', 'mf', 'lyrics', 'url']],
    ['ᴀᴜᴛᴏᴍᴀᴛɪᴏɴ', ['autoreacts', 'antilink', 'antidelete', 'anticall', 'antistatus', 'autoread',
        'autotyping', 'autorecording', 'alwaysonline', 'autoarchive', 'freezelastseen']],
    ['ɢʀᴏᴜᴘ', ['groupname', 'gpname', 'groupdesc', 'gpdesc', 'gppic', 'membercount', 'members',
        'adminlist', 'listadmin', 'admins', 'chatid', 'rules', 'poll', 'welcome', 'goodbye',
        'tagall', 'tags', 'hidetag', 'groupinfo', 'gcstatus', 'gpsafe', 'gpsafesettings',
        'groupmanage', 'leave', 'leavegroup', 'lock', 'unlock', 'gpopen', 'gplock']],
    ['ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ', ['promote', 'demote', 'setgname', 'setgdesc', 'setgpic', 'grouplink',
        'revokelink', 'lockgroup', 'unlockgroup', 'lockedit', 'unlockedit', 'addmember',
        'groupcreate', 'joingroup', 'join', 'kick', 'kickall', 'kickadmins', 'pending', 'ban', 'block',
        'add',
        'accept']],
    ['ᴘʀᴏᴛᴇᴄᴛɪᴏɴ', ['antibot', 'antisticker', 'antipicture', 'antivideo', 'antitext', 'antibadword',
        'antiedit', 'statusmention', 'antispam', 'antiaudio', 'anticatalog', 'anticontact',
        'antidocument', 'antievent', 'antilocation', 'antipoll', 'antireact', 'antireply',
        'antiforwad', 'antigroupmention', 'antigroupstatus', 'antistatusmenation', 'antimenation',
        'antiemoji']],
    ['ꜰᴜɴ & ɢᴀᴍᴇꜱ', ['quote', 'joke', 'fact', '8ball', 'flip', 'dice', 'rps', 'love', 'ship',
        'coin', 'hi', 'compliment', 'character', 'truth', 'insult', 'goodnight', 'snow', 'pies',
        'sand', 'thunder', 'tickle', 'wink', 'highfive', 'ice', 'impressive', 'stupid', 'blown',
        'hacker', 'devil', 'squirrel', 'neon', 'magicstudio', 'arena', 'bass', 'sniff', 'freenet',
        'hangman', 'tictactoe', 'random', 'waifu', 'neko', 'megumin', 'loli', 'milf']],
    ['ᴛᴇxᴛ ᴛᴏᴏʟꜱ', ['reverse', 'count', 'binary', 'base64', 'repeat', 'calc', 'clock', 'caps',
        'small', 'titlecase', 'anagram', 'vowels', 'morse', 'unmorse', 'leet', 'stylish', 'clap',
        'rot13', 'urlencode', 'urldecode', 'htmlescape', 'htmlunescape', 'slugify', 'camelcase',
        'snakecase', 'kebabcase', 'spongebob', 'zalgo', 'fullwidth', 'smallcaps', 'strikethrough',
        'mirror', 'shuffle', 'duplicate', 'wordcount', 'charcount', 'textstats', 'vowelcount',
        'consonants', 'wordfreq']],
    ['ᴡᴇʙ & ᴛᴏᴏʟꜱ', ['qr', 'shorturl', 'translate', 'weather', 'define', 'wiki', 'fetch', 'inspect',
        'del', 'delete', 'statussaver', 'unblock', 'newsletter', 'autojoin', 'memesearch',
        'konachan', 'simage', 'gb', 'tostatus']],
    ['ᴍᴇᴅɪᴀ & ɪᴍᴀɢᴇꜱ', ['cat', 'dog', 'fox', 'animals', 'anime', 'cars', 'dp', 'hotgirl', 'islamic',
        'movie', 'pakflag', 'indflag', '14pak', '15ind', 'host', 'pdf', 'emojimix', 'sticker',
        'toimg']],
    ['ɴᴜᴍʙᴇʀꜱ & ᴅᴀᴛᴇ', ['roman', 'fromroman', 'ascii', 'percentage', 'discount', 'tip', 'splitbill',
        'loaninterest', 'leapyear', 'daysleft', 'zodiac', 'worldtime', 'timestamp', 'crontab']],
    ['ᴘᴇʀꜱᴏɴᴀʟ', ['todo', 'note', 'remind', 'gencode', 'schedule']],
    ['ᴍᴏᴅᴇʀᴀᴛɪᴏɴ', ['mute', 'unmute', 'mutelist', 'filter', 'slowmode', 'autoresponder', 'keepalive',
        'warn', 'warnings', 'resetwarn', 'broadcast', 'inviteinfo', 'groupcount', 'activelist',
        'tagadmins', 'exportmembers', 'listmembers']],
    ['ᴅᴇᴠ & ᴜᴛɪʟɪᴛʏ', ['bmi', 'age', 'palindrome', 'password', 'encrypt', 'decrypt', 'hash',
        'randomnum', 'randomname', 'emoji', 'ud', 'currency', 'unshorten', 'dns', 'unitconvert',
        'passwordstrength', 'emailvalidate', 'phonevalidate', 'hex2rgb', 'rgb2hex', 'base',
        'factorial', 'isprime', 'fibonacci', 'uuid', 'jsonformat', 'jsonvalidate', 'regextest',
        'jid']],
    ['ʟɪᴠᴇ ɪɴꜰᴏ', ['advice', 'trivia', 'ipinfo', 'chucknorris', 'riddle', 'wyr']],
    ['ɴᴇᴛᴡᴏʀᴋ', ['headers', 'domainwhois', 'sslcheck', 'cve', 'useragent', 'base32', 'cipher',
        'subnetcalc', 'macvendor']],
    ['ᴀɴᴛɪ-ʙʟᴏᴄᴋ', ['autoblockgroup', 'autoblockunknown', 'autoblockunknowncalls']],
    ['ʙᴏᴛ ᴄᴏɴᴛʀᴏʟ', ['hack', 'jid', 's', 'simdb', 'status', 'time', 'refresh', 'refreshsessions']]
];

function renderCategory(title, commands, p, index) {
    const line = '─'.repeat(28);
    const rows = commands.map(c => `│ ${p}${c}`);
    return [
        `╭─❖ ${String(index).padStart(2, '0')} · ${title}`,
        ...rows,
        `╰${line}`
    ].join('\n');
}

function buildMenuText({ prefix = '.', name = 'User', isPublic = true, url = '' } = {}) {
    const p = prefix;
    const mode = isPublic ? 'ᴘᴜʙʟɪᴄ ᴍᴏᴅᴇ' : 'ᴘʀɪᴠᴀᴛᴇ ᴍᴏᴅᴇ';

    const grouped = [];
    const seen = new Set();
    for (const [title, cmds] of CATEGORIES) {
        const list = cmds.filter(c => !seen.has(c));
        for (const c of list) seen.add(c);
        if (list.length) grouped.push([title, list]);
    }
    const leftover = ALL_COMMANDS.filter(c => !seen.has(c));
    if (leftover.length) grouped.push(['ᴀᴅᴅɪᴛɪᴏɴᴀʟ ᴄᴏᴍᴍᴀɴᴅꜱ', leftover]);

    const total = ALL_COMMANDS.length;

    const parts = [
        '╔══════════════════════════════╗',
        '║      𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋  ʙᴏᴛ         ║',
        '║   ᴜʟᴛʀᴀ ᴄᴏᴍᴍᴀɴᴅ ᴄᴏɴꜱᴏʟᴇ    ║',
        '╚══════════════════════════════╝',
        '',
        '╭─❖ ᴘʀᴏꜰɪʟᴇ',
        `│ ᴜꜱᴇʀ     : ${name}`,
        '│ ꜱᴛᴀᴛᴜꜱ   : ᴏɴʟɪɴᴇ',
        `│ ᴍᴏᴅᴇ     : ${mode}`,
        `│ ᴘʀᴇꜰɪx   : ${p}`,
        `│ ᴄᴏᴍᴍᴀɴᴅꜱ : ${total}`,
        '│ ꜱᴇᴄᴜʀɪᴛʏ : ᴀᴄᴛɪᴠᴇ',
        '╰──────────────────────────────',
        ''
    ];

    grouped.forEach(([title, cmds], i) => {
        parts.push(renderCategory(title, cmds, p, i + 1));
        parts.push('');
    });

    parts.push(
        '╔══════════════════════════════╗',
        '║   ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋      ║',
        '╚══════════════════════════════╝'
    );

    return parts.join('\n');
}

function line(text) {
    return text;
}

module.exports = { buildMenuText, line };
