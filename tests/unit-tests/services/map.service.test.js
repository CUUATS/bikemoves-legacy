describe("Map Service Test", function() {
  var service, storageService, q;
  beforeEach(inject(function(mapService, _storageService_) {
    service = mapService;
    storageService = _storageService_;
  }));
  beforeEach(function(){
    spyOn(service, "location2LatLng").and.callFake(function(location){
      return {lat: location.lat, lng: location.lng}
    })
    storageService.initalizeDb(true);
    service.initalizeMap();
  });
  describe("Set Current Location", function(){
    beforeEach(function(){
      service.setCurrentLocation({latitude: 40, longitude: 40}).then(function(){
        console.log(service.currentLocation)
      });
    })
    it("should set current location marker", function(){
      expect(service.currentLocation).toEqual({latitude: 40, longitude: 40})

    });
    it("should set marker to visible", function(){

    })
  })
  describe("Set Center", function(){
    it("should set center to location if duration is 0", function(){

    })
    it("should animate camera with duration length", function(){

    })
  })
  describe("Set Clicakable", function(){
    it("should set map clickable state", function(){

    });
  });
  describe("Set Trip Locations", function(){
    it("should set polylines", function(){

    });
    it("should make them visible", function(){

    });
  });
  describe("Zoom to trip Polyline", function(){
    it("should move camer to Polyline", function(){

    })
  })
  describe("Reset Map", function(){
    it("should hide elements", function(){

    });
  });
  describe("Get Legal Text", function(){
    it("should return License info", function(){

    });
  });
  describe("On Load", function(){
    it("should create comopments", function(){

    });
  });
  describe("Set Map State", function(){
    it("should set map state to input", function(){

    });
    it("should set map to normal as default", function(){

    });
  });
  describe("Remove Incident", function(){
    it("should hide marker")
  })
});
