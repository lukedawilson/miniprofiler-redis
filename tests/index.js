'use strict';

const expect = require('chai').expect;
const request = require('request');
const server = require('./server');

describe('Redis Tests', function() {

  before((done) => { server.listen(8080, done); });
  after((done) => { server.close(done); });

  it('should profile redis SET command', function(done) {
    request('http://localhost:8080/redis-set-key', (err, response, body) => {
      const ids = JSON.parse(response.headers['x-miniprofiler-ids']);

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        const result = JSON.parse(body);

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
    request('http://localhost:8080/redis-set-get-key', (err, response, body) => {
      const ids = JSON.parse(response.headers['x-miniprofiler-ids']);
      expect(body).to.be.equal('Awesome!');

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        const result = JSON.parse(body);

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

  it('should not profile redis when used fire and forget', function(done) {
    request('http://localhost:8080/redis-set-without-callback', (err, response, body) => {
      const ids = JSON.parse(response.headers['x-miniprofiler-ids']);
      expect(body).to.be.equal('');
      expect(ids).to.have.lengthOf(1);

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        const result = JSON.parse(body);

        expect(result.Id).to.equal(ids[0]);
        expect(result.Name).to.equal('/redis-set-without-callback');
        expect(result.Root.Children).to.be.empty;
        expect(result.Root.CustomTimings).to.not.have.property('redis');
        done();
      });
    });
  });

  it('should not profile INFO as a custom command', function(done) {
    request('http://localhost:8080/redis-info', (err, response) => {
      const ids = JSON.parse(response.headers['x-miniprofiler-ids']);

      request.post({url: 'http://localhost:8080/mini-profiler-resources/results/', form: { id: ids[0], popup: 1 } }, (err, response, body) => {
        const result = JSON.parse(body);
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
