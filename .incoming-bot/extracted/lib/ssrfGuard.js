// lib/ssrfGuard.js
// 👑 AWAIS CYBER — SSRF protection for any command that fetches a
// user-supplied URL (.fetch, .shorturl/.unshorten, etc).
//
// Without this, a user could point the bot at http://127.0.0.1:PORT,
// http://169.254.169.254 (the cloud metadata endpoint that leaks
// AWS/GCP/Azure/Railway credentials on many hosts), or any address on
// the private network the bot's server lives on, and get the response
// zipped up and handed back to them. assertSafeUrl() rejects all of
// that before axios ever opens the connection.

const dns = require('dns').promises;
const net = require('net');

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', 'metadata.google.internal']);

function ipInPrivateRange(ip) {
    const version = net.isIP(ip);
    if (version === 4) {
        const parts = ip.split('.').map(Number);
        if (parts[0] === 10) return true;                                   // 10.0.0.0/8
        if (parts[0] === 127) return true;                                  // 127.0.0.0/8 loopback
        if (parts[0] === 169 && parts[1] === 254) return true;              // 169.254.0.0/16 (incl. 169.254.169.254 cloud metadata)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
        if (parts[0] === 192 && parts[1] === 168) return true;              // 192.168.0.0/16
        if (parts[0] === 0) return true;                                    // 0.0.0.0/8
        return false;
    }
    if (version === 6) {
        const lower = ip.toLowerCase();
        if (lower === '::1') return true;              // loopback
        if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique local
        if (lower.startsWith('fe80')) return true;      // fe80::/10 link-local
        if (lower.startsWith('::ffff:')) {
            // IPv4-mapped IPv6 — re-check the embedded v4 address
            const v4 = lower.split(':').pop();
            if (net.isIP(v4) === 4) return ipInPrivateRange(v4);
        }
        return false;
    }
    return false; // not a literal IP — caller resolves it via DNS first
}

// Throws with a user-safe message if targetUrl is not allowed. Resolves
// (does not return a value) if it's fine to fetch.
async function assertSafeUrl(targetUrl) {
    let u;
    try { u = new URL(targetUrl); } catch (e) { throw new Error('That is not a valid URL.'); }

    if (!/^https?:$/.test(u.protocol)) {
        throw new Error('Only http:// and https:// URLs are allowed.');
    }

    const hostname = u.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname)) {
        throw new Error('That host is not allowed.');
    }

    if (net.isIP(hostname)) {
        if (ipInPrivateRange(hostname)) throw new Error('That host is not allowed (private/internal address).');
        return;
    }

    let addresses;
    try {
        addresses = await dns.lookup(hostname, { all: true });
    } catch (e) {
        throw new Error('Could not resolve that host.');
    }
    if (!addresses.length) throw new Error('Could not resolve that host.');
    for (const a of addresses) {
        if (ipInPrivateRange(a.address)) {
            throw new Error('That host resolves to a private/internal address and is not allowed.');
        }
    }
}

// axios request options that, combined with assertSafeUrl() on the
// initial URL, also stop a redirect from silently taking the request
// somewhere private (redirect targets are NOT auto-validated by axios,
// so we simply refuse to follow redirects at all — the caller can
// surface "this URL redirects" as a normal error message to the user).
const NO_REDIRECT_AXIOS_OPTS = { maxRedirects: 0 };

module.exports = { assertSafeUrl, ipInPrivateRange, NO_REDIRECT_AXIOS_OPTS };
