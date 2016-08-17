angular.module('bikemoves')
  .service('settingsService', function(storageService, locationService, analyticsService) {
    var service = this,
      SETTINGS_KEY = 'settings',
      DEFAULT_SETTINGS = {
        accuracyLevel: 1,
        autoSubmit: true,
        trackData: true
      },
      updateAccuracy = function() {
        return service.getDesiredAccuracy().then(function(accuracy) {
          return locationService.updateSettings({
            desiredAccuracy: accuracy
          });
        });
      },
      updateTracking = function() {
        return service.getSettings().then(function(settings) {
          return analyticsService.updateTracking(settings.trackData);
        });
      },
      migrateSettings = function() {
        return service.getSettings().then(function(settings) {
          // Make sure accuracyLevel is an integer <= 1.
          if (typeof settings.accuracyLevel === 'string')
            settings.accuracyLevel = parseInt(settings.accuracyLevel);
          if (settings.accuracyLevel > 1) settings.accuracyLevel = 1;
          return settings;
        }).then(service.updateSettings);
      };

    service.getSettings = function() {
      return storageService.get(SETTINGS_KEY, DEFAULT_SETTINGS)
        .then(function(settings) {
          return angular.merge({}, DEFAULT_SETTINGS, settings);
        });
    };

    service.getDesiredAccuracy = function() {
      return service.getSettings().then(function(settings) {
        return [10, 0][settings.accuracyLevel];
      });
    };

    service.updateSettings = function(newSettings) {
      newSettings.accuracyLevel = parseInt(newSettings.accuracyLevel);
      return storageService.set(SETTINGS_KEY, newSettings).then(function() {
        updateAccuracy();
        updateTracking();
      });
    };

    service.clearAll = function() {
      return storageService.delete(SETTINGS_KEY);
    };

    // Migrate any old settings and set initial values.
    migrateSettings();
  });
