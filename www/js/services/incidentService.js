angular.module('bikemoves')
  .service('incidentService', ['$q', '$rootScope', 'remoteService', '$cordovaNetwork', 'storageService', function($q, $rootScope, remoteService, $cordovaNetwork, storageService) {
    var service = this,
      incidentlocation;
    service.getIncidentsCollection = function() {
      return storageService.getCollection("incidents");
    };
    service.geocode = function(location) {
      return $q(function(resolve, reject) {
        window.plugin.google.maps.Geocoder.geocode({
          'position': location
        }, function(results, status) {
          if (results.length) {
            resolve(results[0].extra.lines[0]);
          } else {
            reject("No address");
          }
        });
      });
    };
    service.setIncidentLocation = function(position) {
      incidentlocation = position;
    }
    service.getAddress = function(latlng) {
      incidentlocation = latlng;
      if ($cordovaNetwork.isOffline()) {
        return $q.reject("online");
      };
      return service.geocode(incidentlocation);
    };
    service.saveIncident = function(incident) {
      incident.setLocation(incidentlocation.lat, incidentlocation.lng);
      remoteService.postIncident(incident).catch(function() {
        service.getIncidentsCollection().then(function(collection) {
          collection.insert(incident);
          return storageService.save();
        })
      })
    }
    service.postUnposted = function() {
      return service.getIncidentsCollection().then(function(collection) {
        var promises = collection.chain().data().map(function(incident) {
          return remoteService.postIncident(incident);
        });
        $q.all(promises).then(function(data) {
          data.forEach(function(e, index, array) {
            return collection.remove(collection.chain()[index]);
          });
        }).catch(function(error) {
          console.log("Error Incident Post Failed ", error);
          return error;
        });
      });
    };
  }]);
// TODO: Refactor for testability
