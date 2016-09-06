'use strict';

var Path = require('path');
var Koa = require('koa');
var Serve = require('koa-serve');
var ServeStatic = require('koa-serve-static');
var Websockify = require('koa-websocket');
var Config = require('./components/Config');

var WsRouter = require('./router/Websocket');
var HttpRouter = require('./router/Http');
var app = Websockify(Koa());
var rootPath = Path.join(__dirname, '../frontend/');

/* 
 ===================================
 WebSocket Router
 ===================================
 */
exports.start = function (port) {

    app.ws.use(WsRouter.routes());
    app.on('error', function (err, ctx) {
        if (Config.verbose) {
            if (err.status == 404) {
                console.log('404');
            } else {
                console.error(err);
            }
        }
    });
    /*
     ===================================
     Http Router
     ===================================
     */

    app.use(HttpRouter.routes());
    app.use(ServeStatic(rootPath));

    app.listen(port);
};