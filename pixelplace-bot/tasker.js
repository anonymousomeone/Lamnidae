const Jimp = require('jimp')
const EventEmitter = require('events');
const { cdict, colors } = require('./cdict.json');

const { createCanvas } = require('canvas')
const QRCode = require('qrcode')

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
        this.wait = 25

        this.cache = []
        this.pcache = []
    }
    /*
                   ===========================================================================
    core functions ===========================================================================
                   ===========================================================================
    */ 
    async init(id) {
        console.log('Processing canvas')
        var ms = Date.now()
        // get canvas woooooo
        var url = `https://pixelplace.io/canvas/${id}.png?t200000=${Date.now()}`
        const image = await Jimp.read(url);
        var that = this

        var arr = []

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
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
    
    parseImage(img) {
        console.log(`Processing ${img}`)
        var date = Date.now()
        return new Promise(async (resolve, reject) => {
            await Jimp.read(img, (err, image) => {
                var arr = []
                var res = []
                image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
                   
                    var red = this.bitmap.data[idx + 0];
                    var green = this.bitmap.data[idx + 1];
                    var blue = this.bitmap.data[idx + 2];
                    var alpha = this.bitmap.data[idx + 3];
                    var rgb = findColor([red, green, blue])

                    if (alpha != 0) arr.push([x, y, rgb])
                    if (x >= image.bitmap.width - 1) {
                        res.push(arr);
                        arr = [];
                    }
                });
                // make a local array so we can do operations like randomize pixel placements without modifying the task queue
                this.maintain.push(...res)
                // console.log('done')
                console.log(`Processed in ${Date.now() - date}ms`)
                resolve()
            })
        })
        // console.log('converting image')
    }
    
    ticker() {
        console.log(`TASKER: drawing with ${this.bots.length} bots`)
        setInterval(() => {
            if (this.bots.length <= 0) {
                console.error('TASKER: no bots?\ninsert megamind meme here')
                // process.exit(1)
            }
            
            for (var i = 0; i < this.bots.length; i++) {
                if (this.griefing && !this.paused) {
                    var x = Math.floor(Math.random() * this.w) + this.x
                    var y = Math.floor(Math.random() * this.h) + this.y
                    // if (!this.check(this.color, x, y)) {
                        this.tasks.push([x, y, this.color])
                    // }
                }
                if (!this.paused && this.tasks.length != 0) {
                    this.bots[i].tick(this.tasks[0])
                    this.tasks.shift()
                }
            }

        }, this.wait)
    }

    check(rgb, x, y) {
        return rgb.every((val, index) => val === findColor(this.canvas[y][x][2])[index]) || this.canvas[y][x][2].every((val, index) => val === [204, 204, 204][index])
    }

    // check if pixel is background
    background(x, y) {
        return this.canvas[y][x][2].every((val, index) => val === [204, 204, 204][index])
    }

    
    pHandler(msg) {
        if (this.maintain[0] == undefined) return
        if (this.maintain[0][0] == undefined) return
        // me when math 😭😭😭
        var len = this.maintain.length - 1
        var minx = this.maintain[0][0][0] + this.x
        var miny = this.maintain[0][0][1] + this.y
        var maxx = this.maintain[len][this.maintain[len].length - 1][0] + this.x
        var maxy = this.maintain[len][this.maintain[len].length - 1][1] + this.y
            
        if (msg[0] >= minx && msg[1] >= miny) {
            if (msg[0] < maxx && msg[1] < maxy) {
                // console.log(this.rgbCdict(this.maintain[msg[i][1] - this.y] [msg[i][0] - this.x] [2]))
                
                if (msg[2] != this.rgbCdict(this.maintain[msg[1] - this.y] [msg[0] - this.x] [2])) {
                    this.tasks.push([msg[0], msg[1], this.rgbCdict(this.maintain[msg[1] - this.y][msg[0] - this.x][2])])
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
                            this.tasks.push([this.maintain[y2][x2][0] + x, this.maintain[y2][x2][1] + y, this.rgbCdict(this.maintain[y2][x2][2])])
                        }
                    }
                }
            }
        }
    }
    
    // rgb value to pixelplace color int (no quantisizing)
    rgbCdict(rgb) {
        for (var i = 0; i < cdict.length; i++) {
            if (cdict[i].every((val, index) => val === rgb[index])) {
                return i
            }
        }
    }

    // inverse of rgbCdict()
    cdictRgb(i) {
        return cdict[i]
    }

    // TODO: move these to seperate files (like in discord bots?)
    /*
                   ===========================================================================
    misc functions ===========================================================================
                   ===========================================================================
    */ 
    
    grief(x, y, x2, y2, c) {
        this.griefing = true
        this.x = x
        this.y = y
        // why do math, when you can have the code do it for you?
        this.w = x2 - x
        this.h = y2 - y
        this.color = c
    }

    /**
     * check if pixel is within ```w``` pixels of a [204, 204, 204] pixel
     * 
     * for Pallete (0vC4#7152) :)
     * 
     * help my balls have rusted shut due to logic
     * @param {Integer} x 
     * @param {Integer} y 
     * @param {Integer} w width
     * @returns {Boolean} true/false
     */
    border(x, y, w) {
        w++
        // me when the O(n^2)
        for (var i = 0; i < w; i++) {
            for (var z = 0; z < w; z++) {
                if (this.canvas[y + z][x + i][2].every((v, i) => v === [204, 204, 204][i]) && !this.canvas[y][x][2].every((v,i)=>v===[204,204,204][i])) return true
            }
            for (var z = 0; z < w; z++) {
                if (this.canvas[y + z][x - i][2].every((v, i) => v === [204, 204, 204][i]) && !this.canvas[y][x][2].every((v,i)=>v===[204,204,204][i])) return true
            }
            for (var z = 0; z < w; z++) {
                if (this.canvas[y - z][x + i][2].every((v, i) => v === [204, 204, 204][i]) && !this.canvas[y][x][2].every((v,i)=>v===[204,204,204][i])) return true
            }
            for (var z = 0; z < w; z++) {
                if (this.canvas[y - z][x - i][2].every((v, i) => v === [204, 204, 204][i]) && !this.canvas[y][x][2].every((v,i)=>v===[204,204,204][i])) return true
            }
        }
        return false
    }

    drawRect(x, y, w, h, c) {
        // time complexity be goin through the roof (real)
        for (var a = 0; a < w; a++) {
            for (var b = 0; b < h; b++) {
                this.tasks.push([x + a, y + b, c])
            }
        }
        this.emit('update')
    }

    amogifier(x, y) {
        var amogugugugugus = [['.', '$', '$', '$'],
                              ['%', '$', '#', '#'],
                              ['%', '$', '$', '$'],
                              ['.', '$', '.', '$']]

        var moaayi = [['#', '#', '#', '#'],
                      ['.', '#', '#', '.'],
                      ['.', '#', '#', '.'],
                      ['.', '#', '#', '.'],
                      ['.', '.', '.', '.'],
                      ['.', '#', '#', '.'],
                      ['.', '.', '.', '.']]

        for (var i = 0; i < amogugugugugus.length; i++) {
            for (var z = 0; z < amogugugugugus[i].length; z++) {
                if (amogugugugugus[i][z] == '.') continue
                if (amogugugugugus[i][z] == '#') this.tasks.push([z + x, i + y, 37])
                if (amogugugugugus[i][z] == '%') this.tasks.push([z + x, i + y, 19])
                else this.tasks.push([z + x, i + y, 20])
            }
        }
    }

    // draw rect but only within b pixels of border
    drawBorder(x, y, w, h, c, b) {
        for (var i = 0; i < w; i++) {
            for (var z = 0; z < h; z++) {
                if (this.border(x + z, y + i, b) && !this.check(this.cdictRgb(c), x + z, y + i)) {
                    this.tasks.push([x + z, y + i, c])
                    // console.log(place(x + z, y + i, c))
                }
            }
        }
    }

    // like draw border, but rainbow!!!
    rainbowDrawBorder(x, y, x2, y2, b) {
        var w = x2 - x
        var h = y2 - y
        var col = 0
        for (var i = 0; i < h; i++) {
            for (var z = 0; z < w; z++) {
                if (this.border(x + z, y + i, b) && !this.background(x + z, y + i)) {
                    for (var k = 0; k < cdict.length; k++) {
                        if (cdict[k].every((v, i) => v === colors[col][i]) && !this.check(this.cdictRgb(k), x + z, y + i)) {
                            this.tasks.push([x + z, y + i, k])
                        }
                    }
                    col++
                    if (colors.length <= col) col = 0
                    // console.log(place(x + z, y + i, c))
                }
            }
        }
    }

    async qrCode(x, y, text, scale='4') {
        const canvas = createCanvas(1, 1)

        const opts = { errorCorrectionLevel: 'H', margin: '1', scale: scale}
        const cv = await QRCode.toCanvas(canvas, text, opts)
        const context = cv.getContext('2d')
        
        const data = context.getImageData(0, 0, cv.width, cv.height);
        const arr = sliceIntoChunks(data.data, cv.width * 4)
        
        // console.log(arr)
        for (var i = 0; i < arr.length; i++) {
            // 4 cus Uint8ClampedArray is [r, g, b, a, r, g, b, a ...]
            var x2 = 0
            for (var z = 0; z < arr[i].length; z += 4) {
                const r = arr[i][z]
    
                if (!this.check([arr[i][z], arr[i][z + 1], arr[i][z + 2]], x2 + x, i + y)) {
                    // ternary operator moment
                    this.tasks.push(r == 0 ? [x2 + x, i + y, 5] : [x2 + x, i + y, 0])
                }
                x2++;
            }
        }
    }
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
// TODO: compare dist when drawing
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

function sliceIntoChunks(arr, chunkSize) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}
module.exports = TaskManager