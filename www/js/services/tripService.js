angular.module('bikemoves')
.service('tripService', ['storageService', function(storageService) {
  var service = this,
    getTripsCollection = function() {
      return storageService.getCollection('trips');
    };

  service.saveTrip = function(trip) {
    return getTripsCollection().then(function(collection) {
      collection.insert(trip);
      return storageService.save();
    });
  };
  service.getTrips = function() {
    return getTripsCollection().then(function(collection) {
      return collection.chain().simplesort('startTime', true).data();
    });
  };
  service.getTrip = function(tripID) {
    return getTripsCollection().then(function(collection) {
      return collection.get(tripID);
    });
  };
  service.deleteTrip = function(tripID) {
    return getTripsCollection().then(function(collection) {
      collection.remove(collection.data[tripID]);
      return storageService.save();
    });
  };
  service.getTotalDistance = function() {
    return getTripsCollection().then(function(collection) {
      if (collection.data.length == 0) return 0;
      return collection.mapReduce(function(trip) {
        return trip.getDistance();
      }, function(distances) {
        return distances.reduce(function(a, b) {
          return a + b;
        });
      });
    });
  };
  service.clearAll = function() {
    return getTripsCollection().then(function(collection) {
      collection.removeDataOnly();
      return storageService.save();
    });
  };
}])
