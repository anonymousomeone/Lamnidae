const { boardId } = require('./config.json');
const { users } = require('./token.json')
const LoginManager = require('./pixelplace-bot/login.js')
const Client = require('./pixelplace-bot/bot.js')
const TaskManager = require('./pixelplace-bot/tasker.js')

const login = new LoginManager(users)
<<<<<<< HEAD
const task = new TaskManager()

// TODO: make desktop app with electron.js because hehehehaw
// so it better than bababot
// https://www.electronjs.org/
=======

// TODO: move all of these classes, its getting too cluttered
// TODO: organize

class TaskManager extends EventEmitter {
    constructor() {
        super()

        this.paused = false
        this.tasks = []

        this.maintaining = false
        this.maintain = []

        this.bots = []

        this.canvas = []

        // set to lower value when "griefing"
        this.griefing = false
        this.wait = 200

        this.cache = []
    }
    async init(id) {
        // get canvas woooooo
        var url = `https://pixelplace.io/canvas/${id}.png?t200000=${Date.now()}`
        const image = await Jimp.read(url);
        var that = this

        console.log('Processing canvas')
        var ms = Date.now()
        var arr = []

        await image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            var red = this.bitmap.data[idx + 0];
            var green = this.bitmap.data[idx + 1];
            var blue = this.bitmap.data[idx + 2];
            var rgb = [red, green, blue]

            arr.push([x, y, rgb, 1]);
            if (x >= image.bitmap.width - 1) {
                that.canvas.push(arr);
                arr = [];
            }
        })
        console.log(`Processed in ${Date.now() - ms}ms`)
        // format: canvas[y][x]
    }
    drawRect(x, y, w, h, c) {
        // time complexity be goin through the roof (real)
        for (var a = 0; a < w; a++) {
            for (var b = 0; b < h; b++) {
                this.tasks.push(place(x + a, y + b, c))
            }
        }
        this.emit('update')
    }
    
    drawImage(img, x, y, maintain) {
        return new Promise(async (resolve, reject) => {
            await Jimp.read(img, (err, image) => {
                var arr = []
                var res = []
                image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x2, y2, idx) {
                   
                    var red = this.bitmap.data[idx + 0];
                    var green = this.bitmap.data[idx + 1];
                    var blue = this.bitmap.data[idx + 2];
                    var rgb = findColor([red, green, blue])

                    arr.push([x2 + x, y2 + y, rgb])
                    if (x2 >= image.bitmap.width - 1) {
                        res.push(arr);
                        arr = [];
                    }
                });
                // make a local array so we can do operations like randomize pixel placements without modifying the task queue
                this.maintain.push(...res)
                console.log(this.maintain[0][0])
                // console.log('done')
                resolve()
            })
        })
        // console.log('converting image')
        // TODO: get current canvas and check for pixels that are already in the right place,
        // and dont add those to task queue
    }
    
    ticker() {
        console.log('TASKER: drawing...')
        setInterval(() => {
            if (this.bots.length <= 0) {
                console.error('TASKER: no bots?\ninsert megamind meme here')
                process.exit(1)
            }
            for (var i = 0; i < this.bots.length; i++) {
                if (!this.paused && this.tasks.length != 0) {
                    if (this.griefing) {
                        var x = Math.floor(Math.random() * this.w) + this.x
                        var y = Math.floor(Math.random() * this.h) + this.y
                        this.tasks.push(place(x, y, this.color))
                    }
                    this.bots[i].tick(this.tasks[0])
                    this.tasks.shift()
                }
            }
        }, this.wait)
    }

    check(rgb, x, y) {
        return rgb.every((val, index) => val === this.canvas[y][x][2][index]) || this.canvas[y][x][2].every((val, index) => val === [204, 204, 204][index])
    }

    grief(x, y, x2, y2, c) {
        this.griefing = true
        this.x = x
        this.y = y
        // why do math, when you can have the code do it for you?
        this.w = x2 - x
        this.h = y2 - y
        this.color = c
    }

    pHandler(msg) {
        // me when math 😭😭😭
        var len = this.maintain.length - 1
        var minx = this.maintain[0][0][0]
        var miny = this.maintain[0][0][1]
        var maxy = this.maintain[len][this.maintain[len].length - 1][1]
        var maxx = this.maintain[len][this.maintain[len].length - 1][0]

        for (var i = 0; i < msg.length; i++) {
            // debugger
            if (msg[i][0] >= minx && msg[i][1] >= miny) {
                if (msg[i][0] < maxx && msg[i][1] < maxy) {
                    // debugger
                    if (msg[i][2] != this.rgbCdict(this.maintain[msg[i][1] - this.y] [msg[i][0] - this.x] [2])) {
                        if (this.tasks.indexOf(msg[i]) == -1) {
                            this.tasks.push(place(msg[i][0], msg[i][1], this.rgbCdict(this.maintain[msg[i][1] - this.y][msg[i][0] - this.x][2])))
                        }
                    }
                }
            }
        }
    }

    place(x, y) {
        this.x = x
        this.y = y
        for (var y2 = 0; y2 < this.maintain.length; y2++) {
            for (var x2 = 0; x2 < this.maintain[y2].length; x2++) {

                if (!this.check(this.maintain[y2][x2][2], x + x2, y + y2)) {
                    for (var i = 0; i < cdict.length; i++) {
                        if (cdict[i].every((val, index) => val === this.maintain[y2][x2][2][index])) {
                            this.tasks.push(place(this.maintain[y2][x2][0], this.maintain[y2][x2][1], i))
                        }
                    }
                }
            }
        }
    }

    rgbCdict(rgb) {
        for (var i = 0; i < cdict.length; i++) {
            if (cdict[i].every((val, index) => val === rgb[index])) {
                return i
            }
        }
    }
}

