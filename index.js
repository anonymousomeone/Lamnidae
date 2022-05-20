const { boardId } = require('./config.json');
const { users } = require('./token.json')
const LoginManager = require('./pixelplace-bot/login.js')
const Client = require('./pixelplace-bot/bot.js')
const TaskManager = require('./pixelplace-bot/tasker.js')

const login = new LoginManager(users)
const task = new TaskManager()

// TODO: make desktop app with electron.js because hehehehaw
// so it better than bababot
// https://www.electronjs.org/

const sleep = ms => new Promise( res => setTimeout(res, ms));

(async () => {
    console.log(`Initializing on ${boardId}`)
    await task.init(boardId)
    // task.grief(730, 127, 1000, 330, 0)
    task.drawBorder(960, 1660, 100, 100, 31, 1)
    // await task.parseImage('rainbow.png')
    // task.place(2500, 300)
    var users = await login.start()
    if (users.length == 0) {console.error('no bots (skill issue)'); process.exit(1)}
    task.wait = 25
    for (var i = 0; i < users.length; i++) {
        var client = new Client(users[i], i, boardId, task)
        
        await client.init().then((id) => {
            if (id == users.length - 1) { 
                task.emit('ready'); 
            }
        })
    }
})();

task.on('ready', () => {
    console.log('all systems are go!')
    task.ticker()
})
