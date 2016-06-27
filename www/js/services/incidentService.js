angular.module('bikemoves')
  .service('incidentService', ['$q', '$rootScope', 'remoteService', '$cordovaNetwork', function($q, $rootScope, remoteService, $cordovaNetwork) {
    var service = this,
      incidentlocation;
    service.openModal = function(latLng) {
      incidentlocation = latLng;
      $rootScope.$broadcast("OpenIncidentReportModal");
      // Apparently only way to open modal from service
    };
    service.getAddress = function(latlng) {
      var connection = $q.defer();
      var address = $q.defer();
      incidentlocation = latlng;
      console.log(incidentlocation);
      if ($cordovaNetwork.isOffline()) {
        console.log("WIFI OUT");
        service.incidentAddress = null;
        connection.reject();
        return connection.promise;
      }
      plugin.google.maps.Geocoder.geocode({
        'position': incidentlocation
      }, function(results, status) {
        console.log("Status:", status, "Results", results);
        if (results.length) {
          service.incidentAddress = results[0].extra.lines[0];
          address.resolve();
        } else {
          console.log("Null Reject");
          service.incidentAddress = null;
          address.reject();
        }
      });
      return address.promise;
    };
    service.saveIncident = function(incident) {
      incident.setLocation(incidentlocation.lat, incidentlocation.lng);
      remoteService.postIncident(incident);
    };
  }]);
