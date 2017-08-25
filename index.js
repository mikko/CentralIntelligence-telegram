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

bot.getMe().then(me => {
    myName = `@${me.username}`;
    console.log('My username is', myName);
});

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
        const messages = splitMessage(message, MAX_MESSAGE_LENGTH);
        messages.forEach((msg, i) => {
            setTimeout(() => bot.sendMessage(context.msg.chat.id, msg), i * 500);
        });
    } else {
        bot.sendMessage(context.msg.chat.id, message);
    }
};

client.setReceiver(messageReceiver);

const userParser = ctx => ctx.msg.from.id;

client.setUserParser(userParser);

client.setPrivateChatParser(ctx => ctx.msg.chat.type === 'private');

client.setUserPropertiesParser(ctx => {
    return {
        firstName: ctx.msg.from.first_name,
        lastName: ctx.msg.from.last_name,
        telegramUsername: ctx.msg.from.username,
        telegramId: ctx.msg.from.id
    };
});

const groupUserList = {};
const newMessageInGroup = (ctx) => {
    const user = userParser(ctx);
    const groupId = ctx.msg.chat.id;
    // Group already in list
    if (groupUserList[groupId] === undefined) {
        groupUserList[groupId] = {};
    }
    if (groupUserList[groupId][user] === undefined) {
        groupUserList[groupId][user] = ctx.msg.from;

        console.log('Notifying CI about new person in group', groupId, user.first_name, user.last_name);
        client.sendCommand('setGroupUsers', { group: groupId, type: 'telegram', users: groupUserList[groupId] });
    }
};

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

    if (isGroupMessage) {
        newMessageInGroup({ msg });
    }

    // Commands work only in private chats (TODO: and in groups marked as special)
    if (isPrivateMessage && isCommand) {
        const msgTokens = msg.text.split(' ');
        const command = msgTokens.shift().split('/').pop();
        const params = msgTokens.join(" ");
        client.sendCommand(command, params, { msg });
        return;
    }

    // Forward message to Central Intelligence only if in private chat or if mentioned
    if (isPrivateMessage || meMentioned) {
        const message = meMentioned ? msg.text.split(myName).join('') : msg.text;
        client.sendMessage(message, { msg });
    }

});
