angular.module('bikemoves').controller('LegalCtrl', [
  '$scope',
  'mapService',
  function($scope, mapService) {
    mapService.getLegalText().then(function(text) {
      $scope.googleText = text;
    });
}]);
