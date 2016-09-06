'use strict';

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Created by godsong on 16/6/24.
 */
var Emitter = require('events').EventEmitter;
var Uuid = require('../util/Uuid');
var Logger = require('./Logger');

var Peer = function (_Emitter) {
    (0, _inherits3.default)(Peer, _Emitter);

    function Peer(websocket) {
        (0, _classCallCheck3.default)(this, Peer);

        var _this = (0, _possibleConstructorReturn3.default)(this, (Peer.__proto__ || Object.getPrototypeOf(Peer)).call(this));

        _this.messageBuffer = [];
        _this.websocket = websocket;
        _this.websocket.on('close', function () {
            if (!_this.websocket.removed) {
                Logger.debug('socket close:', _this.websocket._info);
                if (_this.oppositePeer) {
                    _this.oppositePeer.oppositePeer = null;
                }
                _this.oppositePeer = null;
                _this.websocket = null;
                if (_this.messageBuffer.length > 0) {}
                _this.messageBuffer = [];
                _this.emit('close');
            }
        });
        return _this;
    }

    (0, _createClass3.default)(Peer, [{
        key: 'send',
        value: function send(message) {
            var _this2 = this;

            if (this.websocket.readyState == 1) {
                if (Array.isArray(message)) {
                    message.forEach(function (m) {
                        _this2.websocket.send(JSON.stringify(m));
                    });
                } else {

                    this.websocket.send(JSON.stringify(message));
                }
            } else {
                Logger.error('websocket not opened!');
            }
        }
    }, {
        key: 'setOppositePeer',
        value: function setOppositePeer(peer) {
            this.oppositePeer = peer;
            if (this.messageBuffer.length > 0) {
                peer.send(this.messageBuffer);
                this.messageBuffer = [];
            }
        }
    }]);
    return Peer;
}(Emitter);

var _sessionMap = {};

var P2PSession = function (_Emitter2) {
    (0, _inherits3.default)(P2PSession, _Emitter2);

    function P2PSession() {
        (0, _classCallCheck3.default)(this, P2PSession);

        var _this3 = (0, _possibleConstructorReturn3.default)(this, (P2PSession.__proto__ || Object.getPrototypeOf(P2PSession)).call(this));

        _this3.peerList = [];
        _this3.id = Uuid();
        _this3.fresh = true;
        return _this3;
    }

    (0, _createClass3.default)(P2PSession, [{
        key: 'join',
        value: function join(websocket) {
            this.addPeer(websocket);
            return this.fresh;
        }
    }, {
        key: 'postMessage',
        value: function postMessage(websocket, message) {

            var peer = this.findPeer(websocket);
            if (peer) {
                if (peer.oppositePeer) {
                    peer.oppositePeer.send(message);
                } else {
                    peer.messageBuffer.push(message);
                }
            } else {
                Logger.error('Error:can not find the peer : ', websocket._info);
            }
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.removeAllListeners();
            this.peerList = null;
            delete _sessionMap[this.id];
        }
    }, {
        key: 'findPeer',
        value: function findPeer(websocket) {
            return this.peerList.filter(function (peer) {
                return peer.websocket === websocket;
            })[0];
        }
    }, {
        key: 'addPeer',
        value: function addPeer(websocket) {
            var _this4 = this;

            var peer = new Peer(websocket);

            if (this.peerList.length == 0) {
                this.peerList.push(peer);
            } else if (this.peerList.length == 1) {
                if (this.peerList[0].websocket === websocket) {
                    this.peerList[0] = peer;
                } else {
                    peer.setOppositePeer(this.peerList[0]);
                    this.peerList.push(peer);
                    this.peerList[0].setOppositePeer(peer);
                }
            } else {
                var replaced = false;
                this.peerList = this.peerList.map(function (p) {
                    if (p.websocket == null) {
                        console.error('bug！');
                    }
                    if (p.websocket && (p.websocket === websocket || p.websocket._deviceId === websocket._deviceId)) {
                        replaced = true;
                        peer.setOppositePeer(p.oppositePeer);
                        p.websocket.removed = true;
                        p.oppositePeer.setOppositePeer(peer);
                        return peer;
                    } else {
                        return p;
                    }
                });
                if (!replaced) {
                    this.peerList.forEach(function (peer) {
                        Logger.debug('state:', peer.websocket._info);
                    });
                    Logger.debug('Peer session can not add the third peer!');
                    return;
                } else {
                    Logger.warn('Peer replaced!');
                }
            }
            peer.on('close', function () {
                if (_this4.peerList) {
                    _this4.peerList = _this4.peerList.filter(function (p) {
                        return p !== peer && p.websocket !== peer.websocket;
                    });
                    Logger.debug('peer removed:', _this4.id, _this4.peerList.length);
                }
            });
            Logger.debug('addPeer', this.id, this.peerList.length, peer.websocket._info);
            if (this.peerList.length == 2) {
                this.fresh = false;
            }
        }
    }], [{
        key: 'newSession',
        value: function newSession(websocket) {
            var session = new P2PSession();
            session.addPeer(websocket);
            websocket._p2pSessionId = session.id;
            _sessionMap[session.id] = session;
            return session;
        }
    }, {
        key: 'removeSession',
        value: function removeSession(websocket) {
            var session = _sessionMap[websocket._p2pSessionId];
            if (session) {
                session.destroy();
            }
        }
    }, {
        key: 'join',
        value: function join(sessionId, websocket) {
            if (_sessionMap[sessionId]) {
                websocket._p2pSessionId = sessionId;
                var fresh = _sessionMap[sessionId].fresh;
                _sessionMap[sessionId].addPeer(websocket);
                return fresh;
            } else {
                Logger.error('can not join session,unknown sessionId[' + sessionId + ']');
            }
        }
    }, {
        key: 'findOppositePeer',
        value: function findOppositePeer(websocket) {
            var session = _sessionMap[websocket._p2pSessionId];
            if (!session) {
                Logger.error('can not find session with [' + websocket._p2pSessionId + ']');
                return;
            }
            var peer = session.findPeer(websocket);
            if (peer) {
                return peer.oppositePeer;
            }
            return null;
        }
    }, {
        key: 'postMessage',
        value: function postMessage(websocket, message) {
            var session = _sessionMap[websocket._p2pSessionId];
            if (!session) {
                Logger.error('can not find session with [' + websocket._p2pSessionId + ']');
                return;
            }
            session.postMessage(websocket, message);
        }
    }]);
    return P2PSession;
}(Emitter);

module.exports = P2PSession;