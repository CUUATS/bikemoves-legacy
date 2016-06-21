angular.module('bikemoves').controller('AppCtrl', [
  '$scope', '$cordovaNetwork', '$rootScope', 'tripService', 'settingsService',
  function($scope, $cordovaNetwork, $rootScope, tripService, settingsService) {
    $scope.isRecording = false;
    document.addEventListener("deviceready", function () {
      $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
        settingsService.getSettings().then(function(res){
          if(res.autoSubmit)
            tripService.postUnposted();
        })
      });
    });
}]);
