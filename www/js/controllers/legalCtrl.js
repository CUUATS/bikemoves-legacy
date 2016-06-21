angular.module('bikemoves').controller('LegalCtrl', [
  '$scope',
  'mapService',
  function($scope, mapService) {
    analytics.trackView("Legal")
    mapService.getLegalText().then(function(text) {
      $scope.googleText = text;
    });
}]);
