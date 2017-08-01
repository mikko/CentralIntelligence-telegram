const CIClient = require('ci-client');
const TelegramBot = require('node-telegram-bot-api');

const telegramConfig = require('./config');
const CIconfig = require('./client-config.js');

const token = telegramConfig.apikey;
const bot = new TelegramBot(token, {polling: true});

const client = new CIClient(CIconfig);

const messageReceiver = (message, context) => {
    console.log(`Message received from Central Intelligence ${message}`);
    console.log(JSON.stringify(context, null, 2));
    bot.sendMessage(context.msg.chat.id, message);
};

client.setReceiver(messageReceiver);

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    // Forward message to Central Intelligence
    client.sendMessage(msg.text, { msg });
});
