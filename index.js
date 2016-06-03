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
          var query = `${cmd.command} ${cmd.args.join(', ')}`.trim();
          var timing = req.miniprofiler.startTimeQuery('redis', query);

          var callback = cmd.callback;
          cmd.callback = () => {
            req.miniprofiler.stopTimeQuery(timing);
            callback();
          };
        }

        redisSendCommand.call(this, cmd);
      };

      next();
    }
  };
};