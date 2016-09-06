'use strict';

/**
 * Created by godsong on 16/6/23.
 */
module.exports = function () {
    var stamp = new Date().getTime();
    var rand = +(Math.random() + '').slice(2);
    return stamp.toString(36) + rand.toString(36);
};