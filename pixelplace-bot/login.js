const puppeteer = require('puppeteer');
const { users } = require('../token.json')

async function scraper(browser) {
    let page = await browser.newPage();
    console.log(`Navigating to ${this.url}...`);
    // Navigate to the selected page
    await page.goto(this.url);
    // Wait for the required DOM to be rendered
    await page.waitForSelector('.page_inner');
    // Get the link to all the required books
    let urls = await page.$$eval('section ol > li', links => {
        // Make sure the book to be scraped is in stock
        links = links.filter(link => link.querySelector('.instock.availability > i').textContent !== "In stock")
        // Extract the links from the data
        links = links.map(el => el.querySelector('h3 > a').href)
        return links;
    });
    console.log(urls);
}

class BrowserManager {
    constructor() {

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

    open(id) {
        return new Promise(async (resolve, reject) => {
            console.log(this.browser)
            var page = await this.browser.newPage()
            await page.goto('https://pixelplace.io', {waitUntil: 'networkidle0'});

            // be absolutely sure we are loaded
            await sleep(300)
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
            }, users[id])
            // 50 seconds to solve a captcha seems enough
            await page.waitForSelector('#recaptcha', {hidden: true, timeout: 50000})
            console.log('logged in!')
        })
    }
}

const browser = new BrowserManager()

const sleep = ms => new Promise( res => setTimeout(res, ms));

browser.init().then(() => {
    browser.open(2)
})