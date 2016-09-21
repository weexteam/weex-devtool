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
    var containerWidth = '240px';
    var htmlStr = self.getTreeViewHtml(files, 'init');

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
    var bundleUrl = self.getBundleUrl();
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
  getTreeViewHtml: function (files, init) {
    var self = this;
    var path = (self.target ? self.target.dataset['path'] : '');
    if (init) {
      var htmlStr = `<ul class="tree-view-list tree-view-root" data-parent-path=${path}>`;
      document.body.insertAdjacentHTML('beforeend', '<div class="tree-view-header">Folders</div>');
    } else {
      var htmlStr = `<ul class="tree-view-list" data-parent-path=${path}>`;
    }

    files.forEach(function (item) {
      htmlStr += `<li data-type=${item.type} data-path=${item.path}
          data-name=${item.name} class='tree-view-item'>
          <span class='${item.type}-trigger-icon'></span>
          <a class='tree-anchor'>
              <i class='${item.type}-icon'></i>
              <span>${item.name}</span>
          </a>
      </li>`;
    })

    htmlStr += '</ul>';

    return htmlStr;
  },
  getBundleUrl: function () {
    var self = this;
    var baseBundleUrl;
    var path = self.target.dataset.path;
    var ext = path.slice(-3);

    if (ext === '.we') {
      path = path.slice(self.basePath.length);
      path = path.slice(0, -3) + '.js';
      baseBundleUrl = `http:\/\/${location.host}/weex${path}`;
    } else {
      // for rx
      path = path.slice(path.indexOf('/build/'));
      baseBundleUrl = `http:\/\/${location.hostname}:3333${path}`;
    }

    var encodedURI = encodeURIComponent(baseBundleUrl);
    var bundleUrl = `${baseBundleUrl}?_wx_tpl=${encodedURI}`;

    return bundleUrl;
  }

}