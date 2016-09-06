'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Created by godsong on 16/7/7.
 */
var EventEmitter = require('events').EventEmitter;

var MessageBus = function (_EventEmitter) {
    (0, _inherits3.default)(MessageBus, _EventEmitter);

    function MessageBus() {
        (0, _classCallCheck3.default)(this, MessageBus);
        return (0, _possibleConstructorReturn3.default)(this, (MessageBus.__proto__ || Object.getPrototypeOf(MessageBus)).call(this));
    }

    return MessageBus;
}(EventEmitter);

module.exports = new MessageBus();