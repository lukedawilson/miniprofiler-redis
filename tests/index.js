'use strict';

var expect = require('chai').expect;
var miniprofiler = require('miniprofiler');
var http = require('http');
var request = require('request');
var ip = require('docker-ip');

console.log(ip())

var redis = require('redis');
var client = redis.createClient(6379, ip());
console.log(client)

describe('Redis Tests', function() {
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

        if (request.url == '/redis-set-get-key') {
          client.set('key', 'Awesome!', () => {
            client.get('key', (err, result) => {
              response.end('');
            });
          });
        }

        if (request.url == '/unprofiled') {
          client.set('key', 'Some value', () => {
            client.get('key', (err, result) => {
              response.end('Some value');
            });
          });
        }

      });
    });
  });

  before((done) => { server.listen(8080, done); });
  after((done) => { server.close(done); });

  it('should profile redis SET command', function(done) {
    request('http://localhost:8080/redis-set-key', (err, response, body) => {
      var ids = JSON.parse(response.headers['x-miniprofiler-ids']);
      expect(ids).to.have.lengthOf(1);

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        var result = JSON.parse(body);

        expect(result.Id).to.equal(ids[0]);
        expect(result.Name).to.equal('/redis-set-key');
        expect(result.Root.Children).to.be.empty;
        expect(result.Root.CustomTimings).to.have.property('redis');
        expect(result.Root.CustomTimings.redis).to.have.lengthOf(1);

        expect(result.Root.CustomTimings.redis[0].ExecuteType).to.be.equal('redis');
        expect(result.Root.CustomTimings.redis[0].CommandString).to.be.equal('set key, Awesome!');
        expect(result.Root.CustomTimings.redis[0].DurationMilliseconds).to.be.below(result.DurationMilliseconds);
        done();
      });
    });

  });

  it('should profile redis SET and GET command', function(done) {
    request('http://localhost:8080/redis-set-get-key', (err, response) => {
      var ids = JSON.parse(response.headers['x-miniprofiler-ids']);
      expect(ids).to.have.lengthOf(1);

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        var result = JSON.parse(body);

        expect(result.Id).to.equal(ids[0]);
        expect(result.Name).to.equal('/redis-set-get-key');
        expect(result.Root.Children).to.be.empty;
        expect(result.Root.CustomTimings).to.have.property('redis');
        expect(result.Root.CustomTimings.redis).to.have.lengthOf(2);

        expect(result.Root.CustomTimings.redis[0].ExecuteType).to.be.equal('redis');
        expect(result.Root.CustomTimings.redis[0].CommandString).to.be.equal('set key, Awesome!');
        expect(result.Root.CustomTimings.redis[0].DurationMilliseconds).to.be.below(result.DurationMilliseconds);

        expect(result.Root.CustomTimings.redis[1].ExecuteType).to.be.equal('redis');
        expect(result.Root.CustomTimings.redis[1].CommandString).to.be.equal('get key');
        expect(result.Root.CustomTimings.redis[1].DurationMilliseconds).to.be.below(result.DurationMilliseconds);
        done();
      });
    });
  });

  it('should not profile INFO as a custom command', function(done) {
    request('http://localhost:8080/redis-info', (err, response) => {
      var ids = JSON.parse(response.headers['x-miniprofiler-ids']);
      expect(ids).to.have.lengthOf(1);

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        var result = JSON.parse(body);
        expect(result.Root.CustomTimings).to.not.have.property('redis');
        done();
      });
    });
  });

  it('should not break redis usage on unprofiled routes', function(done) {
    request('http://localhost:8080/unprofiled', (err, response, body) => {
      expect(response.headers).to.not.include.keys('x-miniprofiler-ids');
      expect(body).to.be.equal('Some value');
      done();
    });
  });

});
