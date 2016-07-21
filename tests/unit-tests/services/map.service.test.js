describe("Map Service Test", function() {
  var service, storageService, map;
  SERVICE_ENDPOINT = 'http://utility.arcgis.com/usrsvcs/servers/c9e754f1fc35468a9392372c79452704/rest/services/CCRPC/BikeMovesBase/MapServer';

  beforeEach(inject(function(mapService, _storageService_) {
    service = mapService;
    storageService = _storageService_;
  }));
  beforeEach(inject(function($q) {
    window.plugin = {
      google: {
        maps: {
          Map: {
            getMap: jasmine.createSpy("getMap").and.callFake(function(){
              return {
                addMarker: jasmine.createSpy("addMarker").and.callFake(function(){
                  return {setPosition: function(){}} })//jasmine.createSpyObj("marker", ["setPosition"])})
                  ,
                addEventListener: jasmine.createSpy("addEventListener").and.callFake($q.resolve())
              }
            })
          },
          event:{
            MAP_READY : "",
            CAMERA_CHANGE: "",
            MAP_CLICK: ""
          }
        }
      }
    }
    var map = {
      mapFeatures :[
        jasmine.createSpyObj("tileOverlay",["setPosition"]),
         jasmine.createSpyObj("infoMarker",["addMarker"]),
         jasmine.createSpyObj("currentLocationMarker",["setPosition", "setVisible"]),
         jasmine.createSpyObj("infoMarker",["addMarker"]),
         jasmine.createSpyObj("infoMarker",["addMarker"]),
      ],
      on : jasmine.createSpy()
    }
    // spyOn(service, "initMap").and.returnValue($q.when())
    spyOn(service, "location2LatLng").and.callFake(function(location) {
      return {
        lat: location.lat,
        lng: location.lng
      }
    })
    httpBackend.expect("GET", SERVICE_ENDPOINT+"?f=json")
    .respond(200, { data: 'value' });

    storageService.initalizeDb(true);
    service.testMap(map);
  }));
  describe("Initalize Map", function(){

  })
  describe("Set Current Location", function() {
    beforeEach(function() {
      service.setCurrentLocation({
        latitude: 40,
        longitude: 40
      }).then(function() {
        console.log(service.currentLocation)
      });
      rootScope.$digest();
    })
    it("should set current location marker", function() {
      expect(service.currentLocation).toEqual({
        latitude: 40,
        longitude: 40
      })

    });
    it("should set marker to visible", function() {

    })
  })
  describe("Set Center", function() {
    it("should set center to location if duration is 0", function() {

    })
    it("should animate camera with duration length", function() {

    })
  })
  describe("Set Clicakable", function() {
    it("should set map clickable state", function() {

    });
  });
  describe("Set Trip Locations", function() {
    it("should set polylines", function() {

    });
    it("should make them visible", function() {

    });
  });
  describe("Zoom to trip Polyline", function() {
    it("should move camer to Polyline", function() {

    })
  })
  describe("Reset Map", function() {
    it("should hide elements", function() {

    });
  });
  describe("Get Legal Text", function() {
    it("should return License info", function() {

    });
  });
  describe("On Load", function() {
    it("should create comopments", function() {

    });
  });
  describe("Set Map State", function() {
    it("should set map state to input", function() {

    });
    it("should set map to normal as default", function() {

    });
  });
  describe("Remove Incident", function() {
    it("should hide marker")
  })
});
