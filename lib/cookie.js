// lib/cookie.js
// Tiny cookie parse/serialize helper — avoids adding an extra npm
// dependency just for the admin panel's session cookie.

function parse(header) {
    const out = {};
    if (!header) return out;
    header.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        if (key) out[key] = decodeURIComponent(val);
    });
    return out;
}

function serialize(name, value, opts = {}) {
    let str = `${name}=${encodeURIComponent(value)}`;
    if (opts.maxAge !== undefined) str += `; Max-Age=${Math.floor(opts.maxAge)}`;
    if (opts.path) str += `; Path=${opts.path}`;
    if (opts.httpOnly) str += `; HttpOnly`;
    if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
    if (opts.secure) str += `; Secure`;
    return str;
}

module.exports = { parse, serialize };
