'use strict';

/**
 * Created by godsong on 16/7/22.
 */
var HostsParser = require('parse-hosts');
var os = require('os');
exports.findRealHost = function (domain) {
    var hosts = HostsParser.get();

    for (var key in hosts) {
        if (hosts.hasOwnProperty(key)) {
            var domains = hosts[key];
            if (domains.indexOf(domain) != -1) {
                return key;
            }
        }
    }
    return domain;
};
exports.isValidLocalHost = function (host) {
    var ipMap = os.networkInterfaces();
    var flag = false;
    for (var name in ipMap) {
        if (ipMap.hasOwnProperty(name)) {
            var ips = ipMap[name];
            ips.forEach(function (ip) {
                if (host == ip.address) {
                    flag = true;
                    return true;
                }
            });
        }
    }
    return flag;
};