angular.module('bikemoves').controller('LegalCtrl', [
  '$scope',
  'mapService',
  'analyticsService',
  function($scope, mapService, analyticsService) {
    mapService.getLegalText().then(function(text) {
      $scope.googleText = text;
    });

    $scope.$on('$ionicView.enter', function(e) {
      analyticsService.trackView('Legal');
    });
  }
]);
