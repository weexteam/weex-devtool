'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Created by godsong on 16/6/30.
 */

var Crypto = require('crypto');
var Config = require('./Config');
var Url = require('url');
var Qs = require('querystring');
var _memoryFileMap = {};

var MemoryFile = function () {
    (0, _createClass3.default)(MemoryFile, null, [{
        key: 'get',
        value: function get(name) {
            return _memoryFileMap[name];
        }
    }, {
        key: 'dump',
        value: function dump() {
            return Object.keys(_memoryFileMap);
        }
    }]);

    function MemoryFile(fileName, content) {
        (0, _classCallCheck3.default)(this, MemoryFile);

        //fixme ugly! your_current_ip playground default bundle url
        var rHttpHeader = /^https?:\/\/(?!.*your_current_ip)/i;
        if (rHttpHeader.test(fileName)) {
            this.name = fileName.replace(rHttpHeader, '');
            var query = Qs.parse(Url.parse(this.name).query);
            if (query['_wx_tpl']) {
                this.url = query['_wx_tpl'];
                this.name = this.url.replace(rHttpHeader, '');
            } else {
                this.url = fileName;
            }
        } else this.name = fileName;
        var md5 = Crypto.createHash('md5');
        md5.update(content);
        var md5Str = md5.digest('hex');
        var key = this.name.split('?')[0] + '|' + md5Str;
        if (_memoryFileMap[this.name]) {
            _memoryFileMap[this.name].content = content;
            return _memoryFileMap[this.name];
        } else if (_memoryFileMap[key]) {
            _memoryFileMap[key].content = content;
            return _memoryFileMap[key];
        } else this.content = content;
        this.md5 = md5Str;
        _memoryFileMap[this.name] = this;
        _memoryFileMap[key] = this;
    }

    (0, _createClass3.default)(MemoryFile, [{
        key: 'getContent',
        value: function getContent() {
            return this.content;
        }
    }, {
        key: 'getUrl',
        value: function getUrl() {
            return '/source/' + this.name;
        }
    }]);
    return MemoryFile;
}();

module.exports = MemoryFile;