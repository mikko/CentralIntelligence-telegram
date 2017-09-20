const fs = require('fs');

module.exports = {
    name: 'telegrambot',
    serverHost: process.env.SERVER_HOST || 'localhost',
    serverPort: process.env.SERVER_PORT || 3000,
    myHost: process.env.MY_HOST || 'localhost',
    myPort: process.env.MY_PORT || 3004,
    authKey: process.env.AUTH_KEY || fs.readFileSync('/run/secrets/authkey', { encoding: 'utf-8' }).trim(),
    trustedUserGroups: 'all',
};
