'use strict';

/**
 * Created by godsong on 16/8/8.
 */
var spawn = require('child_process').spawn;
var LogStyle = require('../../common/LogStyle');

var version = require('../../package.json').version;
exports.run = function () {
    var npm = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['show', 'weex-devtool', 'version']);
    npm.stdout.on('data', function (data) {
        var latestVersion = data.toString();
        if (getVersionValue(version) < getVersionValue(latestVersion)) {
            console.log(LogStyle.dressUp('New version[' + latestVersion + '] of Weex debugger detected! Please update weex-toolkit.(npm install -g weex-toolkit)', LogStyle.FG_RED));
        }
    });
};
function getVersionValue(version) {
    var sum = 0;
    version.split('.').forEach(function (n, i, arr) {
        sum += Math.pow(10, (arr.length - i - 1) * 4) * n;
    });
    return sum;
}