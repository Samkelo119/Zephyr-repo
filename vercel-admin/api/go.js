const cookie = require('./_cookie');
const { getServers } = require('./_servers');
const { COOKIE_NAME } = require('./_resolveBackend');

module.exports = async function (req, res) {
    const servers = getServers();
    const idx = parseInt(req.query.server, 10);

    if (!Number.isInteger(idx) || !servers[idx]) {
        res.status(400).send('Invalid server selection. <a href="/">Go back</a>');
        return;
    }

    res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, String(idx), { maxAge: 60 * 60 * 24 * 365 }));
    res.writeHead(302, { Location: req.query.admin ? '/admin' : '/pair' });
    res.end();
};
