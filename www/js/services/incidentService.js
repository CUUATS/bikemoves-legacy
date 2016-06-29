angular.module('bikemoves')
  .service('incidentService', ['$q', '$rootScope', 'remoteService', '$cordovaNetwork', 'storageService', function($q, $rootScope, remoteService, $cordovaNetwork, storageService) {
    var service = this,
      incidentlocation,
      getIncidentsCollection = function() {
        return storageService.getCollection("incidents");
      };
    service.getAddress = function(latlng) {
      incidentlocation = latlng;
      return $q(function(resolve, reject) {
        if ($cordovaNetwork.isOffline()) {
          reject();
        } else {
          plugin.google.maps.Geocoder.geocode({
            'position': incidentlocation
          }, function(results, status) {
            if (results.length) {
              resolve(results[0].extra.lines[0]);
            } else {
              reject();
            }
          });
        }
      });
    };
    service.saveIncident = function(incident) {
      incident.setLocation(incidentlocation.lat, incidentlocation.lng);
      remoteService.postIncident(incident).catch(function() {
        getIncidentsCollection().then(function(collection) {
          collection.insert(incident);
          return storageService.save();
        });
      })
    }
    service.postUnposted = function() {
      getIncidentsCollection().then(function(collection) {
        var promises = collection.chain().data().map(function(incident) {
          return remoteService.postIncident(incident);
        });
        $q.all(promises).then(function(data) {
          data.forEach(function(e, index, array) {
            return collection.remove(collection.chain()[index]);
          });
        }).catch(function(error) {
          console.log("Error Incident Post Failed ", error);
        });
      });
    };
  }]);
