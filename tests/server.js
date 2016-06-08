'use strict';

var miniprofiler = require('miniprofiler');
var http = require('http');
var ip = require('docker-ip');

var redis = require('redis');
var client = redis.createClient(6060, ip());

var server = http.createServer((request, response) => {
  miniprofiler.express((req, res) => { return !req.url.startsWith('/unprofiled'); })(request, response, () => {
    require('../index.js')(redis).handler(request, response, () => {

      if (request.url == '/redis-info') {
        client.info(() => {
          response.end('');
        });
      }

      if (request.url == '/redis-set-key') {
        client.set('key', 'Awesome!', () => {
          response.end('');
        });
      }

      if (request.url == '/redis-set-without-callback') {
        client.set('key', 'Fire and forget');
        response.end('');
      }

      if (request.url == '/redis-set-get-key') {
        client.set('key', 'Awesome!', () => {
          client.get('key', (err, result) => {
            response.end(result);
          });
        });
      }

      if (request.url == '/unprofiled') {
        client.set('key', 'Some value', () => {
          client.get('key', (err, result) => {
            response.end(result);
          });
        });
      }

    });
  });
});

module.exports = server;