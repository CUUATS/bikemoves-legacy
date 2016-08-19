angular.module('bikemoves')
  .service('tripService', ['storageService', 'remoteService', '$q', function(storageService, remoteService, $q) {
    var service = this;
    service.getTripsCollection = function() {
      return storageService.getCollection('trips');
    };

    service.saveTrip = function(trip) {
      return service.getTripsCollection().then(function(collection) {
        collection.insertOne(trip);
        return storageService.save();
      });
    };
    service.updateTrip = function(trip) {
      return service.getTripsCollection().then(function(collection) {
        return collection.update(trip);
      });
    };
    service.getTrips = function() {
      return service.getTripsCollection().then(function(collection) {
        return collection.chain().simplesort('startTime', true).data();
      });
    };
    service.getTrip = function(tripID) {
      return service.getTripsCollection().then(function(collection) {
        return collection.get(tripID);
      });
    };
    service.deleteTrip = function(tripID) {
      return service.getTripsCollection().then(function(collection) {
        collection.remove(collection.data[Number(tripID) - 1]);
        return storageService.save();
      });
    };
    service.getTotalDistance = function() {
      return service.getTripsCollection().then(function(collection) {
        if (collection.data.length === 0) return 0;
        return collection.mapReduce(function(trip) {
          return trip.getDistance(true);
        }, function(distances) {
          return distances.reduce(function(a, b) {
            return a + b;
          });
        });
      });
    };
    service.clearAll = function() {
      return service.getTripsCollection().then(function(collection) {
        collection.removeDataOnly();
        return storageService.save();
      });
    };
  }]);
