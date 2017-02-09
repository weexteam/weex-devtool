/**
 * Created by godsong on 16/6/13.
 */
const opn = require('opn');
const Path = require('path');
const ExecSync = require('child_process').execSync;
var fs = require('fs-extra');
var work_path = process.cwd();

function getChromeAppName() {
    switch (process.platform) {
        case 'darwin':
            return 'google chrome';
        case 'win32':
            return 'chrome';
        default:
            return 'google-chrome';
    }
}

function getWebpackConfig() {
    var webpackconfig = require(path.join(process.cwd(), 'webpack.config.js'));
    var projectPackagejson = require(path.join(process.cwd(), 'package.json'));
    var devIndex = projectPackagejson.qapConfig !== undefined &&
        projectPackagejson.qapConfig.webpack !== undefined &&
        projectPackagejson.qapConfig.devIndex !== undefined ?
        projectPackagejson.qapConfig.devIndex : 0;
    var prodIndex = projectPackagejson.qapConfig !== undefined &&
        projectPackagejson.qapConfig.webpack !== undefined &&
        projectPackagejson.qapConfig.prodIndex !== undefined ?
        projectPackagejson.qapConfig.prodIndex : 1;
    return {
        dev: webpackconfig.dev !== undefined ? webpackconfig.dev() : webpackconfig[devIndex],
        prod: webpackconfig.prod !== undefined ? webpackconfig.prod() : webpackconfig[prodIndex],
    }
}

let launchDevTools = module.exports = function(ip, port) {
    return new Promise(function(resolve, reject) {
        var devWebpackConfig = getWebpackConfig().dev;

        fs.readFile(Path.join(work_path, 'Manifest.xml'), 'utf8', function(err, contents) {
            var appValid = 'invalid';
            if (err) {
                //console.log('读取Manifest.xml发生错误：' + err)
                fs.readJson(Path.join(work_path, 'qap.json'), function(err, packageObj) {
                    if (packageObj.appKey !== '1323324720') {
                        appValid = 'valid'
                    }
                })
            }

            if (contents !== undefined && (contents.indexOf('1323324720') <= 0) &&
                contents.indexOf('appKey=""') <= 0 && contents.indexOf('appKey=" "') <= 0) {
                appValid = 'valid'
            }

            var qapDebugContnt = "qap://debug?debugInfo={" +
                "\"ip\" : \"" + ip + "\"," +
                "\"weexDebugPort\" : \"8088\"," +
                "\"appkey\":\"" + appValid + "\"," +
                "\"qapFileServer\" : " + "\"http://" + ip + ":8080/\"," +
                // "\"serverUrl\" : \"http://" + location.hostname + ":8080"  + jsBundleFolder + "\"\n" +
                "\"devServer\" : \"http://" + ip + ":" + devWebpackConfig.port + devWebpackConfig.output.publicPath + "\"" +
                "}";

            var debuggerURL = 'http://' + (ip || 'localhost') + ':' + port +
                '/?debug=' + encodeURIComponent(qapDebugContnt);

            console.log('Launching Dev Tools...');
            if (process.platform === 'darwin') {
                try {
                    // Try our best to reuse existing tab
                    // on OS X Google Chrome with AppleScript
                    ExecSync('ps cax | grep "Google Chrome"');
                    ExecSync('osascript ' + Path.resolve(__dirname, '../../common/chrome.applescript') + ' ' + debuggerURL);
                    return;
                } catch (err) {
                    // Ignore errors.
                }
            }
            opn(debuggerURL, { app: [getChromeAppName()] }, function(err) {
                if (err) {
                    console.error('Google Chrome exited with error:', err);
                    reject(err);
                }
                console.log('success!');
                resolve();
            });
        });
    });
};
