angular.module('bikemoves')
  .service('analyticsService', [function() {
    var service = this,
      isTracking = false;
    service.updateTracking = function(trackData) {
      isTracking = trackData;
      console.log("Tracking State Changed to: ", isTracking);
    };
    service.trackEvent = function(category, name) {
      if (typeof analytics !== undefined && isTracking) analytics.trackEvent(category, name);
    };
    service.trackView = function(view) {
      if (typeof analytics !== undefined && isTracking) analytics.trackEvent(view);
    };
  }]);
