angular.module('bikemoves').controller('profileCtrl', [
  '$scope',
  '$ionicPopup',
  'profileService',
  'remoteService',
  'tripService',
  'analyticsService',
  'mapService',
  function($scope, $ionicPopup, profileService, remoteService, tripService, analyticsService, mapService) {
    var saveProfile = function(profile) {
        return profileService.updateProfile(profile);
      },
      submitProfile = function() {
        profileService.getProfile().then(function(profile) {
          remoteService.postUser(profile).catch(function(response) {
            analyticsService.trackEvent('Error', 'Failed to Submit Profile');
          });
        });
      };

    $scope.saveProfile = function() {
      // Prevent save action from firing twice when the save button is tapped.
      if (!$scope.dirty) return;
      $scope.dirty = false;
      analyticsService.trackEvent('Profile', 'Saved Profile');
      saveProfile($scope.profile).then(submitProfile);
    };

    $scope.profileChanged = function() {
      $scope.dirty = true;
    };

    $scope.$on('$ionicView.enter', function(e) {
      analyticsService.trackView('Profile');
      $scope.dirty = false;
      profileService.getProfile().then(function(profile) {
        $scope.profile = profile;
      });
      tripService.getTotalDistance().then(function(distance) {
        var miles = distance * 0.000621371;
        $scope.distance = miles.toFixed(1);
        $scope.ghg = (miles * 0.8115).toFixed(1);
      });
    });

    $scope.$on('$ionicView.beforeLeave', function(e) {
      // TODO: Prevent the view from changing until the popup has been
      // dismissed. See: https://github.com/driftyco/ionic/issues/3791
      if ($scope.dirty) {
        mapService.setClickable(false);
        $ionicPopup.confirm({
          title: 'Save Your Profile',
          template: 'Do you want to save the changes to your profile?',
          cancelText: 'Discard',
          okText: 'Save'
        }).then(function(res) {
          if (res) saveProfile().then(submitProfile);
          mapService.setClickable(true);
        });
      }
    });

    $scope.options = {
      age: remoteService.getOptions('User', 'Age'),
      cyclingExperience: remoteService.getOptions('User', 'ExperienceLevel'),
      gender: remoteService.getOptions('User', 'Gender')
    };
  }
]);
