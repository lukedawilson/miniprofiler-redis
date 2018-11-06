'use strict';

let redisSendCommand;
const blacklist = ['info'];

module.exports = function(redis) {
  redisSendCommand = redisSendCommand || redis.RedisClient.prototype.internal_send_command;

  return {
    name: 'redis',
    install: function(asyncCtx) {
      redis.RedisClient.prototype.internal_send_command = function(cmd) {
        const miniprofiler = asyncCtx.miniprofiler
        if (!miniprofiler || !miniprofiler.enabled)
          return redisSendCommand.call(this, cmd);

        if (this.ready && blacklist.indexOf(cmd.command) === -1) {
          const callback = cmd.callback;
          if (callback) {
            const query = `${cmd.command} ${cmd.args.join(', ')}`.trim();
            const timing = miniprofiler.startTimeQuery('redis', query);
            cmd.callback = function() {
              miniprofiler.stopTimeQuery(timing);
              callback.apply(this, arguments);
            };
          }
        }

        redisSendCommand.call(this, cmd);
      };
    }
  };
};
