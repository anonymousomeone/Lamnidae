const fs = require('fs')
const WebSocketClient = require('websocket').client;

class Client {
    constructor(userJson, id, boardid, tasker) {
        this.userJson = userJson
        this.id = id
        this.boardid = boardid
        this.tasker = tasker
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
    }
    init() {
        try {
            this.connection.on('message', (msg) => {
                var parsed = parseMessage(msg.utf8Data)
                if (parsed.type == 'throw.error' && parsed.msg == '0') {
                    const token = require('../token.json')
                    token.users[this.id].time = 0

                    fs.writeFileSync('./token.json', JSON.stringify(token, null, 2))
                    this.abort('authError (skill issue)')
                }
                if (parsed.type == 'canvas.alert' && parsed.msg.contains('disabled')) {
                    var time = parseInt(parsed.msg.split(':')[1])
                    this.abort(`you just got assfucked by a moderator for ${time} minutes`)
                }
                if (parsed.type == 'p') {
                    this.tasker.cache.push(parsed.msg)
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
        // console.log(`${this.id}: ${pixel}`)
        // TODO: check if pixels were actually placed by listening for bots userid on "p" message
        this.tasker.pcache.push({pixel: pixel, time: Date.now()})
        // TODO: build place message in bot
        this.connection.sendUTF(pixel)
    }
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

module.exports = Client