angular.module('bikemoves').controller('AppCtrl', [
  '$scope', '$cordovaNetwork', '$rootScope', 'tripService',
  function($scope, $cordovaNetwork, $rootScope, tripService) {
    $scope.isRecording = false;
    document.addEventListener("deviceready", function () {

      $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
        tripService.postUnposted();
      });
    });
}]);
