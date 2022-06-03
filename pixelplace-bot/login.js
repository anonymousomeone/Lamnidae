const puppeteer = require('puppeteer');
const fs = require('fs')
const UserAgent = require('user-agents')
const https = require('node:https')
const { boardId } = require('../config.json')

class LoginManager {
    constructor(users) {
        this.users = users
    }

    /**
     * get authId/stuff of user
     * 
     * @param {Object} user object with ```password``` and ```email``` properties
     * @returns {Object} object with auth things (if logged in successfully)
     */
    async login(user) {
        try {
            console.log(`trying to login as: ${user.name}`)
            var page = await this.browser.newPage()

            await page.goto('https://pixelplace.io/', { timeout: 60000 });

            await this.sleep(300)
            
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
            
            // sometimes skips captcha for some reason
            await this.sleep(1000)
            await page.waitForSelector('#recaptcha', {hidden: false, timeout: 10000})
            await this.sleep(1000)
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
            }
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');
            console.log('logged in!')
            await page.close()

            this.users[user.id] = user
            await this.join(user)
            await this.sleep(200)
            return user
        } catch(e) {
            console.error(`you just got skill issued by: ${e}`)
        }
    }
    
    /**
     * log in to ```LoginManager.users```
     * 
     * @returns {Array} array of logged in users
     */
    async start() {
        var toLogin = []
        var loggedin = []
        for (var i = 0; i < this.users.length; i++) {
            this.users[i].id = i
            var res = await this.join(this.users[i])
            const regexp = /=([^;]*);/;
            if (res.headers.hasOwnProperty("set-cookie")) {
                if (!res.headers["set-cookie"][0].includes('deleted')) {
                    this.users[i].authId = regexp.exec(res.headers["set-cookie"][0])[1]
                    this.users[i].authKey = regexp.exec(res.headers["set-cookie"][1])[1]
                    this.users[i].authToken = regexp.exec(res.headers["set-cookie"][2])[1]
                }
            }
            if (res.user.connected) { loggedin.push(this.users[i]) }
            else { toLogin.push(this.users[i]) }
        }
        
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
        return this.users
}
    sleep = ms => new Promise( res => setTimeout(res, ms));

    /**
     * make a request to pixelplace.io/api/get-painting.php
     * and refresh auth thingies or something
     * 
     * @param {Object} user object with authId, authToken, and authKey properties
     * @returns {Promise} resolved when request completed with request headers and data
     */
    join(user) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'pixelplace.io',
                port: 443,
                path: `/api/get-painting.php?id=${boardId}&connected=1`,
                method: 'GET',
                headers: {
                    cookie: this.buildCookie(user)
                }
              };
              var json = ""
              const req = https.request(options, res => {
                res.on('data', d => {
                    json += d.toString()
                    try {
                        json = JSON.parse(json)
                        json.headers = res.headers
                        resolve(json)
                    } catch(e) {/* hehehehaw */}
                });
              });
              
              req.on('error', error => {
                console.error(error);
              });
              
              req.end();
        })
    }
    /**
     * build cookie payload for get-painting.php
     * 
     * @param {Object} user object with authId, authKey, and authToken properties
     * @returns correct cookie payload for api request to get-painting.php
     */
    buildCookie(user) {
        return `authId=${user.authId}; authKey=${user.authKey}; authToken=${user.authToken}`
    }
}

// const { users } = require('../token.json')
// console.log(users)
// const login = new LoginManager(users)
// login.init().then(() => {
//     login.start()
// })

module.exports = LoginManager;