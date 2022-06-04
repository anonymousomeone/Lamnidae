const { boardId } = require('./config.json');
const { users } = require('./token.json')
const LoginManager = require('./pixelplace-bot/login.js')
const Client = require('./pixelplace-bot/bot.js')
const TaskManager = require('./pixelplace-bot/tasker.js')
const Server = require('./pixelplace-bot/server.js')

const login = new LoginManager(users);
const task = new TaskManager();
const server = new Server(task);

server.init();

// TODO: finish lamnidae-extension gui

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
    task.wait = 23 // delay between ticks
    for (var i = 0; i < users.length; i++) {
        var client = new Client(users[i], i, boardId, task)
        
        await client.init().then((id) => {
            if (id == users.length - 1) { 
                task.emit('ready'); 
            }
        })
    }

    setInterval(() => {
        // var hx = 1800
        // var lx = 1500

        // var hy = 1600
        // var ly = 1400
        // for (var i = 0; i < task.bots.length; i++) {
        //     task.amogifier(Math.floor(Math.random() * (hx - lx)) + lx, Math.floor(Math.random() * (hy - ly) + ly))
        // }

        var pps = 0
        for (var i = 0; i < task.bots.length; i++) {
            pps += task.bots[i].pps
            task.bots[i].pps = 0
        }
        var completion = (task.tasks.length / pps)
        console.log(`Pixels remaining: ${task.tasks.length}\nEst. time to completion: ${completion == NaN ? completion : 0} seconds\nPPS: ${pps}\n${task.pcache.length} / ${task.cache.length}`)
        // console.log(`${task.cache.length} / ${task.pcache.length}`)
    }, 1000)
})();

task.on('ready', async () => {
    console.log('all systems are go!')
    await task.parseImage('test.png')
    .catch(reason => {console.error(`could not read image with error: ${reason}`)})
    task.place(723, 140)
    // task.place(2800, 0)
    // await task.qrCode(800, 250, 'https://www.thisworldthesedays.com/real162.html')
    task.ticker()
})