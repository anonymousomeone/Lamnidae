const WebSocketClient = require('websocket').client;
const { zzzr } = require('./config.json');

const client = new WebSocketClient();

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            console.log(parseMessage(message.utf8Data))
        }
    });
});

const opts = {
        host: "pixelplace.io",
        connection: "Upgrade",
        upgrade: "websocket",
        origin: "https://pixelplace.io",
}

client.connect('wss://pixelplace.io/socket.io/?EIO=3&transport=websocket', 'echo-protocol', null, opts);

function buildAuth(userJson) {
    var json = {
        "authId": userJson.authId,
        "authKey": userJson.authKey,
        "authToken": userJson.authToken
    }
    return `42["init", {"authId":${userJson.authId},"authKey": ${userJson.authKey},"authToken": ${userJson.authToken}}]`
}

function parseMessage(msg) {
    var type = ""
    for (char of msg) {
        // console.log(char)
        if (typeof (parseInt(char)) == "number" && parseInt(char).length != 0) {
            type += char
        }
    }
    console.log(type)
}