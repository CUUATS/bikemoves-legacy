angular.module('bikemoves').controller('LegalCtrl', [
  '$scope',
  'mapService',
  'analyticsService',
  function($scope, mapService, analyticsService) {
    analyticsService.trackView("Legal");
    mapService.getLegalText().then(function(text) {
      $scope.googleText = text;
    });
  }
]);
