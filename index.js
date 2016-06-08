'use strict';

var redisSendCommand;
var blacklist = ['info'];

module.exports = function(redis) {
  redisSendCommand = redisSendCommand || redis.RedisClient.prototype.internal_send_command;

  return {
    name: 'redis',
    handler: function(req, res, next) {

      redis.RedisClient.prototype.internal_send_command = !req.miniprofiler || !req.miniprofiler.enabled ? redisSendCommand : function(cmd) {
        if (this.ready && blacklist.indexOf(cmd.command) == -1) {
          var callback = cmd.callback;
          if (callback) {
            var query = `${cmd.command} ${cmd.args.join(', ')}`.trim();
            var timing = req.miniprofiler.startTimeQuery('redis', query);
            cmd.callback = function() {
              req.miniprofiler.stopTimeQuery(timing);
              callback.apply(this, arguments);
            };
          }
        }
        redisSendCommand.call(this, cmd);
      };

      next();
    }
  };
};