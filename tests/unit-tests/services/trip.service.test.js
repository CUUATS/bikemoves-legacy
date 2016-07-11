describe("Trip Service Test", function() {
  var service, storageService, q;
  beforeEach(inject(function(tripService, _storageService_) {
    service = tripService;
    storageService = _storageService_;
    spyOn(storageService, "save").and.callThrough();
  }));
  beforeEach(function(){
    storageService.initalizeDb(true);
    service.getTripsCollection().then(function(collection){
      collection.clear()
    });
    rootScope.$digest();
  });
  describe("Get Trips Collection", function() {
    it("should return trips collection", function() {
      var p = service.getTripsCollection()
      p.then(function(res) {
        expect(res.name).toBe("trips");
      })
      rootScope.$digest();
    })
  });
  describe("Save Trip", function(){
    it("should add a trip to collection", function(){
      service.saveTrip(new Trip())
      service.getTripsCollection().then(function(res){
        expect(res.data.length).toBe(1);
      });
      rootScope.$digest()
    })
  })
  describe("Update Trip", function() {
    it("should update trip", function() {
      service.saveTrip(new Trip()).then(function(){
        service.getTripsCollection().then(function(res){
          var update = res.data[0]
          update.origin = 3;
          service.updateTrip(update).then(function(res){
            service.getTripsCollection().then(function(res){
              expect(res.data[0].origin).toBe(3)
            });
          });
        });
      })
      rootScope.$digest();
    });
  });
  describe("Get Trips", function() {
    var trips;
    beforeEach(function(){
      var trip = new Trip();
      trip.startTime = 5
      service.saveTrip(trip);
      trip = new Trip()
      trip.startTime = 6;
      service.saveTrip(trip);
      service.getTrips().then(function(res){
        trips = res;
      });
      rootScope.$digest();
    });
    it("should return trips", function() {
      expect(trips).toEqual(jasmine.any(Array))
    });
    it("should sort trips by endtime", function(){
      isCorrect = trips.map(function(trip){return trip.startTime}).reduce(function(a,b){
        if(b > a) return 1; return 0;
      })
      expect(isCorrect).toEqual(0);
    })
  })
  describe("Get Trip", function() {
    it("should return a trip", function() {
      service.saveTrip(new Trip());
      service.saveTrip(new Trip());
      var trip = service.getTrip(1);
      trip.then(function(trip){
        expect(trip.$loki).toBe(1);
      })
      rootScope.$digest();
    })
  })
  describe("Delete Trip", function() {
    beforeEach(function(){
      service.saveTrip(new Trip());
      service.saveTrip(new Trip());
      service.deleteTrip(2)
      rootScope.$digest();
    })
    it("should remove a trip", function() {
      service.getTripsCollection().then(function(trips){
        expect(trips.data.length).toBe(1)
      })
      rootScope.$digest();
    })
    it("should save results", function() {
      expect(storageService.save).toHaveBeenCalled();
    })
  })
  describe("Get Total Distance", function() {
    var singleTrip;
    beforeEach(function(){
      var trip = new Trip();
      trip._appendLocation({latitude: 20, longitude:40});
      trip._appendLocation({latitude:20.1, longitude: 40.1});
      service.saveTrip(trip);
      service.getTotalDistance().then(function(distance){
        singleTrip = distance;
      });
      rootScope.$digest();

    });
    it("Should calculate a distance", function() {
      expect(singleTrip).toBeGreaterThan(1000)


    })
    it("Should sum multiple distances", function(){
      var trip = new Trip();
      trip._appendLocation({latitude: 20, longitude:40});
      trip._appendLocation({latitude:20.05, longitude: 40.05});
      service.saveTrip(trip);
      service.getTotalDistance().then(function(distance){
        expect(distance + singleTrip).toBeGreaterThan(singleTrip);
      });
      rootScope.$digest();
    })
    it("Should return 0 if no points", function(){
      service.getTripsCollection().then(function(collection){
        collection.clear()
      });
      service.getTotalDistance().then(function(distance){
        expect(distance).toBe(0);
      });
      rootScope.$digest();
    });

  });
  describe("Clear All", function() {
    it("Should remove data", function() {
      service.saveTrip(new Trip());
      service.clearAll();
      service.getTripsCollection().then(function(trips){
        expect(trips.data.length).toBe(0)
      })
      rootScope.$digest()
    })
  })
});
