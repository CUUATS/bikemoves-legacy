angular.module('bikemoves')
  .service('incidentService', ['$q', '$rootScope', 'remoteService', '$cordovaNetwork', function($q, $rootScope, remoteService, $cordovaNetwork) {
    var service = this,
      incidentlocation;
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
      remoteService.postIncident(incident);
    };
  }]);
