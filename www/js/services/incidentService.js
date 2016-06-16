angular.module('bikemoves')
  .service('incidentService', function($q, $rootScope, $http, $timeout,remoteService) {
    var service = this,
     incidentlocation;
    service.openModal = function(latLng){
      incidentlocation = latLng
      $rootScope.$broadcast("OpenIncidentReportModal")
      // Apparently only way to open modal from service
    }
    service.getAddress = function(latlng){
      var deferred = $q.defer()
      var timeReject = function(){
        console.log("Timeout reject");
        service.incidentAddress = null;
        deferred.reject();
      }
      $timeout(function(){},1000).then(timeReject);
      incidentlocation = latlng
        console.log(incidentlocation);
        plugin.google.maps.Geocoder.geocode({'position' : incidentlocation}, function(results, status) {
          console.log("Status:", status, "Results",results)
          if (results.length) {
            service.incidentAddress = results[0].extra.lines[0];
            deferred.resolve();
          }
          else {
          service.incidentAddress = null
          deferred.reject();
        }
        });

      return deferred.promise;
    };
    service.saveIncident = function(incident){
      incident.position = incidentlocation;
      remoteService.postIncident(incident)

    }
  });
