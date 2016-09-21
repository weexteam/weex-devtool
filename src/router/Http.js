const Router = require('koa-router');
const MemoryFile = require('../components/MemoryFile');
const Fs = require('fs');
const Logger = require('../components/Logger');
const protocols = {
    'http:': require('http'),
    'https:': require('https')
}
const Path = require('path');
const URL = require('url');
const Config = require('../components/Config');
const Builder = require('../components/Builder');
const bundleWrapper = require('../util/BundleWrapper');

var httpRouter = Router();
function getRemote(url) {
    return new Promise(function (resolve, reject) {
        let urlObj = URL.parse(url);
        (protocols[urlObj.protocol]||protocols['http']).get({
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Weex/1.0.0'
            }
        }, function (res) {
            var chunks = [];
            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            res.on('end', function () {
                resolve(Buffer.concat(chunks).toString());
                chunks = null;
            });
        }).on('error', function (e) {
            reject(e);
        });
    });

}
let rSourceMapDetector = /\.map$/;
httpRouter.get('/source/*', function*(next) {

    var path = this.params[0];
    if (rSourceMapDetector.test(path)) {
        //fixme 硬写协议头 隐患
        let content = yield getRemote('http://' + path);
        if (!content) {
            this.response.status = 404;
        }
        else {
            this.response.status = 200;
            this.set('Access-Control-Allow-Origin','*');
            this.type = 'text/javascript';
            this.response.body = content;
        }
    }
    else {
        let query = this.request.url.split('?');

        query = query[1] ? '?' + query.slice(1).join('?') : '';
        var file = MemoryFile.get(path + query);
        if (file) {
            this.response.status = 200;
            this.type = 'text/javascript';
            if (file.url) {
                let content = yield getRemote(file.url).catch(function (e) {
                    Logger.error(e);
                });
                if (!content) {
                    this.response.body = file.getContent();
                }
                else {
                    this.response.body = bundleWrapper(content,file.getUrl());
                }
            }
            else {
                this.response.body = file.getContent();
            }

        }
        else {
            this.response.status = 404;
        }
    }
});
function exists(file) {
    return new Promise((resolve, reject)=> {
        Fs.exists(file, function (flag) {
            resolve(flag);
        })
    });
}
let bundleDir = Path.join(__dirname, '../../frontend/', Config.bundleDir);
httpRouter.get('/' + Config.bundleDir + '/*', function*(next) {
    let ext = Path.extname(this.params[0]);
    if (ext == '.js' || ext == '.we') {
        let dir = Path.dirname(this.params[0]);
        let basename = Path.basename(this.params[0], ext);
        let bundle = Path.join(bundleDir, dir, basename + '.js');
        let we = Path.join(Config.root || bundleDir, dir, basename + '.we');
        // rx bundle
        let thirdPartyBundle = Config.root ? Path.join(Config.root, this.params[0]) : '';

        if (yield exists(bundle)) {
            this.response.status = 200;
            this.type = 'text/javascript';
            this.response.body = Fs.createReadStream(bundle);
        }
        else if (yield exists(thirdPartyBundle)) {
            this.response.status = 200;
            this.type = 'text/javascript';
            this.response.body = Fs.createReadStream(thirdPartyBundle);
        }
        else if (yield exists(we)) {
            let targetPath = yield Builder[Config.buildMode](we, dir);
            this.response.status = 200;
            this.type = 'text/javascript';
            this.response.body = Fs.createReadStream(targetPath);
        }
        else {
            this.response.status = 404;
        }
    }
    else {
        this.response.status = 404;
    }
});
module.exports = httpRouter;