angular.module('bikemoves')
  .service('analyticsService', function() {
    var service = this,
      isInitialized = false,
      isTracking = false;
    service.updateTracking = function(trackData) {
      isTracking = trackData;
      if (typeof analytics != 'undefined' && trackData && !isInitialized) {
        window.analytics.startTrackerWithId('UA-79702100-1');
        if (window.device) window.analytics.setUserId(window.device.uuid);
        isInitialized = true;
      }
    };
    service.trackEvent = function(category, name) {
      if (isInitialized && isTracking) analytics.trackEvent(category, name);
    };
    service.trackView = function(view) {
      if (isInitialized && isTracking) analytics.trackEvent(view);
    };
  });
