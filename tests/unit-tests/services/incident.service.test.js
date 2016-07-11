describe('Incident Service Test', function() {
  var service, cordovaNetwork, rootScope, storageService, remoteService, collection;

  beforeEach(inject(function($q, _storageService_, _remoteService_, incidentService, $rootScope, $cordovaNetwork) {
    rootScope = $rootScope
    cordovaNetwork = $cordovaNetwork;
    service = incidentService;
    remoteService = _remoteService_;
    storageService = _storageService_;
    q= $q;
  }));
  beforeEach(inject(function($q) {
    collection = {
      insert : jasmine.createSpy("insert"),
      chain : function(){return {data: function(){return {map: function(){return [genPromise]}}
        }}
      },
      remove: jasmine.createSpy("insert")
    }
    spyOn(storageService, "getCollection").and.returnValue($q.resolve());
    spyOn(remoteService, "postIncident").and.returnValue($q.reject());
    spyOn(service, "getIncidentsCollection").and.returnValue($q.resolve(collection));
  }));
  describe("Get Address", function() {
    beforeEach(function() {
      offSpy = spyOn(cordovaNetwork, "isOffline").and.returnValue(false);
      geoSpy = spyOn(service, "geocode").and.returnValue(genPromise.promise);
    })
    it("should reject if offline ", function() {
      offSpy.and.returnValue(true)
      service.getAddress().then(function(res) {
        expect("promise").toBe("rejected");
      }).catch(function(err) {
        expect(err).toBe("offline");
      });
    });
    it("should resolve an address on success", function() {
      service.getAddress().then(function(res) {
        expect(res).toBe("An Address");
      }).catch(function(err) {
        expect(err).toBeUndefined();
      });
      genPromise.resolve("An Address")
      rootScope.$digest();
    });
    it("should reject on geocoder failure", function() {
      service.getAddress().then(function(res) {
        expect(res).toBeUndefined();
      }).catch(function(err) {
        expect(err).toBe("No Address")
      });
      genPromise.reject("No Address")
      rootScope.$digest();
    });
  });
  describe("Save Incident", function() {
    beforeEach(function() {
      service.setIncidentLocation({
        lat: 50,
        lng: 40
      })
      this.save = service.saveIncident(new Incident())
    });
    it("should post the incident", function() {
      expect(remoteService.postIncident).toHaveBeenCalled();
    })
    it("should store the incident on failure", function() {
      rootScope.$digest();
      rootScope.$digest();
      expect(collection.insert).toHaveBeenCalled();
    })
  });

  describe("Post Unposted", function() {
    beforeEach(function() {
      this.post = service.postUnposted();
      rootScope.$digest()

    });
    it("should remove post incidents", function() {
      expect(collection.remove).toHaveBeenCalled()

    });
    // it("should log failed post", function(){
    //   genPromise.reject("error");
    //   rootScope.$digest();
    //   expect(this.post).toBe("error")
    // })
  })
});
// TODO: reformat
