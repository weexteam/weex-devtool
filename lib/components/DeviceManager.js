'use strict';

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Created by godsong on 16/6/26.
 */
var P2PSession = require('./P2PSession');
var Emitter = require('events').EventEmitter;
var Logger = require('./Logger');

var Device = function () {
    function Device(deviceInfo, websocket) {
        (0, _classCallCheck3.default)(this, Device);

        this.deviceId = deviceInfo.deviceId + '|' + deviceInfo.name;
        this.inspectorSession = P2PSession.newSession(websocket);
        this.debuggerSession = P2PSession.newSession(websocket);
        var index = websocket._info.split(' ')[0];
        websocket._info = 'native[' + this.inspectorSession.id + '+' + this.debuggerSession.id + ':0x' + (index % 2 == 1 ? '0' + index : index) + ']';
        this.deviceInfo = Object.assign(deviceInfo, {
            deviceId: this.deviceId,
            remoteDebug: deviceInfo.remoteDebug || false,
            inspectorSessionId: this.inspectorSession.id,
            debuggerSessionId: this.debuggerSession.id
        });
        websocket._deviceId = this.deviceId;
        this.websocket = websocket;
    }

    (0, _createClass3.default)(Device, [{
        key: 'destroy',
        value: function destroy() {
            this.destroyed = true;
            this.inspectorSession.destroy();
            this.debuggerSession.destroy();
            this.inspectorSession = null;
            this.debuggerSession = null;
        }
    }, {
        key: 'reconnect',
        value: function reconnect(websocket) {
            websocket._deviceId = this.deviceId;
            var index = websocket._info.split(' ')[0];
            websocket._info = 'native[' + this.inspectorSession.id + '+' + this.debuggerSession.id + ':0x' + (index % 2 == 1 ? '0' + index : index) + '] reconnected';
            this.websocket = websocket;
            this.inspectorSession.join(websocket);
            this.debuggerSession.join(websocket);
        }
    }]);
    return Device;
}();

var DeviceManager = function (_Emitter) {
    (0, _inherits3.default)(DeviceManager, _Emitter);

    function DeviceManager() {
        (0, _classCallCheck3.default)(this, DeviceManager);

        var _this = (0, _possibleConstructorReturn3.default)(this, (DeviceManager.__proto__ || Object.getPrototypeOf(DeviceManager)).call(this));

        _this.deviceList = [];
        return _this;
    }

    (0, _createClass3.default)(DeviceManager, [{
        key: 'removeDeviceDelayed',
        value: function removeDeviceDelayed(device, timeout) {
            var _this2 = this;

            clearTimeout(device.removeTimer);
            device.removeTimer = setTimeout(function () {
                _this2.removeDevice(device);
            }, timeout);
        }
    }, {
        key: 'removeDevice',
        value: function removeDevice(device) {
            device.destroy();
            this.deviceList = this.deviceList.filter(function (dvc) {
                return dvc !== device;
            });
            this.emit('update', this.getDeviceListInfo());
        }
    }, {
        key: 'registerDevice',
        value: function registerDevice(deviceInfo, websocket) {
            var existDevice = this.deviceList.filter(function (dvc) {
                return dvc.deviceId == deviceInfo.deviceId + '|' + deviceInfo.name;
            })[0];
            if (existDevice) {
                clearTimeout(existDevice.removeTimer);
                existDevice.reconnect(websocket);
                return existDevice;
            } else {
                var device = new Device(deviceInfo, websocket);
                this.deviceList.push(device);
                this.emit('update', this.getDeviceListInfo());
            }
        }
    }, {
        key: 'getDeviceById',
        value: function getDeviceById(deviceId) {
            return this.deviceList.filter(function (dvc) {
                return dvc.deviceId === deviceId;
            })[0];
        }
    }, {
        key: 'getDevice',
        value: function getDevice(websocket) {
            return this.deviceList.filter(function (dvc) {
                return dvc.deviceId === websocket._deviceId;
            })[0];
        }
    }, {
        key: 'getDeviceList',
        value: function getDeviceList() {
            return this.deviceList;
        }
    }, {
        key: 'getDeviceListInfo',
        value: function getDeviceListInfo() {
            return this.deviceList.map(function (device) {
                return device.deviceInfo;
            });
        }
    }]);
    return DeviceManager;
}(Emitter);

module.exports = new DeviceManager();