// vercel-admin/api/_cookie.js
// Minimal cookie parse/serialize — avoids adding an npm dependency
// just to remember which server the person picked.

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
    str += `; Path=${opts.path || '/'}`;
    if (opts.httpOnly !== false) str += `; HttpOnly`;
    if (opts.sameSite) str += `; SameSite=${opts.sameSite}`;
    return str;
}

module.exports = { parse, serialize };
