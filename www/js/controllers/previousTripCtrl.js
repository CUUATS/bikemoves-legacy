angular.module('bikemoves').controller('PreviousTripCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  '$ionicPopup',
  'mapService',
  'remoteService',
  'tripService',
  function($scope, $state, $stateParams, $ionicPopup, mapService, remoteService, tripService) {
    var SECOND = 1000,
      MINUTE = SECOND * 60,
      HOUR = MINUTE * 60,
      // Constants for rider of 187 lb on road bike
      K1 = 3.509,
      K2 = .2581,
      zeroPad = function(value, places) {
        var str = value.toString();
        if (str.length >= places) return str;
        return Array(places + 1 - str.length).join('0') + str;
      },
      formatDuration = function(millisec) {
        return zeroPad(Math.floor(millisec / HOUR), 2) + ':' +
          zeroPad(Math.floor((millisec % HOUR) / MINUTE), 2) + ':' +
          zeroPad(Math.round((millisec % MINUTE) / SECOND), 2);
      };

    tripService.getTrip($stateParams.tripID).then(function(trip) {
      var duration = new Date(trip.endTime) - new Date(trip.startTime), // In milliseconds
        distance = trip.getDistance() * 0.000621371, // In miles
        speed = distance / (duration / HOUR); // In MPH

      $scope.locations = trip.locations;
      $scope.origin = remoteService.getLabel(
          'Trip', 'LocationType', trip.origin);
      $scope.destination = remoteService.getLabel(
          'Trip', 'LocationType', trip.destination);
      $scope.date = moment(trip.startTime).format('MMM D, YYYY');
      $scope.time = moment(trip.startTime).format('h:mm A');
      $scope.distance = distance.toFixed(1);
      $scope.duration = formatDuration(duration);
      $scope.avgSpeed = speed.toFixed(1);
      // Total Calories = avgSpeed * (K1 + K2 * avgSpeed ^ 2) * (duration in min)
      $scope.calories = (
        (speed * (K1 + K2 * Math.pow(speed, 2))) / 67.78 * (duration / MINUTE)
      ).toFixed(0);
      $scope.ghg = (distance * .8115).toFixed(1);
    });

    $scope.deleteTrip = function() {
      mapService.setClickable(false);
      $ionicPopup.confirm({
         title: 'Delete Trip',
         template: 'Are you sure you want to delete this trip?',
         okText: 'Delete',
         okType: 'button-assertive'
      }).then(function(res) {
        mapService.setClickable(true);
        if (res) {
          tripService.deleteTrip($stateParams.tripID).then(function() {
            $state.go('app.previous_trips');
          });
        }
      });
    };

    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      mapService.resetMap(mapService.MAP_TYPE_PREVIOUS);
      if ($scope.locations.length > 0) {
        mapService.setTripLocations($scope.locations);
        mapService.zoomToTripPolyline();
      }
    });
}])
