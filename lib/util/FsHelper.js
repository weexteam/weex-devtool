'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function (dir) {
  var items = _fs2.default.readdirSync(dir);
  var dirContent = [];

  items.map(function (item) {
    var path = _path2.default.join(dir, item);
    var ext = _path2.default.extname(item);
    var type = _fs2.default.statSync(path).isDirectory() ? 'dir' : 'file';
    var obj = {
      name: item,
      path: path,
      type: type
    };

    if (obj.type === 'dir' || ext === '.js' || ext === '.we') {
      dirContent.push(obj);
    }
  });

  return dirContent;
};