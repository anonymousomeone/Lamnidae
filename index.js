const WebSocketClient = require('websocket').client;
const { Akdsnadsdsa } = require('./config.json');

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
            var parsed = parseMessage(message.utf8Data)
            if (parsed.type != 'p') {
                console.log(`Recieved: ${parsed.id}, ${parsed.type}, ${parsed.msg}`);
                console.log(parsed.msg)
            }

            // console.log(place({x: 1938, y:1536}, 15))
            if (parsed.id == '40') {
                console.log('Authenticating')
                // console.log(buildAuth(Akdsnadsdsa))
                connection.sendUTF(buildAuth(Akdsnadsdsa))

                // keepalive
                setInterval(() => {connection.send('2')}, 26000)
                setInterval(() => {connection.send(place(1938, 1536, 13))}, 1000)
            }
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
    return `42["init",{"authId":"${userJson.authId}","authKey":"${userJson.authKey}","authToken":"${userJson.authToken}","boardId":${userJson.boardId}}]`
    }

function parseMessage(msg) {
    var id = ""
    for (var i = 0; i < msg.length; i++) {
        var char = msg[i]
        // console.log(parseInt(char))
        if (parseInt(char).toString() == 'NaN') break
        id += char
    }
    if (msg.length >= 3) var message = JSON.parse(msg.slice(id.length));
    if (id == '42') {
        var type = message[0]
        message = message[1]
    }
    return { id: id, type: type, msg: message }
}

function place(x, y, color) {
    return `42["p",[${x},${y},${color},1]]`
}