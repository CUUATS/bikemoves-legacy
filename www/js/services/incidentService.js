angular.module('bikemoves')
  .service('incidentService', function($q, $rootScope, $http, $timeout,remoteService, $cordovaNetwork) {
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
      incidentlocation = latlng
        console.log(incidentlocation);
        // $timeout(function(){console.log("Started"); timeReject},3000)
        if($cordovaNetwork.isOffline()) {
          console.log("WIFI OUT")
          service.incidentAddress = null
          deferred.reject();
        }
        plugin.google.maps.Geocoder.geocode({'position' : incidentlocation}, function(results, status) {
          console.log("Status:", status, "Results",results)
          if (results.length) {
            service.incidentAddress = results[0].extra.lines[0];
            deferred.resolve();
          }
          else {
          console.log("Null Reject")
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
