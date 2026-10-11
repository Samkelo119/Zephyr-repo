// lib/adminAuth.js
// 👑 AWAIS CYBER — Admin Panel security layer.
// Password check (constant-time), session tokens, and login rate limiting.
// The panel password can be overridden any time by setting the
// ADMIN_PANEL_PASSWORD environment variable on your host.

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

// Default password decoded from the value you gave: "Awais Cyber 923295533214"
const DEFAULT_PASSWORD = '𝚉𝙴𝙿𝙷𝚈𝚁 923295533214';
const PASSWORD_FILE = path.join(__dirname, '..', 'data', 'admin_password.json');

function loadPassword() {
    // Priority: Admin-Panel-set password (persisted) > env var > built-in default
    try {
        if (fs.existsSync(PASSWORD_FILE)) {
            const data = fs.readJsonSync(PASSWORD_FILE);
            if (data && data.password) return data.password;
        }
    } catch (e) { /* fall through */ }
    return process.env.ADMIN_PANEL_PASSWORD || DEFAULT_PASSWORD;
}

let PANEL_PASSWORD = loadPassword();

function setPassword(newPassword) {
    PANEL_PASSWORD = newPassword;
    fs.ensureDirSync(path.dirname(PASSWORD_FILE));
    fs.writeJsonSync(PASSWORD_FILE, { password: newPassword });
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const activeSessions = new Map(); // token -> expiry timestamp
const loginAttempts = new Map();  // ip -> { count, firstAttempt, lockedUntil }

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest();
}

function safeEqual(a, b) {
    const bufA = sha256(a);
    const bufB = sha256(b);
    return crypto.timingSafeEqual(bufA, bufB);
}

function isLocked(ip) {
    const rec = loginAttempts.get(ip);
    if (!rec) return false;
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
    if (rec.lockedUntil && Date.now() >= rec.lockedUntil) loginAttempts.delete(ip);
    return false;
}

function recordFailure(ip) {
    const rec = loginAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
    rec.count++;
    if (rec.count >= MAX_ATTEMPTS) {
        rec.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    loginAttempts.set(ip, rec);
}

function recordSuccess(ip) {
    loginAttempts.delete(ip);
}

function verifyPassword(input) {
    if (typeof input !== 'string' || !input) return false;
    return safeEqual(input, PANEL_PASSWORD);
}

function createSession() {
    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, Date.now() + SESSION_TTL_MS);
    return token;
}

function verifySession(token) {
    if (!token) return false;
    const expiry = activeSessions.get(token);
    if (!expiry) return false;
    if (Date.now() > expiry) { activeSessions.delete(token); return false; }
    return true;
}

function destroySession(token) {
    activeSessions.delete(token);
}

// periodic cleanup of expired sessions / stale attempt records
setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of activeSessions.entries()) {
        if (now > expiry) activeSessions.delete(token);
    }
    for (const [ip, rec] of loginAttempts.entries()) {
        if (rec.lockedUntil && now > rec.lockedUntil) loginAttempts.delete(ip);
    }
}, 10 * 60 * 1000);

module.exports = {
    verifyPassword, createSession, verifySession, destroySession,
    isLocked, recordFailure, recordSuccess, MAX_ATTEMPTS, LOCKOUT_MS, setPassword
};
