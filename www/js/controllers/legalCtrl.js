angular.module('bikemoves').controller('LegalCtrl', [
  '$scope',
  'analyticsService',
  function($scope, analyticsService) {
    $scope.$on('$ionicView.enter', function(e) {
      analyticsService.trackView('Legal');
    });
  }
]);
