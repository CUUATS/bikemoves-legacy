angular.module("bikemoves")
  .service("smootherService", function() {
      var service = this;
      service.trackReduce = function(trip, precision) {
        var j = 0,
          locations = [trip.locations[0]];
        for (var i = 1; i < trip.locations.length; i++) {
          while (trip.getDistance(trip.location[j], trip.location[i]) < precision) {
            i++;
            if (i > trip.locations.length)
              break;
          }
          locations.push(trip.location[i]);
          j = i;
        }
        return locations;
    };
    service.kalmanReduce = function(){
      
    }
  });
