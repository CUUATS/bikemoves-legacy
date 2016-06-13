angular.module('bikemoves')
.service('settingsService', function(storageService, locationService) {
    var service = this,
      SETTINGS_KEY = 'settings',
      DEFAULT_SETTINGS = {
        accuracyLevel: 1,
        autoSubmit: true
      },
      updateAccuracy = function() {
        return service.getDesiredAccuracy().then(function(accuracy) {
          return locationService.updateSettings({desiredAccuracy: accuracy});
        });
      };

    service.getSettings = function() {
      return storageService.get(SETTINGS_KEY, DEFAULT_SETTINGS);
    };

    service.getDesiredAccuracy = function() {
      return service.getSettings().then(function(settings) {
        return [100, 10, 0][settings.accuracyLevel];
      });
    };

    service.updateSettings = function(newSettings) {
      return storageService.set(SETTINGS_KEY, newSettings).then(updateAccuracy);
    };

    service.clearAll = function() {
      return storageService.delete(SETTINGS_KEY);
    };

    // Set initial accuracy.
    updateAccuracy();
  })
