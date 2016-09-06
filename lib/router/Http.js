'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Router = require('koa-router');
var MemoryFile = require('../components/MemoryFile');
var Fs = require('fs');
var Logger = require('../components/Logger');
var protocols = {
    'http:': require('http'),
    'https:': require('https')
};
var Path = require('path');
var URL = require('url');
var Config = require('../components/Config');
var Builder = require('../components/Builder');
var bundleWrapper = require('../util/BundleWrapper');

var httpRouter = Router();
function getRemote(url) {
    return new Promise(function (resolve, reject) {
        var urlObj = URL.parse(url);
        (protocols[urlObj.protocol] || protocols['http']).get({
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
var rSourceMapDetector = /\.map$/;
httpRouter.get('/source/*', _regenerator2.default.mark(function _callee(next) {
    var path, content, query, file, _content;

    return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    path = this.params[0];

                    if (!rSourceMapDetector.test(path)) {
                        _context.next = 8;
                        break;
                    }

                    _context.next = 4;
                    return getRemote('http://' + path);

                case 4:
                    content = _context.sent;

                    if (!content) {
                        this.response.status = 404;
                    } else {
                        this.response.status = 200;
                        this.set('Access-Control-Allow-Origin', '*');
                        this.type = 'text/javascript';
                        this.response.body = content;
                    }
                    _context.next = 25;
                    break;

                case 8:
                    query = this.request.url.split('?');

                    query = query[1] ? '?' + query[1] : '';
                    file = MemoryFile.get(path + query);

                    if (!file) {
                        _context.next = 24;
                        break;
                    }

                    this.response.status = 200;
                    this.type = 'text/javascript';

                    if (!file.url) {
                        _context.next = 21;
                        break;
                    }

                    _context.next = 17;
                    return getRemote(file.url).catch(function (e) {
                        Logger.error(e);
                    });

                case 17:
                    _content = _context.sent;

                    if (!_content) {
                        this.response.body = file.getContent();
                    } else {
                        this.response.body = bundleWrapper(_content);
                    }
                    _context.next = 22;
                    break;

                case 21:
                    this.response.body = file.getContent();

                case 22:
                    _context.next = 25;
                    break;

                case 24:
                    this.response.status = 404;

                case 25:
                case 'end':
                    return _context.stop();
            }
        }
    }, _callee, this);
}));
function exists(file) {
    return new Promise(function (resolve, reject) {
        Fs.exists(file, function (flag) {
            resolve(flag);
        });
    });
}
var bundleDir = Path.join(__dirname, '../../frontend/', Config.bundleDir);
httpRouter.get('/' + Config.bundleDir + '/*', _regenerator2.default.mark(function _callee2(next) {
    var ext, dir, basename, bundle, we, targetPath;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
            switch (_context2.prev = _context2.next) {
                case 0:
                    ext = Path.extname(this.params[0]);

                    if (!(ext == '.js' || ext == '.we')) {
                        _context2.next = 28;
                        break;
                    }

                    dir = Path.dirname(this.params[0]);
                    basename = Path.basename(this.params[0], ext);
                    bundle = Path.join(bundleDir, dir, basename + '.js');
                    we = Path.join(Config.root || bundleDir, dir, basename + '.we');
                    _context2.next = 8;
                    return exists(bundle);

                case 8:
                    if (!_context2.sent) {
                        _context2.next = 14;
                        break;
                    }

                    this.response.status = 200;
                    this.type = 'text/javascript';
                    this.response.body = Fs.createReadStream(bundle);
                    _context2.next = 26;
                    break;

                case 14:
                    _context2.next = 16;
                    return exists(we);

                case 16:
                    if (!_context2.sent) {
                        _context2.next = 25;
                        break;
                    }

                    _context2.next = 19;
                    return Builder[Config.buildMode](we, dir);

                case 19:
                    targetPath = _context2.sent;

                    this.response.status = 200;
                    this.type = 'text/javascript';
                    this.response.body = Fs.createReadStream(targetPath);
                    _context2.next = 26;
                    break;

                case 25:
                    this.response.status = 404;

                case 26:
                    _context2.next = 29;
                    break;

                case 28:
                    this.response.status = 404;

                case 29:
                case 'end':
                    return _context2.stop();
            }
        }
    }, _callee2, this);
}));
module.exports = httpRouter;