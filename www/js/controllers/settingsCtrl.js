angular.module('bikemoves').controller('SettingsCtrl', [
  '$scope',
  '$q',
  '$ionicPopup',
  'profileService',
  'settingsService',
  'tripService',
  'analyticsService',
  'config',
  function($scope, $q, $ionicPopup, profileService, settingsService, tripService, analyticsService, config) {
    var reloadSettings = function() {
      return settingsService.getSettings().then(function(settings) {
        $scope.settings = settings;
      });
    };

    $scope.version = config.appVersion;

    $scope.updateSettings = function() {
      analyticsService.trackEvent('Settings', 'Updated Settings');
      return settingsService.updateSettings($scope.settings);
    };

    $scope.reset = function() {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Reset Saved Data',
        template: 'Are you sure you want to delete all saved data, including settings and saved trips?'
      });

      confirmPopup.then(function(res) {
        if (res) {
          var settingsReset = settingsService.clearAll().then(reloadSettings),
            profileReset = profileService.clearAll(),
            tripsReset = tripService.clearAll();
          $q.all([settingsReset, profileReset, tripsReset]).then(function() {
            $ionicPopup.alert({
              title: 'Data Reset',
              content: 'All data have been reset.'
            });
          });
        }
      });
    };

    $scope.$on('$ionicView.enter', function(e) {
      analyticsService.trackView('Settings');
    });

    reloadSettings();
  }
]);
