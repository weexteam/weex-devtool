import Fs from 'fs';
import Path from 'path';

module.exports = function(dir) {
  const items = Fs.readdirSync(dir);
  const dirContent = [];

  items.map((item) => {
    const path = Path.join(dir, item);
    const ext = Path.extname(item);
    const type = Fs.statSync(path).isDirectory() ? 'dir' : 'file';
    const obj = {
      name: item,
      path: path,
      type: type
    }

    if (obj.type === 'dir' || ext === '.js' || ext === '.we') {
      dirContent.push(obj);
    }
  });

  return dirContent;
}