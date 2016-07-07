describe('Analytics Service Test', function() {
  var service;
  beforeEach(inject(function(analyticsService) {
    service = analyticsService
  }));

  describe("Update Tracking", function(){
    it("should allow tracking when true", function(){
      service.updateTracking(true);
      service.trackEvent("TEST", "d");
      expect(window.analytics.trackEvent).toHaveBeenCalled();
    })
    it("should block tracking when false", function(){
      service.updateTracking(false);
      service.trackEvent("TEST", "d");
      expect(window.analytics.trackEvent).not.toHaveBeenCalled();
    })
  })
  describe("Track Event", function(){
    it("Should record an event", function(){
      service.updateTracking(true);
      service.trackEvent("event", "e");
      expect(window.analytics.trackEvent).toHaveBeenCalledWith("event","e");
    })
  });
  describe("Track View", function(){
    it("Should record a view", function(){
      service.updateTracking(true);
      service.trackView("view");
      expect(window.analytics.trackEvent).toHaveBeenCalledWith("view")

    })
  });

});
