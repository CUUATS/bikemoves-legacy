describe("Trip Service Test", function() {
  var service, storageService, q;
  beforeEach(inject(function(tripService, _storageService_) {
    service = tripService;
    storageService = _storageService_;
  }));
  beforeEach(inject(function($q) {
    q = $q;
    collection = {
      insert: jasmine.createSpy("insert"),
      chain: function() {
        return {
          simplesort: function() {
            return {
              data: function(){return "Sorted Trips"}
            }
          }
        }
      },
      update: jasmine.createSpy("update"),
      data: {
        length: 2
      },
      get: function(){
        return "Trip"
      },
      remove : jasmine.createSpy("remove")

    }
    spyOn(storageService, "getCollection").and.callFake(function() {
      return $q.when(collection)
    })
    spyOn(storageService, "save").and.returnValue($q.resolve("Saved"))

  }));
  describe("Get Trips Collection", function() {
    it("should return trips collection", function() {
      var p = service.getTripsCollection()
      p.then(function(res) {
        expect(res).toBe(collection);
      })
      rootScope.$digest();
    })
  });
  describe("Update Trip", function() {
    it("should return settings", function() {
      this.update = service.updateTrip();
      rootScope.$digest();
      expect(collection.update).toHaveBeenCalled();
    });
  });
  describe("Get Trips", function() {
    it("should return trips", function() {
      var trips = service.getTrips();
      trips.then(function(trips){
        expect(trips).toBe("Sorted Trips")
      })
      rootScope.$digest();
    });
  })
  describe("Get Trip", function() {
    it("should return a trip", function() {
      var trip = service.getTrip();
      trip.then(function(trip){
        expect(trip).toBe("Trip")
      })
      rootScope.$digest();
    })
  })
  describe("Delete Trip", function() {
    beforeEach(function(){
      this.del = service.deleteTrip();
    })
    it("should remove a trip", function() {
      rootScope.$digest();
      expect(collection.remove).toHaveBeenCalled();
    })
    it("should save results", function() {
      this.del.then(function(save){
        expect(save).toBe("Saved");
      })
      rootScope.$digest();
    })
  })
  describe("Get Total Distance", function() {
    it("Should Sum distances", function() {
      var dist = service.getTotalDistance();

      dist.then(function(dist){
        expect(dist).toBe(sum);
      })
      rootScope.$digest();
    })
    it("Should return 0 if no points", function(){
      collection.data.length = 0;
      var dist = service.getTotalDistance();
      dist.then(function(distance){
        expect(distance).toBe(0);
      });
      rootScope.$digest();
    });

  });
  describe("Clear All", function() {
    it("Should remove data", function() {

    })
  })
});
