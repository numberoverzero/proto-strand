(function (global) {
  'use strict';
  function module() {
    var _uid = 0;
    function nextId() {
      return _uid++;
    }

    function Strand(worker, options) {
      options = options || {};
      this.callbacks = {};
      this.worker = worker;
      this.debug = options.debug;
      this.handlers = {};
      this.id = nextId();
    }

    Strand.prototype.on = function (name, func) {
      this.handlers[name] = func;
    };

    Strand.prototype.send = function (func, obj, callback) {
      this._send({
        __i: {
          type: 'func',
          transfer: false,
          target: func,
          payload: obj
        }
      }, callback);
    };

    Strand.prototype.transfer = function (func, obj, callback) {
      this._send({
        __i: {
          type: 'func',
          transfer: true,
          target: func,
          payload: obj
        }
      }, callback);
    };


    Strand.prototype._send = function (obj, callback) {
      obj.strandId = this.id;
      if (callback) {
        var callbackId = nextId();
        this.callbacks[callbackId] = callback;
        obj.callbackId = callbackId;
      }

      var args = [obj];
      if (obj.transfer) {
        args.push([obj.transfer]);
      }
      this.worker.postMessage.apply(this, args);

      if (this.debug) {
        this._debug(obj);
      }
    };

    Strand.prototype._debug = function (obj) {
      // TODO Better log format
      console.log(obj.strandId);
      console.log(obj.type);
      console.log(obj.target);
      console.log(obj.type);
      if (obj.callbackId) {
        console.log(obj.callbackId);
      }
    };

    Strand.prototype._receive = function (obj) {
      if (obj.type === 'func') {
        if (this.handlers[obj.target]) {
          var targetArgs = [obj.payload];
          // Sender expects a callback from target
          if (obj.callbackId) {
            var self = this;
            var targetCallback = function () {
              var callbackArgs = arguments;
              self._callback(obj.callbackId, callbackArgs);
            };
            targetArgs.push(targetCallback);
          }
          this.handlers[obj.target].apply(this, targetArgs);
        } else {
          console.log('Unknown target ' + obj.target);
        }
      } else if (obj.type === 'callback') {
        if (this.callbacks[obj.callbackId]) {
          var callback = this.callbacks[obj.callbackId];
          delete this.callbacks[obj.callbackId];
          callback(obj.payload);
        } else {
          console.log('Unknown callback ' + obj.callbackId);
        }
      } else {
        console.log('Unknown type ' + obj.type);
      }
    };

    Strand.prototype._callback = function (callbackId, args) {
      this._send({
        __i: {
          type: 'callback',
          callbackId: callbackId,
          transfer: false,
          payload: args
        }
      });
    };

    // Export module
    return {
      Strand: Strand
    };
  }
  global.strand = module();
}(this));
