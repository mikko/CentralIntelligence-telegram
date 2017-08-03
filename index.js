const CIClient = require('ci-client');
const TelegramBot = require('node-telegram-bot-api');

const telegramConfig = require('./config');
const CIconfig = require('./client-config.js');

const token = telegramConfig.apikey;
const bot = new TelegramBot(token, {polling: true});

const client = new CIClient(CIconfig);

const MAX_MESSAGE_LENGTH = 4096;
const MAX_MESSAGES = 3;

const splitMessage = (msg, maxLength) => {
    // const messageCount = parseInt(msg.length / maxLength) + 1;
    const messages = [];

    while(msg.length > 0) {
        let cut = msg.lastIndexOf(' ', maxLength);
        if (cut > MAX_MESSAGE_LENGTH) {
            cut = msg.lastIndexOf(',', maxLength); // Assuming JSON response
        }
        if (cut <= 0 && msg.length > 0) {
            messages.push(msg);
            break;
        }
        const messagePart = msg.slice(0, cut);
        if (messagePart.length > 0) {
            messages.push(messagePart);
        }
        msg = msg.substr(cut);
    }
    return messages;
};

const messageReceiver = (action, message, context) => {
    if (message.length > MAX_MESSAGE_LENGTH) {
        console.log("Splitting too long message");
        const messages = splitMessage(message, MAX_MESSAGE_LENGTH);
        messages.forEach((msg, i) => {
            setTimeout(() => bot.sendMessage(context.msg.chat.id, msg), i * 500);
        });
    } else {
        bot.sendMessage(context.msg.chat.id, message);
    }
};

client.setReceiver(messageReceiver);

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    if(msg.text && msg.text.indexOf('/') !== -1) {
        const msgTokens = msg.text.split(' ');
        const command = msgTokens.shift().split('/').pop();
        const params = msgTokens.join(" ");
        client.sendCommand(command, params, { msg });
        return;
    }

    // Forward message to Central Intelligence
    if (msg.text && msg.text.split(" ").length > 2) {
        client.sendMessage(msg.text, { msg });
    }
});
