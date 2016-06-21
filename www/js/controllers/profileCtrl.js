angular.module('bikemoves').controller('profileCtrl', [
  '$scope',
  '$ionicPopup',
  'profileService',
  'remoteService',
  'tripService',
  function($scope, $ionicPopup, profileService, remoteService, tripService) {
    if(typeof analytics !== undefined) analytics.trackView("Profile")
    var saveProfile = function(profile) {
        return profileService.updateProfile(profile);
      },
      submitProfile = function() {
        profileService.getProfile().then(function(profile) {
          remoteService.postUser(profile).catch(function(response) {
            console.log(response)
          });
        });
      };

    $scope.saveProfile = function() {
      // Prevent save action from firing twice when the save button is tapped.
      if (!$scope.dirty) return;
      $scope.dirty = false;
      if(typeof analytics !== undefined) analytics.trackEvent("Profile", "Saved");
      saveProfile($scope.profile).then(submitProfile);
    };

    $scope.profileChanged = function() {
      $scope.dirty = true;
    };

    $scope.$on('$ionicView.enter', function(e) {
      $scope.dirty = false;
      profileService.getProfile().then(function(profile) {
        $scope.profile = profile;
      });
      tripService.getTotalDistance().then(function(distance) {
        var miles = distance * 0.000621371;
        $scope.distance =  miles.toFixed(1);
        $scope.ghg = (miles * .8115).toFixed(1);
      });
    });

    $scope.$on('$ionicView.beforeLeave', function(e) {
      // TODO: Prevent the view from changing until the popup has been
      // dismissed. See: https://github.com/driftyco/ionic/issues/3791
      var profile = angular.copy($scope.profile);
      if ($scope.dirty) {
        $ionicPopup.confirm({
           title: 'Save Your Profile',
           template: 'Do you want to save the changes to your profile?',
           cancelText: 'Discard',
           okText: 'Save'
        }).then(function(res) {
          if (res) saveProfile(profile).then(submitProfile);
        });
      }
    });

    $scope.options = {
      age: remoteService.getOptions('User', 'Age'),
      cyclingExperience: remoteService.getOptions('User', 'ExperienceLevel'),
      gender: remoteService.getOptions('User', 'Gender')
    };
}])
