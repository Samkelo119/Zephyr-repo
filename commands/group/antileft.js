/**
 * ZEPHYR MD - Anti-Left Protection
 * Re-adds any member who tries to leave the group
 * Tries both JID and LID formats on re-add
 */

const fs = require('fs');
const settings = require('../../settings');
const { isBotAdmin, idsMatch, cleanNum, extractLidPart } = require('../../lib/groupAdmin');
const { isSudo, ownerNumbers: staticOwnerNumbers } = require('../../lib/sudoManager');
const { getOwnerNumbers } = require('../../lib/owner');

const dataPath = './data/antileft.json';

if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}));

function readStore() {
  try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); }
  catch (e) { return {}; }
}

function writeStore(data) {
  try { fs.writeFileSync(dataPath, JSON.stringify(data, null, 2)); }
  catch (e) { console.log('[ANTILEFT] Write failed:', e.message); }
}

async function isSenderAdmin(conn, groupId, senderJid) {
  try {
    // The bot owner / sudo users are always trusted as admins.
    if (isSudo(senderJid)) return true;
    const meta = await conn.groupMetadata(groupId);
    // The group creator counts as an admin even if metadata is inconsistent.
    if (meta.owner && idsMatch(meta.owner, senderJid)) return true;
    if (meta.ownerPn && idsMatch(meta.ownerPn, senderJid)) return true;
    const me = meta.participants.find(p =>
      idsMatch(p.id, senderJid) || (p.lid && idsMatch(p.lid, senderJid))
    );
    if (!me) return false;
    return me.admin === 'admin' || me.admin === 'superadmin';
  } catch (e) {
    return false;
  }
}

// Identities that must ALWAYS be trusted as admins: configured owner numbers,
// the group creator, and the bot (paired) account itself. This is what makes
// anti-left "recognise" the owner instead of fighting their actions.
function trustedAdminIds(conn, meta) {
  const out = [];
  if (meta) {
    if (meta.owner) out.push(meta.owner);
    if (meta.ownerPn) out.push(meta.ownerPn);
  }
  try { for (const n of staticOwnerNumbers()) out.push(n); } catch (e) {}
  try { for (const n of getOwnerNumbers()) out.push(n); } catch (e) {}
  if (conn && conn.user) {
    if (conn.user.id) out.push(conn.user.id);
    if (conn.user.lid) out.push(conn.user.lid);
  }
  return [...new Set(out.filter(Boolean))];
}

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
module.exports = {
  name: 'antileft',
  aliases: ['al', 'antiexit'],
  category: 'group',
  description: 'Prevent members from leaving the group',
  usage: '.antileft on | .antileft off',
  groupOnly: true,
  react: '✅',

  async execute(conn, mek, args, chatId, isOwner) {
    try {
      const isGroup = chatId.endsWith('@g.us');
      if (!isGroup) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, { text: `This command is for groups only.\n\n${settings.footer}` });
        return;
      }

      const sender = mek.key.participant || mek.key.remoteJid;
      const senderIsAdmin = await isSenderAdmin(conn, chatId, sender);

      if (!senderIsAdmin && !isOwner) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `Admin or owner access required.\n\n${settings.footer}`
        });
        return;
      }

      const botIsAdmin = await isBotAdmin(conn, chatId);
      if (!botIsAdmin) {
        await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } });
        await conn.sendMessage(chatId, {
          text: `I need to be an admin to use this feature.\n\n${settings.footer}`
        });
        return;
      }

      const store = readStore();
      const choice = (args[0] || '').toLowerCase();

      if (choice === 'on') {
        let adminIds = [];
        try { adminIds = collectAdminIds(await conn.groupMetadata(chatId)); } catch (e) {}
        store[chatId] = { enabled: true, admins: adminIds };
        writeStore(store);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text:
            `ANTI-LEFT ENABLED\n\n` +
            `Members who leave on their own will be re-added automatically.\n` +
            `Admins are trusted: anyone an admin removes stays removed, and admins can still leave.\n\n` +
            `${settings.footer}`
        });
        return;
      }

      if (choice === 'off') {
        store[chatId] = { enabled: false };
        writeStore(store);
        await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
        await conn.sendMessage(chatId, {
          text:
            `ANTI-LEFT DISABLED\n\n` +
            `Members can now leave freely.\n\n` +
            `${settings.footer}`
        });
        return;
      }

      const current = store[chatId];
      const status = current?.enabled ? 'ENABLED' : 'DISABLED';

      await conn.sendMessage(chatId, { react: { text: '✅', key: mek.key } });
      await conn.sendMessage(chatId, {
        text:
          `ANTI-LEFT PROTECTION\n\n` +
          `Status: ${status}\n\n` +
          `Usage:\n` +
          `  ${settings.prefix || '.'}antileft on   - prevent leaves\n` +
          `  ${settings.prefix || '.'}antileft off  - allow leaves\n\n` +
          `${settings.footer}`
      });

    } catch (error) {
      console.log('[ANTILEFT] Command error:', error.message);
      try { await conn.sendMessage(chatId, { react: { text: '❌', key: mek.key } }); } catch (e) {}
      try {
        await conn.sendMessage(chatId, {
          text: `Error: ${error.message}\n\n${settings.footer}`
        });
      } catch (e) {}
    }
  }
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Every identity a participant entry carries (phone JID, LID, alt phone).
function participantIds(p) {
  const out = [];
  if (typeof p === 'string') {
    out.push(p);
  } else if (p && typeof p === 'object') {
    if (p.id) out.push(p.id);
    if (p.jid) out.push(p.jid);
    if (p.lid) out.push(p.lid);
    if (p.phoneNumber) out.push(p.phoneNumber);
  }
  return [...new Set(out.filter(Boolean))];
}

