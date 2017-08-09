const CIClient = require('ci-client');
const TelegramBot = require('node-telegram-bot-api');

const telegramConfig = require('./config');
const CIconfig = require('./client-config.js');

const token = telegramConfig.apikey;
const bot = new TelegramBot(token, {polling: true});

const client = new CIClient(CIconfig);

const MAX_MESSAGE_LENGTH = 4096;
const MAX_MESSAGES = 3;

let myName;

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
    // console.log('Received message', message);
    // console.log(JSON.stringify(context, null, 4));
    if (message.length > MAX_MESSAGE_LENGTH) {
        console.log("Splitting too long message");
        const messages = splitMessage(message, MAX_MESSAGE_LENGTH);
        messages.forEach((msg, i) => {
            setTimeout(() => bot.sendMessage(context.msg.chat.id, msg), i * 500);
        });
    } else {
        // message += '\n\nContext:\n' + JSON.stringify(context, null, 2);
        console.log('Sending message to', context.msg.chat.id, message);
        bot.sendMessage(context.msg.chat.id, message);
    }
};

client.setReceiver(messageReceiver);

client.setUserParser(ctx => {
    return JSON.stringify(ctx.msg.from.id);
});

client.setPrivateChatParser(ctx => ctx.msg.chat.type === 'private');

bot.getMe().then(me => {
    myName = `@${me.username}`;
    console.log('My username is', myName);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    if (msg.text == undefined || msg.text.length === 0) {
        return;
    }

    const isGroupMessage = msg.chat.type === 'group';
    const isPrivateMessage = msg.chat.type === 'private';
    const isCommand = msg.text[0] === '/';
    const meMentioned = msg.text.indexOf(myName) > -1;
    // Commands work only in private chats (TODO: and in groups marked as special)
    if(isPrivateMessage && isCommand) {
        const msgTokens = msg.text.split(' ');
        const command = msgTokens.shift().split('/').pop();
        const params = msgTokens.join(" ");
        client.sendCommand(command, params, { msg });
        return;
    }

    // Forward message to Central Intelligence only if in private chat or if mentioned
    if (msg.text) {
        if(isPrivateMessage || meMentioned) {
            client.sendMessage(msg.text, { msg });
        }
    }
});
