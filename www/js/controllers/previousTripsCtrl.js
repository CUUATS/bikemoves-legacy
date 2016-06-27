angular.module('bikemoves').controller('PreviousTripsCtrl', [
  '$scope',
  'tripService',
  'analyticsService',
  function($scope, tripService, analyticsService) {
    analyticsService.trackView("Previous Trips");
    var service = this;
    $scope.formatDate = function(timestamp) {
      return moment(timestamp).calendar(moment(), {
        sameElse: 'dddd, MMMM D, YYYY [at] h:mm A'
      });
    };

    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      tripService.getTrips().then(function(trips) {
        $scope.trips = trips;
      });
    });
  }
]);
