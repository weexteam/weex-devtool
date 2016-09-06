'use strict';

/**
 * Created by godsong on 16/7/4.
 */
var Config = require('./Config');
var LogStyle = require('../../common/LogStyle');
var traceLevel = {
    'debug': true,
    'error': true
};
function _log(level, args) {
    if (Config.verbose || level == 'error' || level == 'warn') {
        args.unshift(LogStyle.LEVEL_COLOR[level]);
        args.push(LogStyle.LEVEL_COLOR['#end']);
        if (traceLevel[level]) {
            var e = new Error();
            var stack = e.stack.split('\n')[3].split('(');
            args.push('\n' + LogStyle.LEVEL_COLOR['#underline'] + '@(' + (stack[1] || stack[0]) + LogStyle.LEVEL_COLOR['#end']);
        }
        (console[level] || console.log).apply(console, args);
    }
}
exports.log = function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    _log('log', args);
};
exports.error = function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
    }

    _log('error', args);
};
exports.debug = function () {
    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        args[_key3] = arguments[_key3];
    }

    _log('debug', args);
};
exports.warn = function () {
    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
    }

    _log('warn', args);
};
exports.printMessage = function (message, prefix) {
    if (message.method == 'WxDebug.callJS') {
        exports.log('[' + prefix + '] callJS:', message.params.method);
    } else if (message.method == 'WxDebug.callNative') {
        exports.log('[' + prefix + '] callNative:(' + message.params.instance, message.params.tasks.map(function (task) {
            return task.module + '.' + task.method;
        }), ')');
    } else if (message.method == 'WxDebug.registerDevice') {
        exports.log('[' + prefix + ']', message);
    } else {
        if (message.method) {
            if (message.method != 'Page.screencastFrame') exports.log('[' + prefix + ']', message.method);
        } else {
            exports.log('[' + prefix + ']', message);
        }
    }
};