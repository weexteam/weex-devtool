'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Path = require('path');

var DebugTarget = function () {
    function DebugTarget(targetName) {
        (0, _classCallCheck3.default)(this, DebugTarget);

        this.targetName = target;
    }

    (0, _createClass3.default)(DebugTarget, [{
        key: 'resolve',
        value: function resolve() {
            var filePath = Path.resolve(this.targetName);
            var ext = Path.extname(filePath);
        }
    }]);
    return DebugTarget;
}();

var TargetResolver = {
    registerResolver: function registerResolver() {}
};