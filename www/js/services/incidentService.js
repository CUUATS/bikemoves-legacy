angular.module('bikemoves')
  .service('incidentService', function($q, $rootScope, $http, remoteService) {
    var service = this,
     incidentlocation;
    service.openModal = function(latLng){
      incidentlocation = latLng
      $rootScope.$broadcast("OpenIncidentReportModal")
      // Apparently only way to open modal from service
    }
    service.getAddress = function(latlng){
      incidentlocation = latlng
      return $q(function(resolve, reject){
        console.log(incidentlocation);
        plugin.google.maps.Geocoder.geocode({'position' : incidentlocation}, function(results, status) {
          console.log("Status:", status, "Results",results)
          if (results.length) {
            service.incidentAddress = results[0].extra.lines[0];
            resolve();
          }
          reject();
        })
      })
    };
    service.saveIncident = function(incident){
      incident.position = incidentlocation;
      remoteService.postIncident(incident)

    }
  });
