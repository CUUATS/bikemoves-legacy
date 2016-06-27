angular.module('bikemoves')
  .service('tripService', ['storageService', 'remoteService', '$q', function(storageService, remoteService, $q) {
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
      return getTripsCollection().then(function(collection) {
        collection.removeDataOnly();
        return storageService.save();
      });
    };
    service.postUnposted = function() {
      promises = [];
      getTripsCollection().then(function(collection) {
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
