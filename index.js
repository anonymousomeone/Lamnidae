const WebSocketClient = require('websocket').client;
const Jimp = require('jimp')
const { Akdsnadsdsa } = require('./config.json');

const client = new WebSocketClient();

class Task {
    constructor() {
        this.paused = false
        this.tasks = []

        this.maintaining = false
        this.maintain = []
    }
    drawRect(x, y, w, h, c) {

    }
}

const task = new Task()

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

// client.connect('wss://pixelplace.io/socket.io/?EIO=3&transport=websocket', 'echo-protocol', null, opts);

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

function parseImage(img) {
    console.log('reading')
    Jimp.read(img, (err, image) => {
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
           
            var red = this.bitmap.data[idx + 0];
            var green = this.bitmap.data[idx + 1];
            var blue = this.bitmap.data[idx + 2];
            var rgb = findColor([red, green, blue])

            image.setPixelColor(Jimp.rgbaToInt(rgb[0], rgb[1], rgb[2], 255), x, y)
          });
        image.write('lena-small-bw.jpg')
    })
    console.log('done')
}

function findColor(rgb) {
    // TODO: move this to config json
    var colors = {
        // shades of white, white => black
        0:  [255, 255, 255],
        1:  [196, 196, 196],
        2:  [136, 136, 136],
        3:  [85, 85, 85],
        4:  [34, 34, 34],
        5:  [0, 0, 0],

        // color
        6:  [0, 102, 0],
        7:  [34, 177, 76],
        8:  [2, 190, 1],
        9:  [148, 224, 68],
        10: [251, 255, 91],
        11: [229, 217, 0],
        12: [230, 190, 12],
        13: [229, 149, 0],
        14: [160, 106, 66],
        15: [153, 83, 13],
        16: [99, 60, 31],
        17: [107, 0, 0],
        18: [159, 0, 0],
        19: [229, 0, 0],
        20: [187, 79, 0],
        21: [255, 117, 95],
        22: [255, 196, 159],
        23: [255, 223, 204],
        24: [255, 167, 209],
        25: [207, 110, 228],
        26: [236, 8, 236],
        27: [130, 0, 128],
        28: [2, 7, 99],
        29: [0, 0, 234],
        30: [4, 75, 255],
        31: [101, 131, 207],
        32: [54, 186, 255],
        33: [0, 131, 199],
        34: [0, 211, 221],
    }

    var closest = 765
    var res = []
    for (var i = 0; i < Object.keys(colors).length; i++) {
        // console.log(colors[i])
        var d =   ((colors[i][0]-rgb[0])*0.30)^2
                + ((colors[i][1]-rgb[1])*0.59)^2
                + ((colors[i][2]-rgb[2])*0.11)^2
        // console.log(`${colors[i]}: ${d}`)

        // color dist comparing might be buggy
        if (d < closest && !(d < 0)) { 
            closest = d
            res = colors[i]
        }
    }
    return res
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function toHex(rgb) {
    console.log(rgb)
    return `#${componentToHex(rgb[0])}${componentToHex(rgb[1])}${componentToHex(rgb[2])}`
}

// findColor([50, 100, 100])
parseImage('test.jpg')