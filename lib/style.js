const SMALL = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
    k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ',
    u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};

const TOP = '╭─❰ ⚡ 𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋 ❱─╮';
const BOTTOM = '╰─❰ ⚡ZᴇPʜʏʀ~Mᴅ⚡ ❱─╯';
const MAX_LEN = 3500;

function toSmallCaps(text) {
    if (typeof text !== 'string') return text;
    const holders = [];
    const protectedText = text
        .replace(/```[\s\S]*?```/g, (m) => {
            holders.push(m);
            return `\u0000${holders.length - 1}\u0000`;
        })
        .replace(/`[^`]+`/g, (m) => {
            holders.push(m);
            return `\u0000${holders.length - 1}\u0000`;
        })
        .replace(/https?:\/\/\S+/gi, (m) => {
            holders.push(m);
            return `\u0000${holders.length - 1}\u0000`;
        });
    const mapped = protectedText.replace(/[A-Za-z]/g, (c) => SMALL[c.toLowerCase()] || c);
    return mapped.replace(/\u0000(\d+)\u0000/g, (_, i) => holders[Number(i)]);
}

function alreadyStyled(text) {
    return text.startsWith('╭') || text.startsWith('┏') || text.includes('▓▓▓') || text.includes('ᴢᴇᴘʜʏʀ-ᴍᴅ') || text.includes('𝘡𝘌𝘗𝘏𝘠𝘙-𝘔𝘋');
}

function heavy(text, opts = {}) {
    if (typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (trimmed.length > MAX_LEN) return toSmallCaps(text);
    if (alreadyStyled(trimmed)) return toSmallCaps(text);

    const boxed = trimmed.split('\n').map((line) => (line.length ? `┃ ${line}` : '┃')).join('\n');
    let footer = BOTTOM;
    if (opts && opts.mentionTag) {
        footer = `┃ ʀᴇǫᴜᴇꜱᴛᴇᴅ ʙʏ: ${opts.mentionTag}\n${BOTTOM}`;
    }
    return toSmallCaps(`${TOP}\n┃\n${boxed}\n┃\n${footer}`);
}

function applyHeavyStyle(sock) {
    if (sock.__heavyStyled) return;
    const original = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options) => {
        try {
            if (content && typeof content === 'object' && !Buffer.isBuffer(content)) {
                let mentionJid = null;
                let mentionTag = null;
                try {
                    const quoted = options && options.quoted;
                    if (quoted && quoted.key) {
                        mentionJid = quoted.key.participant || quoted.key.remoteJid || null;
                        if (mentionJid && mentionJid.endsWith('@s.whatsapp.net')) {
                            mentionTag = '@' + mentionJid.split('@')[0];
                        }
                    }
                } catch (e) {
                    mentionJid = null;
                    mentionTag = null;
                }

                if (typeof content.text === 'string') {
                    content = { ...content, text: heavy(content.text, { mentionTag }) };
                } else if (typeof content.caption === 'string') {
                    content = { ...content, caption: heavy(content.caption, { mentionTag }) };
                }

                if (mentionJid) {
                    const existing = Array.isArray(content.mentions) ? content.mentions : [];
                    if (!existing.includes(mentionJid)) {
                        content = { ...content, mentions: [...existing, mentionJid] };
                    }
                }
            }
        } catch (e) { /* never let styling break a send */ }
        return original(jid, content, options);
    };
    sock.__heavyStyled = true;
}

module.exports = { heavy, applyHeavyStyle, toSmallCaps };