class Bot {
    constructor(connection, id) {
        this.connection = connection
        this.id = id

    }
    init() {
        try {
            this.connection.on('message', (msg) => {
                var parsed = parseMessage(msg.utf8Data)
                if (parsed.type == 'throw.error' && parsed.msg == '0') {
                    const token = require('./token.json')
                    token.users[this.id].time = 0

                    var json = {}
                    json.users = token.users
                    fs.writeFileSync('./token.json', JSON.stringify(json, null, 2))
                    this.abort('authError (skill issue)')
                }
                if (parsed.type == 'canvas.alert' && parsed.msg.contains('disabled')) {
                    var time = parseInt(parsed.msg.split(':')[1])
                    this.abort(`you just got assfucked by a moderator for ${time} minutes`)
                }
                if (parsed.type == 'p') {
                    task.pHandler(parsed.msg)
                }
            })
        } catch(e) {
            console.error(`you just got skill issued by: ${e}`)
        }
    }
    abort(reason) {
        console.error(`${this.id}: ABORTING: ${reason}`)
                
        for (var i = 0; i < task.bots.length; i++) {
            if (task.bots[i].id == this.id) {
                task.bots.splice(i, 1)
            }
        }
        this.connection.close()
    }
    tick(pixel) {
        // console.log(`${this.id}: ${pixel}`)
        // TODO: check if pixels were actually placed by listening for bots userid on "p" message
        this.connection.sendUTF(pixel)
    }
}

const task = new TaskManager()

// console.log(task.tasks)


class Client {
    constructor(userJson, id, boardid) {
        this.userJson = userJson
        this.id = id
        this.boardid = boardid
    }
    init() {
        return new Promise((resolve, reject) => {
            var client = new WebSocketClient()
            var that = this
    
            client.on('connectFailed', function(error) {
                console.log('Connect Error: ' + error.toString());
            });
            client.on('connect', function(connection) {
                // console.log('WebSocket Client Connected');
                connection.on('error', function(error) {
                    console.log("Connection Error: " + error.toString())
                });
                connection.on('close', function() {
                    // real
                    console.error(that.id + ": Connection terminated. I'm sorry to interrupt you, Elizabeth, if you still even remember that name, But I'm afraid you've been misinformed.")
                });
                connection.on('message', async function(message) {
                    if (message.type === 'utf8') {
                        var parsed = parseMessage(message.utf8Data)
                        // if (parsed.type != 'p' && parsed.type != 'chat.user.message' && parsed.type != 'l' && parsed.type != 'j') {
                        //     console.log(`Recieved: ${parsed.id}, ${parsed.type}, ${parsed.msg}`);
                        //     console.log(parsed.msg)
                        // }
                        // if (parsed.id == 0) {
                        //     console.log(message.utf8Data)
                        // }
            
                        // console.log(message.utf8Data)
                        if (parsed.id == '40') {
                            // console.log('Authenticating')
                            connection.sendUTF(buildAuth(that.userJson, that.boardid))
            
                            // keepalive
                            setInterval(() => {connection.send('2')}, 26000)
                            
                            const bot = new Bot(connection, that.id)
                            bot.init()
    
                            task.bots.push(bot)
                            resolve(that.id)
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
    
            function buildAuth(userJson, boardid) {
                return `42["init",{"authKey":"${userJson.authKey}","authToken":"${userJson.authToken}","authId":"${userJson.authId}","boardId":${boardid}}]`
            }
        })
    }
}

>>>>>>> main

const sleep = ms => new Promise( res => setTimeout(res, ms));

(async () => {
    console.log(`Initializing on ${boardId}`)
    await task.init(boardId)
    // task.grief(730, 127, 1000, 330, 0)
    await task.parseImage('test.png')
    task.place(2800, 0)
    var users = await login.start()
<<<<<<< HEAD
    if (users.length == 0) {console.error('no bots (skill issue)'); process.exit(1)}
    task.wait = 20
=======
    // this speed is for anarchy only
    // it is recommended to use default when youre unsure
    task.wait = 75
>>>>>>> main
    for (var i = 0; i < users.length; i++) {
        var client = new Client(users[i], i, boardId, task)
        
        await client.init().then((id) => {
            if (id == users.length - 1) { 
                task.emit('ready'); 
            }
        })
    }
<<<<<<< HEAD
=======
    await task.drawImage('real3.jpg', 730, 127)
    task.place(730, 127)
>>>>>>> main

    // task.drawImage('real3.jpg', 1560, 556)
    // task.grief(1392, 1632, 1491, 1731, 6)
    // console.log([255,255,255].every((val, index) => val === [255,255,255][index]))
    // console.log()
    
    
    // await sleep(10000000)
})();

// task.paused = !task.paused
// task.drawRect(120, 120, 10, 10, 15)

task.on('ready', () => {
    console.log('all systems are go!')
    task.ticker()
<<<<<<< HEAD
})
=======
})

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
// TODO: do rgb quantisizing when placing only
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
>>>>>>> main
