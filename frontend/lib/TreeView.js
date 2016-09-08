function TreeView(items, basePath) {
  this.DirIconClass = 'dir-trigger-icon';
  this.target = null;
  this.qrcode = null;
  this.basePath = basePath || '';
  this.container = document.getElementById('tree_view');
  this.init(items);
}

TreeView.prototype = {
  constructor: TreeView,
  init: function (files) {
    var self = this;
    var htmlStr = self.getTreeViewHtml(files);
    var containerWidth = '240px';

    self.container.innerHTML = htmlStr;
    self.container.style.display = 'block';
    self.container.style.width = containerWidth;
    document.getElementById('main_content').style.marginLeft = containerWidth;

    // delegate click event
    self.bindEvent();
  },
  bindEvent: function () {
    var self = this;

    self.container.onclick = function (e) {
      target = e.target;

      while (target !== self.container) {
        if (target.nodeName === 'LI') {
          self.target = target;

          if (target.dataset.type === 'file') {
            self.updateQrCode();
          } else {
            self.openDir();
          }
        }

        target = target.parentNode
      }
    }

  },
  updateQrCode: function () {
    var self = this;
    var path = self.target.dataset.path;
    path = path.slice(self.basePath.length);
    var baseBundleUrl = `http:\/\/${location.host}/weex${path}`;
    var bundleUrl = `${baseBundleUrl}?_wx_tpl=${baseBundleUrl}`;
    var name = self.target.dataset.name;
    var qrcodeElm = document.getElementById('entryQrcode0');

    if (qrcodeElm) {
      var link = document.querySelector('.qrcode-desc a');
      link.textContent = name;
      link.setAttribute('href', bundleUrl);
      self.qrcode.makeCode(bundleUrl);
    } else {
      var ctn = document.createElement('div');
      ctn.className = 'qrcode-section';
      ctn.innerHTML = `<div id="entryQrcode0" class="qrcode"></div>
                      <div class="qrcode-desc">
                      <a target="_blank" href="${bundleUrl}">${name}</a>
                      </div>`;
      document.getElementById('qrcode_container').appendChild(ctn);
      self.qrcode = createQRCode('entryQrcode0', bundleUrl);
    }

  },
  openDir: function () {
    var self = this;
    var target = self.target;
    var path = target.dataset.path;
    var triggerIcon = target.getElementsByClassName(self.DirIconClass)[0];
    var child = document.querySelector(`[data-parent-path="${path}"]`);

    if (triggerIcon.className.indexOf('open') > -1) {
      // close dir
      if (child) {
        child.style.display = 'none';
      }
      triggerIcon.className = self.DirIconClass;
    } else {
      // open dir
      triggerIcon.className = self.DirIconClass + ' open';
      if (child) {
        // show...
        child.style.display = 'block';
      } else {
        self.updateTree()
      }
    }

  },
  updateTree: function () {
    var self = this;
    var target = self.target;
    var data = JSON.stringify({
      method: 'WxDebug.getDirContent',
      params: target.dataset.path
    });

    if (websocket) {
      websocket.send(data);
    }
  },
  renderDirView: function (files) {
    var self = this;
    var htmlStr = self.getTreeViewHtml(files);
    var target = self.target;

    target.insertAdjacentHTML('afterend', htmlStr);
  },
  getTreeViewHtml: function (files) {
    var self = this;
    var path = (self.target ? self.target.dataset['path'] : '');
    var htmlStr = `<ul class="tree-view-list" data-parent-path=${path}>`;

    files.forEach(function (item) {
        htmlStr += `<li data-type=${item.type} data-path=${item.path} data-name=${item.name}>
            <span class='${item.type}-trigger-icon'></span>
            <a>
                <i class='${item.type}-icon'></i>
                <span>${item.name}</span>
            </a>
        </li>`;
    })

    htmlStr += '</ul>';

    return htmlStr;
  }

}