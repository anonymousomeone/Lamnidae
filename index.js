const WebSocketClient = require('websocket').client;
const Jimp = require('jimp')
const { zzzr, colors, cdict } = require('./config.json');
const EventEmitter = require('events');

const client = new WebSocketClient();

class TaskManager extends EventEmitter {
    constructor() {
        super()

        this.paused = false
        this.tasks = []

        // TODO: maintain art by listening on websocket for "p" messages and repairing
        this.maintaining = false
        this.maintain = []
    }
    drawRect(x, y, w, h, c) {
        // time complexity be goin through the roof (real)
        for (var a = 0; a < w; a++) {
            for (var b = 0; b < h; b++) {
                this.tasks.push(place(x + a, y + b, c))
            }
        }
    }
    
    drawImage(img, x, y) {
        console.log('converting image')
        Jimp.read(img, async (err, image) => {
            var that = this
            await image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x2, y2, idx) {
               
                var red = this.bitmap.data[idx + 0];
                var green = this.bitmap.data[idx + 1];
                var blue = this.bitmap.data[idx + 2];
                var rgb = findColor([red, green, blue])
    
                var keys = Object.keys(cdict)
                for (var i = 0; i < keys.length; i++) {
                    if (keys[i] == rgb.join(', ')) {
                        that.tasks.push(place(x2 + x, y2 + y, i))
                    }
                }
            });
            console.log('done')
            this.emit('parsed')
        })
    }
    
}

class Bot {
    constructor(connection) {
        this.connection = connection
    }
    init() {
        task.on('parsed', async () => {
            await sleep(1000)
            console.log('drawing')
            console.log(task.tasks)
            for (var i = 0; i < task.tasks.length; i++) {
                await sleep (150)
                this.connection.sendUTF(task.tasks[0])
                console.log(`Placing ${task.tasks[0]}`)
                task.tasks.shift()
            }
        })
    }
}

const task = new TaskManager()

// task.drawRect(0, 0, 10, 10, 13)
// console.log(task.tasks)

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
    connection.on('message', async function(message) {
        if (message.type === 'utf8') {
            var parsed = parseMessage(message.utf8Data)
            if (parsed.type != 'p' && parsed.type != 'chat.user.message' && parsed.type != 'l' && parsed.type != 'j') {
                console.log(`Recieved: ${parsed.id}, ${parsed.type}, ${parsed.msg}`);
                console.log(parsed.msg)
            }

            // console.log(place({x: 1938, y:1536}, 15))
            if (parsed.id == '40') {
                console.log('Authenticating')
                // console.log(buildAuth(Akdsnadsdsa))
                connection.sendUTF(buildAuth(zzzr))

                // keepalive
                setInterval(() => {connection.send('2')}, 26000)

                const bot = new Bot(connection)
                bot.init()

                task.drawImage('test.jpg', 2800, 0)
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

const sleep = ms => new Promise( res => setTimeout(res, ms));

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

function findColor(rgb) {
    var closest = 999
    var res = []
    for (var i = 0; i < colors.length; i++) {
        // bad comparer. dont use
        // var d =   ((colors[i][0]-rgb[0])*0.30)^2
        //         + ((colors[i][1]-rgb[1])*0.59)^2
        //         + ((colors[i][2]-rgb[2])*0.11)^2
        // console.log(`${colors[i]}: ${d}`)

        var delta = deltaE(colors[i], rgb)

        if (delta < closest && !(delta < 0)) { 
            closest = delta
            res = colors[i]
        }
    }
    return res
}

// https://stackoverflow.com/questions/13586999/color-difference-similarity-between-two-values-with-js
function deltaE(rgbA, rgbB) {
    let labA = rgb2lab(rgbA);
    let labB = rgb2lab(rgbB);
    let deltaL = labA[0] - labB[0];
    let deltaA = labA[1] - labB[1];
    let deltaB = labA[2] - labB[2];
    let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
    let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
    let deltaC = c1 - c2;
    let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
    deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
    let sc = 1.0 + 0.045 * c1;
    let sh = 1.0 + 0.015 * c1;
    let deltaLKlsl = deltaL / (1.0);
    let deltaCkcsc = deltaC / (sc);
    let deltaHkhsh = deltaH / (sh);
    let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
    return i < 0 ? 0 : Math.sqrt(i);
}
  
function rgb2lab(rgb){
    let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
    r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
    y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
    z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
    return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}
// findColor([50, 100, 100])
// parseImage('test.png')