// Identities of whoever triggered the change (the actor).
function actorIds(update) {
  const out = [];
  if (update && update.author) out.push(update.author);
  if (update && update.authorPn) out.push(update.authorPn);
  return [...new Set(out.filter(Boolean))];
}

function anyIdMatch(listA, listB) {
  for (const a of listA) {
    for (const b of listB) {
      if (idsMatch(a, b)) return true;
    }
  }
  return false;
}

// All identity formats of the current admins of a group.
function collectAdminIds(meta) {
  const out = [];
  for (const p of (meta && meta.participants) || []) {
    if (p.admin === 'admin' || p.admin === 'superadmin') {
      if (p.id) out.push(p.id);
      if (p.lid) out.push(p.lid);
      if (p.phoneNumber) out.push(p.phoneNumber);
    }
  }
  return [...new Set(out.filter(Boolean))];
}

// ─────────────────────────────────────────────
// WATCHER - called from main.js
// ─────────────────────────────────────────────
async function antiLeftWatcher(conn, update) {
  try {
    const { id: groupId, participants, action } = update;

    console.log('[ANTILEFT] Watcher fired:', action, '| group:', groupId, '| participants:', JSON.stringify(participants));

    if (!groupId || !groupId.endsWith('@g.us')) {
      console.log('[ANTILEFT] Skipped: not a group');
      return;
    }

    const store = readStore();

    // Keep an admin cache in sync on promote/demote so a leaving admin is
    // always recognised as an admin (WhatsApp drops them from metadata the
    // moment they leave, so live metadata alone is not enough to trust them).
    if (action === 'promote' || action === 'demote') {
      if (store[groupId] && store[groupId].enabled) {
        let list = Array.isArray(store[groupId].admins) ? store[groupId].admins.slice() : [];
        for (const p of participants) {
          const pIds = participantIds(p);
          if (action === 'promote') {
            for (const id of pIds) {
              if (!list.some(x => idsMatch(x, id))) list.push(id);
            }
          } else {
            list = list.filter(x => !anyIdMatch([x], pIds));
          }
        }
        store[groupId].admins = list;
        writeStore(store);
      }
      return;
    }

    if (action !== 'remove') {
      console.log('[ANTILEFT] Skipped: action is', action);
      return;
    }

    console.log('[ANTILEFT] Store check:', JSON.stringify(store[groupId]));
    if (!store[groupId] || !store[groupId].enabled) {
      console.log('[ANTILEFT] Skipped: not enabled for this group');
      return;
    }

    const botIsAdmin = await isBotAdmin(conn, groupId);
    if (!botIsAdmin) {
      console.log('[ANTILEFT] Bot not admin in', groupId, '- skipping');
      return;
    }

    let meta = null;
    try {
      meta = await conn.groupMetadata(groupId);
    } catch (e) {
      console.log('[ANTILEFT] Metadata fetch failed:', e.message);
      return;
    }

    // Merge live admins with the cached admin list (which still contains
    // admins that just left) and the always-trusted owner/creator/bot IDs so
    // admin removals and admin self-leaves are both trusted and never undone.
    const currentAdmins = collectAdminIds(meta);
    const cachedAdmins = Array.isArray(store[groupId].admins) ? store[groupId].admins : [];
    const adminIds = [...new Set([...currentAdmins, ...cachedAdmins, ...trustedAdminIds(conn, meta)])];
    store[groupId].admins = adminIds;
    writeStore(store);

    // Bot's own IDs
    const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    const botLid = conn.user.lid ? extractLidPart(conn.user.lid) : '';

    // Who performed the removal? Baileys reports BOTH "member left" and
    // "admin removed member" as action 'remove', so the actor (author) is the
    // only way to tell them apart. We must trust admins: never fight a removal
    // that an admin (or the bot itself) deliberately performed.
    const actor = actorIds(update);
    const actorIsBot = actor.length > 0 && anyIdMatch(actor, [botJid, botLid].filter(Boolean));
    const actorIsAdmin = actor.length > 0 && anyIdMatch(actor, adminIds);

    console.log('[ANTILEFT] Actor:', actor.join(', ') || '(unknown)',
      actorIsBot ? '| bot' : actorIsAdmin ? '| admin' : '');

    const toReAdd = [];

    for (const p of participants) {
      const pIds = participantIds(p);
      const jid = pIds[0];
      if (!jid) continue;

      // Skip admins (even if removed in the same batch)
      if (anyIdMatch(pIds, adminIds)) {
        console.log('[ANTILEFT] Skipped (admin):', jid);
        continue;
      }

      // Never undo the bot's own removals (e.g. .kick)
      if (actorIsBot || anyIdMatch(pIds, [botJid, botLid].filter(Boolean))) {
        console.log('[ANTILEFT] Skipped (bot action):', jid);
        continue;
      }

      // Trust admins: if someone other than the member performed the removal,
      // leave it alone. Only a genuine self-leave is re-added.
      if (actorIsAdmin) {
        console.log('[ANTILEFT] Skipped (admin removal):', jid);
        continue;
      }
      if (actor.length > 0 && !anyIdMatch(actor, pIds)) {
        console.log('[ANTILEFT] Skipped (removed by another member):', jid);
        continue;
      }
      if (actor.length === 0) {
        // No actor info: cannot prove this was a self-leave, so trust admins.
        console.log('[ANTILEFT] Skipped (unknown actor):', jid);
        continue;
      }

      toReAdd.push(jid);
    }

    if (toReAdd.length === 0) {
      console.log('[ANTILEFT] No members to re-add (all admins or bot)');
      return;
    }

    // ─────────────────────────────────────────
    // ATTEMPT 1 — original format
    // ─────────────────────────────────────────
    let added = false;
    try {
      await conn.groupParticipantsUpdate(groupId, toReAdd, 'add');
      console.log('[ANTILEFT] Re-added (original format):', toReAdd.join(', '));
      added = true;
    } catch (e) {
      console.log('[ANTILEFT] Add failed with original format:', e.message);
    }

    // ─────────────────────────────────────────
    // ATTEMPT 2 — alternate format
    // ─────────────────────────────────────────
    if (!added) {
      const altIds = [];
      for (const jid of toReAdd) {
        const num = String(jid).split('@')[0].split(':')[0];
        if (String(jid).includes('@lid')) {
          altIds.push(num + '@s.whatsapp.net');
        } else {
          altIds.push(num + '@lid');
        }
      }

      try {
        await conn.groupParticipantsUpdate(groupId, altIds, 'add');
        console.log('[ANTILEFT] Re-added (alt format):', altIds.join(', '));
        added = true;
      } catch (e) {
        console.log('[ANTILEFT] Add failed with alt format:', e.message);
      }
    }

    // ─────────────────────────────────────────
    // ATTEMPT 3 — combined
    // ─────────────────────────────────────────
    if (!added) {
      const combined = [...toReAdd];
      for (const jid of toReAdd) {
        const num = String(jid).split('@')[0].split(':')[0];
        if (String(jid).includes('@lid')) {
          combined.push(num + '@s.whatsapp.net');
        } else {
          combined.push(num + '@lid');
        }
      }

      try {
        await conn.groupParticipantsUpdate(groupId, combined, 'add');
        console.log('[ANTILEFT] Re-added (combined):', combined.join(', '));
        added = true;
      } catch (e) {
        console.log('[ANTILEFT] All add attempts failed:', e.message);
      }
    }

    // ─────────────────────────────────────────
    // Notify in group
    // ─────────────────────────────────────────
    try {
      const names = toReAdd.map(j => '@' + cleanNum(j)).join(', ');
      if (added) {
        await conn.sendMessage(groupId, {
          text:
            `ANTI-LEFT\n\n` +
            `${names} left the group and was re-added.\n\n` +
            `${settings.footer}`,
          mentions: toReAdd
        });
      } else {
        await conn.sendMessage(groupId, {
          text:
            `ANTI-LEFT\n\n` +
            `Could not re-add ${names}.\n` +
            `Their privacy settings may block group adds.\n\n` +
            `${settings.footer}`,
          mentions: toReAdd
        });
      }
    } catch (e) {}

  } catch (error) {
    console.log('[ANTILEFT] Watcher error:', error.message);
  }
}

module.exports.antiLeftWatcher = antiLeftWatcher;