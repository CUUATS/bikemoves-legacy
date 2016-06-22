angular.module('bikemoves').controller('LegalCtrl', [
  '$scope',
  'mapService',
  function($scope, mapService) {
    if(typeof analytics !== undefined) analytics.trackView("Legal")
    mapService.getLegalText().then(function(text) {
      $scope.googleText = text;
    });
  }]);
