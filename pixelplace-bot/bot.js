const fs = require('fs')
const WebSocketClient = require('websocket').client;

class Client {
    constructor(userJson, id, boardid, tasker) {
        this.userJson = userJson
        this.id = id
        this.boardid = boardid
        this.tasker = tasker
        this.pps = 0
    }
    init() {
        return new Promise((resolve, reject) => {
            var client = new WebSocketClient()
            var that = this
    
            client.on('connectFailed', function(error) {
                console.log(that.id + ': WS Connect Error: ' + error.toString());
            });
            client.on('connect', function(connection) {
                // console.log('WebSocket Client Connected');
                connection.on('error', function(error) {
                    console.log(that.id + ": Connection Error: " + error.toString())
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
                            
                            const bot = new Bot(connection, that.id, that.tasker)
                            bot.init()
    
                            that.tasker.bots.push(bot)
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

// TODO: fix bots not authenticating right
class Bot {
    constructor(connection, id, tasker) {
        this.connection = connection
        this.id = id
        this.tasker = tasker
        this.pps = 0
    }
    init() {
        try {
            this.connection.on('message', (msg) => {
                var parsed = parseMessage(msg.utf8Data)
                // console.log(parsed)
                if (parsed.type == 'throw.error' && parsed.msg == '0') {
                    const token = require('../token.json')
                    token.users[this.id].time = 0

                    fs.writeFileSync('./token.json', JSON.stringify(token, null, 2))
                    this.abort('authError (skill issue)')
                } else if (parsed.type == 'throw.error' && parsed.msg == '4') {
                    this.abort('premium color error')
                } else if (parsed.type == 'throw.error') {
                    console.error(`${this.id}: ${JSON.stringify(msg)}`)
                }
                if (parsed.type == 'canvas.alert' && parsed.msg.contains('disabled')) {
                    var time = parseInt(parsed.msg.split(':')[1])
                    this.abort(`you just got assfucked by a moderator for ${time} minutes`)
                }
                if (parsed.type == 'p' && this.tasker.bots[0].id == this.id) {
                    for (var i = 0; i < parsed.msg.length; i++) {
                        this.tasker.pHandler(parsed.msg[i])
                    }
                }
                if (parsed.type == 'ping.alive') {
                    this.connection.sendUTF(this.pongAlive())
                }
            })
        } catch(e) {
            console.error(`you just got skill issued by: ${e}`)
        }
    }
    abort(reason) {
        console.error(`${this.id}: ABORTING: ${reason}`)
                
        for (var i = 0; i < this.tasker.bots.length; i++) {
            if (this.tasker.bots[i].id == this.id) {
                this.tasker.bots.splice(i, 1)
            }
        }
        this.connection.close()
    }
    tick(pixel) {
        this.connection.sendUTF(place(pixel[0], pixel[1], pixel[2]))
        this.pps += 1
        // console.log(place(pixel[0], pixel[1], pixel[2]))
    }
    // courtesy of 0vC4
    pongAlive = () => {
        const {random} = Math;
        const word = 'gmbozcfxta';
    
        function hash(size) {
            const arr = [];
            const str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            for (var i = 0; i < size; i++) arr.push(str[random()*str.length | 0]);
            return arr.join('');
        }
    
        function hash2(size) {
            const arr = [];
            const str = "gmbonjklezcfxtaGMBONJKLEZCFXTA";
            for (var i = 0; i < size; i++) arr.push(str[random()*str.length | 0]);
            return arr.join('');
        }
    
        let result = '';
        const seed = (((new Date().getTime()/1e3|0) + 1678) + '').split('');
        const arr = [hash(5),hash(7),hash2(3),hash(8),hash2(6),hash(3),hash(6),hash2(4),hash(7),hash(6)];
        for (const i in seed) {
            result += arr[i];
            result += !(random()*2|0) ? word[+seed[i]].toUpperCase() : word[+seed[i]];
        }
        result += '0=';
    
        return `42["pong.alive","${result}"]`;
    };
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

module.exports = Client