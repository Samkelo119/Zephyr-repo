// lib/channelReact.js
// Assigns each paired number its OWN reaction emoji for community-channel
// updates, so when the owner posts an update every paired number reacts with a
// different emoji instead of all of them spamming the same one.
//
// The assignment is stable per paired number (persisted to
// data/channel_react_index.json) and rotates once per day so the set of
// reactions changes over time while staying unique across numbers.

const fs = require('fs-extra');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'channel_react_index.json');

const POOL = [
    '🔥', '❤️', '👍', '✨', '⚡', '💯', '🎉', '😍',
    '👑', '🌟', '💥', '🙌', '🤩', '😎', '🎊', '💖',
    '💕', '🙏', '👏', '💪', '🥳', '🤝', '🌈', '🎈',
    '⭐', '💫', '🫶', '😁', '🤗', '👌', '💐', '🚀'
];

let store = { assigned: {}, counter: 0 };
try { store = { ...store, ...fs.readJsonSync(FILE) }; } catch (e) {}

function persist() {
    try { fs.writeJsonSync(FILE, store); } catch (e) {}
}

// Stable index for a paired number (first free slot in the pool).
function indexFor(userId) {
    const key = String(userId || 'default');
    if (store.assigned[key] === undefined) {
        const used = new Set(Object.values(store.assigned));
        let i = 0;
        while (used.has(i) && i < POOL.length * 4) i++;
        store.assigned[key] = i;
        persist();
    }
    return store.assigned[key];
}

// The emoji this number should use for an update posted at `ts`.
// `dayOffset` rotates the whole set daily; because it is derived from the
// message timestamp it is identical for every number, so per-number indexes
// stay distinct.
function reactionFor(userId, ts) {
    const idx = indexFor(userId);
    const day = Math.floor((Number(ts) || Date.now()) / 86400000);
    return POOL[(idx + day) % POOL.length];
}

module.exports = { reactionFor, indexFor, POOL, poolSize: () => POOL.length };
