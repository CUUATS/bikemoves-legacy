describe('Analytics Service Test', function() {
  var service, cordovaNetwork, q;
  beforeEach(inject(function(incidentService, $cordovaNetwork, $q) {
    service = incidentService;
    cordovaNetwork = $cordovaNetwork;
    q = $q;
  }));
  beforeEach(function() {
    offSpy = spyOn(cordovaNetwork, "isOffline");
    spyOn(q, "reject")
  });
  describe("Get Address", function() {
    it("expect offline", function() {
      offSpy.and.returnValue(true);
      expect(cordovaNetwork.isOffline()).toBeTruthy();
    });
    it("should reject if offline ", function() {
      offSpy.and.returnValue(true);
      var q = service.getAddress("ASD");

    });
  });
});
