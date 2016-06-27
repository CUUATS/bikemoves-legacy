angular.module('bikemoves')
  .service('profileService', function(storageService) {
    var service = this,
      PROFILE_KEY = 'profile',
      DEFAULT_PROFILE = {
        age: 0,
        cyclingExperience: 0,
        sex: 0
      };

    service.getProfile = function() {
      return storageService.get(PROFILE_KEY, DEFAULT_PROFILE);
    };

    service.updateProfile = function(newProfile) {
      return storageService.set(PROFILE_KEY, newProfile);
    };

    service.clearAll = function() {
      return storageService.delete(PROFILE_KEY);
    };
  });
