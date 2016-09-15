/**
 * Created by godsong on 16/6/14.
 */
importScripts('/lib/EventEmitter.js');
var weexBundleEntry = "__weex_bundle_entry__(define, require, document, bootstrap,register, render, __weex_define__, __weex_bootstrap__,typeof __weex_document__=='undefined'?undefined:__weex_document__,typeof __weex_viewmodel__=='undefined'?undefined:__weex_viewmodel__);";
var clearConsole=self.console.clear.bind(self.console);
var eventEmitter = new EventEmitter();
onmessage = function (message) {
    eventEmitter.emit(message.data.method, message.data)
};

self.callNative = function (instance, tasks, callback) {
    for(var i=0;i<tasks.length;i++){
        var task=tasks[i];
        if(task.method=='addElement'){
            for(var key in task.args[1].style){
                if(Number.isNaN(task.args[1].style[key])){
                    console.error('invalid value [NaN] for style ['+key+']',task);
                    //task.args[1].style[key]=0;
                }
            }
        }
    }
    postMessage({
        method: 'WxDebug.callNative',
        params: {
            instance: instance,
            tasks: tasks,
            callback: callback
        }
    })
};
self.callAddElement=function(instance, ref, dom, index, callback){
    postMessage({
        method: 'WxDebug.callAddElement',
        params: {
            instance: instance,
            ref: ref,
            dom:dom,
            index:index,
            callback: callback
        }
    })
};
self.__logger = function (level, msg) {
    console[level]('native:', msg);
};
self.nativeLog = function (text) {
    console.log(text);
};
eventEmitter.on('WxDebug.initJSRuntime', function (message) {
    importScripts(message.params.url);
    for (var key in message.params.env) {
        if(message.params.env.hasOwnProperty(key)) {
            self[key] = message.params.env[key];
        }
    }
});
eventEmitter.on('WxDebug.changeLogLevel', function (message) {
    self.WXEnvironment.logLevel = message.params;
});
eventEmitter.on('Console.messageAdded', function (message) {
    console.error('[Native Error]', message.params.message.text);
});
var instanceMap = {};
eventEmitter.on('WxDebug.callJS', function (data) {
    var method = data.params.method;
    if (method === 'createInstance') {
        var url = data.params.sourceUrl;
        postMessage({
            method: 'WxRuntime.clearLog',
        })
        importScripts(url);
        self.createInstance(data.params.args[0], weexBundleEntry, data.params.args[2], data.params.args[3]);
        instanceMap[data.params.args[0]] = true;
    }
    else if (method === 'destroyInstance') {
        if (instanceMap[data.params.args[0]]) {
            self.destroyInstance(data.params.args[0]);
            delete instanceMap[data.params.args[0]];
        }
        else {
            console.warn('invalid destroyInstance[' + data.params.args[0] + '] because runtime has been refreshed(It does not impact your code. )');
        }
    }
    else {
        self[data.params.method].apply(null, data.params.args);
    }
});

function dump(id) {
    postMessage({
        method: 'WxRuntime.dom',
        params: getRoot(id)
    })

}

