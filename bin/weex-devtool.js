#!/usr/bin/env node

/**
 * 关于代码规范
 * 所有模块、类库 引入后使用首字母大写的驼峰形式，
 * 本地变量与函数使用首字母小写的驼峰形式
 * module内的闭包变量（相当于module 作用域内的全局变量）如果用于储存信息，由于容易产生泄露，所以必须使用_开头的驼峰形式用于区分
 * 像下面代码中的packageInfo由于是只读的所以不需要加_
 */
"use strict";
var Program = require('commander');
var DebugServer = require('../lib/DebugServer');
var Config = require('../lib/components/Config');
var Builder = require('../lib/components/Builder');
var LogStyle = require('../common/LogStyle');
var Url = require('url');
var Fs = require('fs');
var Exit = require('exit');
var Path = require('path');
var IP = require('ip');
var LaunchDevTool = require('../lib/util/LaunchDevTool');
var Del = require('del');
var Watch = require('node-watch');
var MessageBus = require('../lib/components/MessageBus');
var Hosts = require('../lib/util/Hosts');
var UpgradeNotice = require('../lib/util/UpgradeNotice');
var packageInfo = require('../package.json');

Program
    .option('-h, --host [host]', 'set the host ip of debugger server')
    .option('-H, --help', 'display help')
    .option('-V, --verbose', 'display logs of debugger server')
    .option('-v, --version', 'display version')
    .option('-p, --port [port]', 'set debugger server port', '8088')
    .option('-e, --entry [entry]', 'set the entry bundlejs path when you specific the bundle server root path')
    .option('-w, --watch', 'watch we file changes auto build them and refresh debugger page![default enabled]', true)
    .option('-m, --mode [mode]', 'set build mode [transformer|loader]', 'loader')
    .option('-M, --manual', 'manual mode,this mode will not auto open chrome');
//支持命令后跟一个file/directory参数
Program['arguments']('[file]')
    .action(function (file) {
        Program.file = file;
    });
Program.parse(process.argv);
//默认watch功能开启
Program.watch = true;
//fix tj's commander bug overwrite --help
if (Program.help == undefined) {
    Program.outputHelp();
    Exit(0);
}
//fix tj's commander bug overwrite --version
if (Program.version == undefined) {
    console.log(packageInfo.version);
    Exit(0);
}
var supportMode = ['loader', 'transformer'];

if(Program.host&&!Hosts.isValidLocalHost(Program.host)){
    console.log('['+Program.host+'] is not your local address!');
    Exit(0);
}

Config.verbose = Program.verbose;
Config.port = Program.port;
if (supportMode.indexOf(Program.mode) == -1) {
    console.log('unsupported build mode:', Program.mode);
    Exit(0);
}
else {
    Config.buildMode = Program.mode;
}
//清空
try {
    Del.sync(Path.join(__dirname, '../frontend/', Config.bundleDir, '/*'), {force: true});
} catch (e) {
}


if (Program.file) {
    buildAndStart()
}
else {
    startServerAndLaunchDevtool()
}
UpgradeNotice.run();

////////////////////////////////////////////////////////////////////////////

function buildAndStart() {
    if (/^https?:\/\//.test(Program.file)) {
        var url = Program.file.replace(/^(https?:\/\/)([^/:]+)(?=:\d+|\/)/, function (m, a, b) {
            if (!/\d+\.\d+\.\d+\.\d+/.test(a)) {
                return a + Hosts.findRealHost(b);
            }
            else {
                return m;
            }
        });
        Config.entryBundleUrl = url;
        startServerAndLaunchDevtool();
    }
    else {
        var filePath = Path.resolve(Program.file);
        var ext = Path.extname(filePath);
        if (!Fs.existsSync(filePath)) {
            console.error(filePath + ': No such file or directory');
            return Exit(0);
        }
        if (ext == '.we') {
            console.log('building...');
            console.time('Build completed!');
            buildFileAndWatchIt(Program.mode, filePath).then(function () {
                console.timeEnd('Build completed!');
                startServerAndLaunchDevtool(Program.file);
            }, function (err) {
                if (err) {
                    console.log(err, err.stack);
                }
                Exit(0);
            })

        }
        else if (ext == '.js') {
            buildFileAndWatchIt('copy', filePath).then(function () {
                startServerAndLaunchDevtool(Program.file);
            })
        }
        else if (!ext) {
            //处理目录
            if (Fs.statSync(filePath).isDirectory()) {
                Config.root = filePath;
                startServerAndLaunchDevtool(Program.entry)
            }
            else {
                console.error(Program.file + ' is not a directory!');
                Exit(0);
            }
        }
        else {
            console.error('Error:unsupported file type: ', ext);
            return Exit(0);
        }
    }
}
function buildFileAndWatchIt(buildMode, filePath) {
    if (Program.watch) {
        Watch(filePath, function () {
            console.time('Rebuild completed! ')
            console.log(filePath + ' updated! rebuilding...')
            Builder[buildMode](filePath).then(function () {
                console.timeEnd('Rebuild completed! ')
                MessageBus.emit('page.refresh');
            });
        })
    }
    return Builder[buildMode](filePath);
}
function startServerAndLaunchDevtool(entry) {
    var port = Program.port;
    var ip = Program.host || IP.address();
    Config.ip = ip;
    console.info('start debugger server at ' + LogStyle.dressUp('http://' + ip + ':' + port, LogStyle.FG_YELLOW, LogStyle.BRIGHT));
    if (entry) {
        Config.entryBundleUrl = 'http://' + ip + ':' + port + Path.join('/' + Config.bundleDir, Path.basename(entry).replace(/\.we$/, '.js')).replace(/\\/g,'/');
        console.log('\nYou can visit we file(s) use ' + Config.entryBundleUrl);
        console.log('Also you can use Playground App to scan the qrcode on device list page.');
    }
    if (Config.entryBundleUrl) {
        Config.entryBundleUrl = Config.entryBundleUrl.replace(/127\.0\.0\.1/g, Config.ip);
        //fixme ugly 与具体耦合的逻辑 易变！
        if (!/wh_weex=true/.test(Config.entryBundleUrl)) {
            var urlObj = Url.parse(Config.entryBundleUrl, true);
            urlObj.query['_wx_tpl'] = Config.entryBundleUrl;
            urlObj.search = '';

            Config.entryBundleUrl = Url.format(urlObj);
        }
    }
    if (Config.root) {
        console.log('\nDirectory[' + Program.file + '] has been mapped to http://' + ip + ':' + port + '/' + Config.bundleDir + '/');
    }

    console.info('\nThe websocket address for native is ' + LogStyle.dressUp('ws://' + ip + ':' + port + '/debugProxy/native', LogStyle.FG_YELLOW, LogStyle.BRIGHT));
    DebugServer.start(port);
    if (!Program.manual) {
        LaunchDevTool(ip, port);
    }
}