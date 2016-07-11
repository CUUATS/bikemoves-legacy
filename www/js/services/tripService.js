angular.module('bikemoves')
  .service('tripService', ['storageService', 'remoteService', '$q', function(storageService, remoteService, $q) {
    var service = this;
    service.getTripsCollection = function() {
      return storageService.getCollection('trips');
    };

    service.saveTrip = function(trip) {
      return service.getTripsCollection().then(function(collection) {
        collection.insert(trip);
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
          return trip.getDistance();
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
    service.postUnposted = function() {
      promises = [];
      service.getTripsCollection().then(function(collection) {
        var unsubmitted = collection.where(function(obj) {
          return obj.submitted === false;
        });
        for (var i = 0; i < unsubmitted.length; i++) {
          promises.push(remoteService.postTrip(unsubmitted[i]));
        }
        $q.all(promises).then(function(data) {
          for (var i = 0; i < data.length; i++) {
            unsubmitted[i].submitted = true;
            collection.update(unsubmitted[i]);
          }
        }, function(reason) {
          console.log("Post Failed:", reason);
        });
      });
    };
  }]);
