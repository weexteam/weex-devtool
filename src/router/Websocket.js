/**
 * Created by godsong on 16/6/13.
 */
const Router = require('koa-router');
const P2PSession = require('../components/P2PSession');
const DeviceManager = require('../components/DeviceManager');
const MemoryFile = require('../components/MemoryFile');
const Uuid = require('../util/Uuid');
const Logger = require('../components/Logger');
const Config = require('../components/Config');
const MessageBus = require('../components/MessageBus');
const bundleWrapper = require('../util/BundleWrapper');
const getDirContent = require('../util/FsHelper');

let wsRouter = Router();
let chromeWsIndex = 2;
let nativeWsIndex = 1;
function _toFixed(num) {
    let s = num.toString(16);
    if (s.length % 2 == 1) {
        return '0' + s;
    }
    else return s;
}
wsRouter.all('/debugProxy/inspector/:sessionId', function*(next) {
    Logger.debug(`new inspector client connected,join[${this.params.sessionId} -0x${_toFixed(chromeWsIndex)}]`);
    this.websocket._info = `chrome-inspector[${this.params.sessionId}-0x${_toFixed(chromeWsIndex++)}]`;
    P2PSession.join(this.params.sessionId, this.websocket);
    this.websocket.on('message', function (message) {
        message = JSON.parse(message);
        P2PSession.postMessage(this, message);
    });
    yield next;
});
wsRouter.all('/debugProxy/debugger/:sessionId', function*(next) {
    Logger.debug(`new debugger client connected,join[${this.params.sessionId}-0x${_toFixed(chromeWsIndex)}]`);
    this.websocket._info = `chrome-debugger[${this.params.sessionId}-0x${_toFixed(chromeWsIndex++)}]`;
    if (!P2PSession.join(this.params.sessionId, this.websocket)) {
        //P2PSession.postMessage(this.websocket, {method: "WxDebug.reload"});
    }
    else {
        //console.log('enable remote debug');
        //P2PSession.postMessage(this.websocket, {method: "WxDebug.enable"});
    }
    this.websocket.on('message', function (message) {
        message = JSON.parse(message);
        Logger.printMessage(message, 'chrome');
        if (message.method === 'WxDebug.enable' || message.method === 'WxDebug.disable') {
            var peer = P2PSession.findOppositePeer(this);
            if (peer) {
                let device = DeviceManager.getDeviceById(peer.websocket._deviceId);
                if (device) {
                    device.deviceInfo.remoteDebug = message.method === 'WxDebug.enable' ? true : false;
                }
            }
        }
        P2PSession.postMessage(this, message);
    });
    yield next;
});
DeviceManager.on('update', function (deviceList) {
    listPageWebsocket.forEach(ws=> {
        ws.send(JSON.stringify({method: "WxDebug.pushDeviceList", params: deviceList}));
    })
});
let listPageWebsocket = [];
MessageBus.on('page.refresh', function () {
    DeviceManager.getDeviceList().forEach(function (device) {
        device.debuggerSession.postMessage(device.websocket, {method: 'WxDebug.refresh'})
    });
    /* listPageWebsocket.forEach(ws=> {
     ws.send(JSON.stringify({method: "WxDebug.refreshPage"}));
     })*/
});
wsRouter.all('/debugProxy/list', function*(next) {
    let ws = this.websocket;
    listPageWebsocket.push(this.websocket);
    this.websocket.on('close', function () {
        listPageWebsocket = listPageWebsocket.filter(ws=>ws !== this);
    });
    this.websocket.on('message', function (messageText) {
        let message = JSON.parse(messageText);
        if (message.method == 'WxDebug.setLogLevel') {

            let device = DeviceManager.getDeviceById(message.params.deviceId);
            if (device) {
                device.deviceInfo.logLevel = message.params.logLevel;
                let targetMsg = {method: 'WxDebug.setLogLevel', params: {logLevel: message.params.data}};
                device.websocket.send(JSON.stringify(targetMsg));
            }
            else {
                Logger.debug(message.params.deviceId);
            }
        }
        else if (message.method == 'WxDebug.setRemoteDebug') {
            let device = DeviceManager.getDeviceById(message.params.deviceId);
            if (device) {
                device.deviceInfo.remoteDebug = message.params.data;
                device.websocket.send(JSON.stringify({method: 'WxDebug.' + (message.params.data ? 'enable' : 'disable')}));
            }
        }
        else if(message.method=='WxDebug.setElementMode'){
            let device = DeviceManager.getDeviceById(message.params.deviceId);
            if (device) {
                device.deviceInfo.elementMode = message.params.data;
                device.websocket.send(JSON.stringify({method: 'WxDebug.setElementMode' ,params:{mode:message.params.data}}));
            }
        }
        else if (message.method == 'WxDebug.refreshDevice') {
            let device = DeviceManager.getDeviceById(message.params.deviceId);
            if (device) {
                device.websocket.send(JSON.stringify({method: 'WxDebug.reload'}));
            }
        } else if (message.method == 'WxDebug.getDirContent') {
            ws.send(JSON.stringify({
                method: 'WxDebug.renderDirView',
                params: getDirContent(message.params)
            }));
        }
    });

    this.websocket.send(JSON.stringify({method: "WxDebug.pushDeviceList", params: DeviceManager.getDeviceListInfo()}));

    // 如果命令行入口为整个目录
    if (!Config.entryBundleUrl) {
        this.websocket.send(JSON.stringify({
            method: 'WxDebug.renderTreeView',
            params: getDirContent(Config.root),
            basePath: Config.root
        }));
    }

    if (Config.entryBundleUrl) {
        this.websocket.send(JSON.stringify({
            method: "WxDebug.setEntry",
            params: [Config.entryBundleUrl]
        }));
    }
});


