const puppeteer = require('puppeteer');

class LoginManager {
    constructor(users) {
        this.users = users
    }

    init() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log("Opening the browser......");

                this.browser = await puppeteer.launch({
                    headless: false,
                    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
                })
                resolve()
            } catch (err) {
                console.log("Could not create a browser instance => : ", err);
            }
        })
    }

    login(id) {
        return new Promise(async (resolve, reject) => {
            console.log(`trying to login as: ${this.users[id].name}`)
            var page = await this.browser.newPage()
            // go to a dead painting so waitUntil: networkidle0 works
            await page.goto('https://pixelplace.io/52923-faked');
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
            }, this.users[id])
            // 50 seconds to solve a captcha seems enough
            await page.waitForSelector('#recaptcha', {hidden: true, timeout: 50000})
            console.log('logged in!')

            // site is slow, need to wait 2s to let it set cookies for some reason
            await this.sleep(2000)
            var data = await page._client.send('Network.getAllCookies');
            for (var i = 0; i < data.cookies.length; i++) {
                if (data.cookies[i].name == 'authId') {
                    this.users[id].authId = data.cookies[i].value
                } else if (data.cookies[i].name == 'authToken') {
                    this.users[id].authToken = data.cookies[i].value
                } else if (data.cookies[i].name == 'authKey') {
                    this.users[id].authKey = data.cookies[i].value
                }
            }
            await page.close()
            resolve()
        })
    }

    start() {
        return new Promise (async (resolve, reject) => {
            for (var i = 0; i < this.users.length; i++) {
                // TODO: check if auth thingies are still valid, and only ask to login for invalids
                await this.login(i)
            }
            // await this.browser.close()
            resolve(this.users)
        })
    }
    sleep = ms => new Promise( res => setTimeout(res, ms));
}

module.exports = LoginManager;