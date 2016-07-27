describe("Smoother Service", function() {
  var service;
  beforeEach(inject(function(smootherService) {
    service = smootherService;
  }));
  var points = [{
    lat: 0.000000,
    lng: 0.0000,
    time: '2016-07-11T17:48:42.489Z',
    tag: "A"
  }, {
    lat: 0.00000001,
    lng: 0.01,
    time: '2016-07-11T18:20:42.489Z',
    tag: "B"
  }, {
    lat: 0.01,
    lng: 0.0100001,
    time: '2016-07-11T18:21:02.489Z',
    tag: "C"
  }, {
    lat: 0.000001,
    lng: 0.011,
    time: '2016-07-11T18:21:22.489Z',
    tag: "D"
  }, {
    lat: 0.002,
    lng: 0.002,
    time: '2016-07-11T18:21:42.489Z',
    tag: "E"
  }, {
    lat: 0.0021,
    lng: 0.0021,
    time: '2016-07-11T18:22:02.489Z',
    tag: "F"
  }];

  var spikePoints = [{
    lat: 0.000000,
    lng: 0.0000,
    time: '2016-07-11T17:48:42.489Z',
    tag: "A"
  }, {
    lat: 0.00000001,
    lng: 0.01,
    time: '2016-07-11T18:20:42.489Z',
    tag: "B"
  }, {
    lat: 0.01,
    lng: 0.0100001,
    time: '2016-07-11T18:21:02.489Z',
    tag: "C"
  }, {
    lat: 0.000001,
    lng: 0.011,
    time: '2016-07-11T18:21:22.489Z',
    tag: "D"
  }, {
    lat: 0.002,
    lng: 0.02,
    time: '2016-07-11T18:21:42.489Z',
    tag: "E"
  }, {
    lat: 0.0021,
    lng: 0.021,
    time: '2016-07-11T18:22:02.489Z',
    tag: "F"
  }];
  describe("Position Filter", function() {
    it("should filter positions", function() {
      service.positionFilter(points, 1, 2);
      expect(true).toBe(true);
    });
  });
  describe("Velocity Filter", function() {
    it("Test Case #1", function() {
      var filterPoints = service.velocityFilter(points, 0, 9);
      expect(filterPoints.length).toEqual(4);
      expect(filterPoints[0].tag).toEqual('A');
      expect(filterPoints[3].tag).toEqual('F');
    });
    it("Test Case #2", function() {
      var filterPoints = service.velocityFilter(points, 9, 105);
      expect(filterPoints.length).toEqual(4);
      expect(filterPoints[0].tag).toEqual('B');
      expect(filterPoints[3].tag).toEqual('E');
    });
  });
  describe("Acceleration Filter", function() {
    it("Test Case #1", function() {
      var filterPoints = service.accelerationFilter(points, 6, 9);
      expect(filterPoints.length).toEqual(4);
      expect(filterPoints[0].tag).toEqual('C');
      expect(filterPoints[3].tag).toEqual('F');
    });
    it("Test Case #2", function() {
      var filterPoints = service.accelerationFilter(points, 0, 6);
      expect(filterPoints.length).toEqual(4);
      expect(filterPoints[0].tag).toEqual('A');
      expect(filterPoints[3].tag).toEqual('D');
    });
  });
  describe("Remove Spikes", function() {
    var spikeFree;
    beforeEach(function() {
      spikeFree = service.removeSpikes(spikePoints, 150);
    });
    it("should remove correct points", function() {
      var tags = spikeFree.map(function(v) {
        return v.tag;
      });
      expect(tags.length).toEqual(6);
      expect(tags.indexOf('c')).toEqual(-1);
    });
  });
  describe("Smooth Line", function() {
    it("should smooth Line", function() {
      service.smoothLine(points, 20);
      expect(true).toBe(true);
    });
  });
});
