const puppeteer = require('puppeteer');
const fs = require('fs')
const UserAgent = require('user-agents')

class LoginManager {
    constructor(users) {
        this.users = users
    }

    async login(id) {
        try {
            var user = this.users[id]
            console.log(`trying to login as: ${user.name}`)
            var page = await this.browser.newPage()

            await page.goto('https://pixelplace.io/', { timeout: 60000 });
            await page.waitForSelector('.desktop', {hidden: false, timeout: 50000})

            // be absolutely sure we are loaded
            await this.sleep(300)
            console.log('loaded')

            // get to login popup
            await page.mouse.click(0, 0, {button: 'left'})
            await page.mouse.click(0, 0, {button: 'left'})

            await page.evaluate((user) => {
                var elements = document.getElementById('form-account-login').children
                var btn;
                for (var i = 0; i < elements.length; i++) {
                    if (elements[i].name == "email") {
                        elements[i].value = user.email
                    } else if (elements[i].name == "password") {
                        elements[i].value = user.pass
                    } else if (elements[i].id == 'submit-account-login') {
                        btn = elements[i]
                    }
                }
                var clickEvent = new MouseEvent("click", {
                    "view": window,
                    "bubbles": true,
                    "cancelable": false
                })
                btn.dispatchEvent(clickEvent)
            }, user)

            await page.waitForSelector('#recaptcha', {hidden: false, timeout: 10000})
            // 50 seconds to solve a captcha seems enough
            await page.waitForSelector('#recaptcha', {hidden: true, timeout: 50000})
            
            // site is slow, need to wait 2s to let it set cookies for some reason
            await this.sleep(2000)
            var data = await page._client.send('Network.getAllCookies');
            for (var i = 0; i < data.cookies.length; i++) {
                if (data.cookies[i].name == 'authId') {
                    user.authId = data.cookies[i].value
                } else if (data.cookies[i].name == 'authToken') {
                    user.authToken = data.cookies[i].value
                } else if (data.cookies[i].name == 'authKey') {
                    user.authKey = data.cookies[i].value
                }
                user.time = Date.now()
            }
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            console.log('logged in!')
            await page.close()

            this.users[id] = user
            return user
        } catch(e) {
            console.error(`you just got skill issued by: ${e}`)
        }
    }
    
    async start() {
        var toLogin = []
        for (var i = 0; i < this.users.length; i++) {
            if (!('time' in this.users[i])) continue
            // check if auth thingies are still valid, and only ask to login for invalids
            // TODO: get actual auth timeout time
            // note: trying to authenticate again without it expiring breaks everything
            if (Date.now() - this.users[i].time > 3600000) {
                toLogin.push(i)
            } else {
                loggedin.push(this.users[i])
            }
        }
        
        var loggedin = []
        if (toLogin.length > 0) {
            try {
                // console.log("Opening the browser......");

                const useragent = new UserAgent()

                var x = Math.floor(Math.random() * 500) + 500;
                var y = Math.floor(Math.random() * 500) + 500;

                this.browser = await puppeteer.launch({
                    headless: false,
                    args: ['--disable-web-security', 
                    '--disable-features=IsolateOrigins,site-per-process',
                    "--user-agent=" + useragent + "",
                    `--window-size=${x},${y}`,
                    // TODO: implement rotating proxy for every new login,
                    // to bypass same ip checking
                    // https://api.proxyscrape.com/v2/?request=proxyinfo&protocol=http&timeout=1400&country=all&ssl=all&anonymity=all&simplified=true
                    // '--proxy-server=5.39.189.39:3128'
                    ]
                })
            } catch (err) {
                console.log("Could not create a browser instance => : ", err);
            }

            for (var i = 0; i < toLogin.length; i++) {
                var user = await this.login(toLogin[i])
                if (user != undefined) loggedin.push(user)
            }
            await this.browser.close()
        } else {
            console.log('Skipping login')
        }

        var json = {}
        json.users = this.users
        fs.writeFileSync('./token.json', JSON.stringify(json, null, 2))
        // console.log(this.users)
        // console.log(loggedin)
        return loggedin
}
    sleep = ms => new Promise( res => setTimeout(res, ms));
}

// const { users } = require('../token.json')
// console.log(users)
// const login = new LoginManager(users)
// login.init().then(() => {
//     login.start()
// })

module.exports = LoginManager;