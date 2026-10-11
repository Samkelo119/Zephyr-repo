// lib/style.js
// 👑 AWAIS CYBER — Universal "heavy" response styling + reply branding.
//
// Wraps every outgoing text/caption in a bold boxed template, and tags
// the person who triggered the command by name (with a real WhatsApp
// @mention) in the footer — so ALL 235+ commands automatically look
// premium and consistent, without needing to hand-edit every command
// file (which would risk breaking working commands one by one). This
// is applied centrally by monkey-patching sock.sendMessage once per
// connection in index.js.
//
// Note on profile pictures: we deliberately do NOT fetch/attach the
// user's profile picture on every single reply. Baileys would need an
// extra network round-trip (sock.profilePictureUrl) per message, which
// slows every command down and can throw/rate-limit when a user has no
// or a privacy-restricted picture — exactly the kind of intermittent
// failure this rebuild is trying to remove. The name + @mention gives
// the same "the bot is talking to me personally" feel without that risk.

const TOP = '╭─❰ ⚡ 𝗭𝗘𝗣𝗛𝗬𝗥 ⁘ 𝗖𝗬𝗕𝗘𝗥 ❱─╮';
const BOTTOM = '╰─❰ 🔰 𝙋𝙤𝙬𝙚𝙧𝙚𝙙 𝘽𝙮 𝗭𝗲𝗽𝗵𝘆𝗿 𝙈𝘿 ❱─╯';
const MAX_LEN = 3500; // very long dumps (member exports, big lists) are left unstyled to stay readable

function alreadyStyled(text) {
    return text.startsWith('╭') || text.includes('▓▓▓') || text.includes('𝘡𝘌𝘗𝘏𝘠𝘙 CYBER') || text.includes('𝗠𝗗𝗛);
}

// opts.mentionName / opts.mentionTag: when provided, adds a
// "Requested by" line just above the footer. mentionTag (e.g.
// "@923001234567") only renders as a real tap-able mention on
// WhatsApp's side if that JID is also included in the outgoing
// message's `mentions` array — applyHeavyStyle takes care of that.
function heavy(text, opts = {}) {
    if (typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (trimmed.length > MAX_LEN) return text;
    if (alreadyStyled(trimmed)) return text;

    const boxed = trimmed.split('\n').map(line => line.length ? `┃ ${line}` : '┃').join('\n');
    let footer = BOTTOM;
    if (opts && opts.mentionTag) {
        footer = `┃ 👤 𝗥𝗲𝗾𝘂𝗲𝘀𝘁𝗲𝗱 𝗯𝘆: ${opts.mentionTag}\n${BOTTOM}`;
    }
    return `${TOP}\n┃\n${boxed}\n┃\n${footer}`;
}

// Wraps sock.sendMessage once per socket so EVERY command's reply gets
// the heavy styling + sender mention automatically, whatever file it
// was written in.
function applyHeavyStyle(sock) {
    if (sock.__heavyStyled) return; // avoid double-wrapping on re-init
    const original = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options) => {
        try {
            if (content && typeof content === 'object' && !Buffer.isBuffer(content)) {
                // Who triggered this reply? Almost every command calls
                // sendMessage with { quoted: msg } — that quoted message
                // tells us who to tag, without index.js having to pass
                // anything extra through 235 call sites.
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
                } catch (e) { mentionJid = null; mentionTag = null; }

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

module.exports = { heavy, applyHeavyStyle };