wsRouter.all('/debugProxy/native', function*(next) {

    this.websocket._info = nativeWsIndex.toString(16) + ' unregistered';
    Logger.debug('new native  client connected：', this.websocket._info);
    nativeWsIndex++;
    this.websocket.on('message', function (messageText) {
        let message = JSON.parse(messageText);
        Logger.printMessage(message, 'native');
        let device = DeviceManager.getDevice(this);
        if (message.method) {
            let [domain,method] = message.method.split('.');
            if (domain == 'WxDebug') {
                if (method == 'registerDevice') {
                    DeviceManager.registerDevice(message.params, this);
                    this.send(JSON.stringify({id: message.id, result: 'ready'}));
                }
                else if (method == 'initJSRuntime') {
                    if (device) {
                        message.params.url = new MemoryFile('js-framework.js', message.params.source).getUrl();
                        if (device.deviceInfo.logLevel) {
                            message.params.env.WXEnvironment.logLevel = device.deviceInfo.logLevel;
                        }
                        device.debuggerSession.postMessage(this, message);
                    }
                    else {
                        Logger.error('Fatal Error:native device unregistered before initJSRuntime!');
                    }
                }
                else if (method == 'callJS' && message.params.method == 'createInstance') {
                    if (device) {
                        message.params.sourceUrl = new MemoryFile(message.params.args[2].bundleUrl || (Uuid() + '.js'), bundleWrapper(message.params.args[1])).getUrl();
                        device.debuggerSession.postMessage(this, message);
                    }
                    else {
                        Logger.error('Fatal Error:native device unregistered before createInstance!');
                    }
                }
                else {
                    if (device)
                        device.debuggerSession.postMessage(this, message);
                    else
                        Logger.error('Fatal Error:native device unregistered before [' + message.method + ']');
                }
            }
            else {
                if (device) {
                    if (message.method == 'Page.screencastFrame') {
                        message.params.sessionId = 1;
                    }
                    if (message.method == 'Console.messageAdded' && message.params.message.level === 'error') {
                        device.debuggerSession.postMessage(this, message);
                    }
                    device.inspectorSession.postMessage(this, message);
                }
                else
                    Logger.error('Fatal Error:native device unregistered before send inspector protocol [' + message.method + ']');
            }
        }
        else {
            if (device)
                device.inspectorSession.postMessage(this, message);
            else
                Logger.error('Fatal Error:native device unregistered before send inspector protocol');
        }
    });
    this.websocket.on('close', function () {
        if (!this.removed) {
            let device = DeviceManager.getDevice(this);
            if (device) {
                DeviceManager.removeDeviceDelayed(device, 3000);
            }
        }

    });
    yield next;
});
module.exports = wsRouter;
