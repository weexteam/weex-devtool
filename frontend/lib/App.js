var websocket;
var maxReconnectCount = 5;
var _deviceList = [];
function connect() {
    websocket = new WebSocket('ws://' + location.host + '/debugProxy/list');
    websocket.onmessage = function (event) {
        var message = JSON.parse(event.data);
        if (message.method == 'WxDebug.pushDeviceList') {
            renderDeviceList(message.params);
        }
        else if (message.method == 'WxDebug.setEntry') {
            message.params.forEach(function (bundleUrl, i) {
                var urls = bundleUrl.split('_wx_tpl='), url, name;
                if (urls.length >= 2) {
                    url = decodeURIComponent(urls[1]);
                    name = url.match(/\/([^\/?#]+)\.(js|we)(?:$|#|\?)/);
                    name = name ? name[1] : url;
                }
                else if (urls.length == 1) {
                    url = urls[0];
                    name = url.match(/\/([^\/?#]+)\.js(?:$|#|\?)/);
                    name = name ? name[1] : url;
                }
                var ctn = document.createElement('div');
                ctn.className = 'qrcode-section';
                ctn.innerHTML = `<div id="entryQrcode${i}" class="qrcode"></div>
                                <div class="qrcode-desc">
                                <a target="_blank" href="${bundleUrl}">${name}</a>
                                </div>`;
                document.getElementById('qrcode_container').appendChild(ctn);
                createQRCode('entryQrcode' + i, bundleUrl);
            })

        }
        else if (message.method == 'WxDebug.refreshPage') {
            _deviceList.forEach(function (device) {
                device.inspectorWindow && device.inspectorWindow.location.reload();
                device.debuggerWindow && device.debuggerWindow.location.reload();
            })

        }
        else if (message.method == 'WxDebug.renderTreeView') {
            renderTreeView([{ name: 'index.js', type: 'file' }, { name: 'helloworld', type: 'dir' }]);
        }

    };
    websocket.onclose = function () {
        renderDeviceList([]);
        if (maxReconnectCount-- > 0) {
            setTimeout(connect, 1000);
        }
        else {
            alert('Websocket error!Maybe the debug server crashed!')
        }

    }
}

function diff(deviceList) {
    var next;
    for (var i = 0; i < _deviceList.length; i++) {
        next = false;
        for (var j = 0; j < deviceList.length; j++) {
            if (deviceList[j].deviceId == _deviceList[i].deviceId) {
                next = true;
                break;

            }
        }
        if (next)continue;
        _deviceList[i].inspectorWindow && _deviceList[i].inspectorWindow.close();
        _deviceList[i].debuggerWindow && _deviceList[i].debuggerWindow.close();
   }
}

function renderDeviceList(deviceList) {
    diff(deviceList);
    _deviceList = deviceList;
    // if (deviceList.length > 0) {
    //     document.getElementById('help_ctn').style.display = 'block';
    // }
    // else {
    //     document.getElementById('help_ctn').style.display = 'none';
    // }
    var html = deviceList.map(function (device) {
        return `
            <div class="device-wrap" id="device_${device.deviceId}">
                <div class="line"><span>AppName</span><b>${device.name.replace(/\s*:\s*(.*)$/,'<br/>[$1]')}</b></div>
                <div class="line"><span>DeviceModel</span><b>${device.model}</b></div>
                <div class="line"><span>platform</span><b>${device.platform}</b></div>
                <div class="line"><span>WeexVersion</span><b>${device.weexVersion}</b></div>
                <div class="line mr-bottom-10"><span>LogLevel</span><b><select class="selector log-level" x-data-device="${device.deviceId}" x-data-value="${device.logLevel||'log'}"><option value="debug">debug</option><option value="log">log</option><option value="info">info</option><option value="warn">warn</option><option value="error">error</option></select></b></div>
                <div class="line mr-bottom-10"><span>ElementMode</span><b><select class="selector element-mode"" x-data-device="${device.deviceId}" x-data-value="${device.elementMode||'native'}"><option value="native">native</option><option value="vdom">vdom</option></select></b></div>
                <div class="line mr-top-10"><span>RemoteDebug</span><b>${switchComponent(device)}</b></div>
                <div class="btn-ctn">
                <a class="btn" onClick="openDebugger('${device.deviceId}')" target="debugger${device.debuggerSessionId}" >Debugger</a>
                <a class="btn" onClick="openInspector('${device.deviceId}')" target="inspector${device.inspectorSessionId}">Inspector</a>
                </div>
                <div class="help">
                Inspector: click this button to open a page to inspect "Elements"(native element), "Console", "Sources", "Network"; Debugger: click here to open a page to debug JS files (make breakpoints, watch variables, callstack etc.)
                </div>
            </div>
            `;

    });
    if(html.length>0) {
        document.getElementById('devices_container').innerHTML = html.join('\n');
        var logLevelList = document.querySelectorAll('.log-level');
        var switchList=document.querySelectorAll('.switch');
        logLevelList.forEach(function(loglevelSelector){
            loglevelSelector.value=loglevelSelector.getAttribute('x-data-value');
            loglevelSelector.onchange=function(evt){
                var message={
                    method:'WxDebug.setLogLevel',
                    params:{
                        deviceId:evt.target.getAttribute('x-data-device'),
                        data:evt.target.value
                    }
                }
                websocket.send(JSON.stringify(message));
            }
        })
        var inspectModeList = document.querySelectorAll('.element-mode');
        inspectModeList.forEach(function(inspectModeSelector){
            inspectModeSelector.value=inspectModeSelector.getAttribute('x-data-value');
            inspectModeSelector.onchange=function(evt){
                var deviceId=evt.target.getAttribute('x-data-device');
                var message={
                    method:'WxDebug.setElementMode',
                    params:{
                        deviceId:deviceId,
                        data:evt.target.value
                    }
                }
                websocket.send(JSON.stringify(message));
                var device=findDevice(deviceId);
                if(device){
                    device.inspectorWindow&&device.inspectorWindow.location.reload();
                }
            }
        })
        switchList.forEach(function(swt){
            swt.onchange=function(evt){
                var el=evt.target;
                var deviceId=el.getAttribute('x-data');
                websocket.send(JSON.stringify({method:'WxDebug.setRemoteDebug',params:{
                    deviceId:deviceId,
                    data:el.checked
                }}));
                if(!el.checked){
                    var device=findDevice(deviceId);
                    if(device&&device.debuggerWindow) {
                        device.debuggerWindow.close();
                    }
                }
                else{
                    openDebugger(deviceId);
                }
                console.log(el.getAttribute('x-data'),evt.target.checked);
            }
        })

    }
    else{
        document.getElementById('devices_container').innerHTML ='';
    }
}
function findDevice(deviceId) {
    return _deviceList.filter(function (device) {
        return device.deviceId == deviceId;
    })[0]
}
function openDebugger(deviceId) {
    var device = findDevice(deviceId);
    if (device.debuggerWindow) {
        device.debuggerWindow.close();
    }
    document.getElementById('device_'+deviceId).querySelector('.switch-checkbox').checked=true;
    device.debuggerWindow = window.open(`/debugger.html?sessionId=${device.debuggerSessionId}`, `debugger${device.debuggerSessionId}`);

    device.debuggerWindow.onload = function () {
        device.debuggerWindow.sessionStorage.setItem('debugee', 'Debugee App: ' + device.name);
        device.debuggerWindow.document.body.firstElementChild.innerHTML = 'Debugee App: ' + device.name;
    }
}
function openInspector(deviceId) {
    var device = findDevice(deviceId);
    device.inspectorWindow = window.open(`/inspector/inspector.html?ws=${location.host + '/debugProxy/inspector/' + device.inspectorSessionId}&remoteFrontend=1`, `inspector${device.inspectorSessionId}`);

}
function createQRCode(id, content, width, height) {
    var el = document.getElementById(id);
    el.innerHTML = '';
    new QRCode(el, {
        text: content,
        width: width || 150,
        height: height || 150,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L
    });
    el.title = '';
}
function renderTreeView(files) {
    var treeView = document.getElementById('tree_view');
    var htmlStr = '<ul class="tree-view-list">';

    files.forEach(function (item) {
        htmlStr += `<li data-type=${item.type}>
            <span class='${item.type}-trigger-icon'></span>
            <a>
                <i class='${item.type}-icon'></i>
                <span>${item.name}</span>
            </a>
        </li>`;
    })

    htmlStr += '</ul>';
    treeView.innerHTML = htmlStr;
    treeView.style.display = 'block';

    // delegate click event
}
var switchComponent=function(device){
    return `<div class="switch">
    <input type="checkbox" id="switch_${device.deviceId}" x-data="${device.deviceId}" ${device.remoteDebug?'checked':''} name="switch" class="switch-checkbox" >
    <label class="switch-label" for="switch_${device.deviceId}">
        <div class="switch-inner">
            <div class="switch-active">ON</div>
            <div class="switch-inactive">OFF</div>
        </div>
        <div class="switch-switch"></div>
    </label>
</div>`;
}
    connect();
createQRCode('switchQrcode', `http:\/\/${location.host}/devtool_fake.html?_wx_devtool=ws:\/\/${location.host}/debugProxy/native`);

