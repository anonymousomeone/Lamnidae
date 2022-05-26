const { boardId } = require('./config.json');
const { users } = require('./token.json')
const LoginManager = require('./pixelplace-bot/login.js')
const Client = require('./pixelplace-bot/bot.js')
const TaskManager = require('./pixelplace-bot/tasker.js')
var readline = require('readline');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const login = new LoginManager(users)
const task = new TaskManager()

// TODO: make desktop app with electron.js because hehehehaw
// so it better than bababot
// https://www.electronjs.org/

const sleep = ms => new Promise( res => setTimeout(res, ms));

(async () => {
    console.log(`Initializing on ${boardId}`)
    await task.init(boardId)
    // task.grief(1731, 500, 2030, 799, 20)
    // var len = task.canvas.length - 1
    // console.log(task.canvas[len][task.canvas[len].length - 1][1])
    // task.drawBorder(960, 1550, 536, 640, 36, 2)
    // task.rainbowDrawBorder(2, 2, 2497, 2085, 2)
    // console.log(task.tasks.length)
    // console.log(task.tasks.length)
    // task.place(1604, 484)

    // await task.parseImage('test.png')
    // task.place(2800, 0)
    var users = await login.start()
    if (users.length == 0) {console.error('no bots (skill issue)'); process.exit(1)}
    task.wait = 25 // delay between ticks
    for (var i = 0; i < users.length; i++) {
        var client = new Client(users[i], i, boardId, task)
        
        await client.init().then((id) => {
            if (id == users.length - 1) { 
                task.emit('ready'); 
            }
        })
    }

    setInterval(() => {
        task.amogifier(Math.floor(Math.random() * (2074 - 1512)) + 1512, Math.floor(Math.random() * (816 - 525) + 525))
        var pps = 0
        for (var i = 0; i < task.bots.length; i++) {
            pps += task.bots[i].pps
            task.bots[i].pps = 0
        }
        var completion = (task.tasks.length / pps)
        process.stdout.write(`Pixels remaining: ${task.tasks.length}\nEst. time to completion: ${completion ?? 0} seconds\nPPS: ${pps}`)
        // console.log(`${task.cache.length} / ${task.pcache.length}`)
    }, 1000)
})();

task.on('ready', async () => {
    console.log('all systems are go!')
    await task.parseImage('test.png')
    // task.place(723, 140)
    task.place(440, 180)
    task.ticker()
})

rl.on('line', function(line){
    console.log(line);
})