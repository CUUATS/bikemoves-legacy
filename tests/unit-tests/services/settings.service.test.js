describe("Settings Service Test", function() {
  var service, storageService, q, locationService, analyticsService;
  beforeEach(inject(function(settingsService, _storageService_,_analyticsService_, _locationService_) {
    service = settingsService;
    storageService = _storageService_;
    locationService = _locationService_;
    analyticsService = _analyticsService_;
    spyOn(locationService, "updateSettings");
    spyOn(analyticsService,"updateTracking");
  }));
  beforeEach(function() {
    storageService.initalizeDb(true);
    rootScope.$digest();
  });
  describe("Get Settings", function() {
    it("should return settings", function() {
      var expected = ['accuracyLevel', 'autoSubmit', 'trackData'].sort()
      service.getSettings().then(function(settings) {
        var actual = Object.keys(settings).sort();
        for (var i = 0; i < expected.length; i++) {
          expect(actual.indexOf(expected[i])).not.toEqual(-1);
        }
      });

      rootScope.$digest();
    });
  });
  describe("Get Desired Accuracy", function() {
    it("should get accuracy", function() {
      storageService.set('settings', {
        accuracyLevel: 1,
        autoSubmit: true
      })
      service.getDesiredAccuracy().then(function(res) {
        expect(res).toBe(0)
      })
      rootScope.$digest();
    });
  });
  describe("=Update Settings", function() {
    beforeEach(function(){
      service.updateSettings({accuracyLevel: 0, autoSubmit: false, trackData: true});
      rootScope.$digest()
    })
    it("should store settings", function() {
      service.getSettings().then(function(settings){
        expect(settings.accuracyLevel).toEqual(0);
        expect(settings.autoSubmit).toBeFalsy();
        expect(settings.trackData).toBeTruthy();
      })
      rootScope.$digest();
    });
    describe("Update accuracy", function() {
      it("should update location service", function() {
        expect(locationService.updateSettings.calls.count()).toEqual(2);
        expect(locationService.updateSettings).toHaveBeenCalledWith({desiredAccuracy: 10})
      })
    });
    describe("Update Tracking", function() {
      it("should set analytics status", function() {
        expect(analyticsService.updateTracking).toHaveBeenCalledWith(true)
      });
    });
  });
});
