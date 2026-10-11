const cookie = require('./_cookie');
const { COOKIE_NAME } = require('./_resolveBackend');

module.exports = async function (req, res) {
    res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', { maxAge: 0 }));
    res.writeHead(302, { Location: '/' });
    res.end();
};
