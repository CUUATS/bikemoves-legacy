angular.module('bikemoves').controller('PreviousTripsCtrl', [
  '$scope',
  'tripService',
  function($scope, tripService) {
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
}])
