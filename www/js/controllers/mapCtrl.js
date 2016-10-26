angular.module('bikemoves').controller('MapCtrl', [
  '$scope',
  '$ionicPlatform',
  '$ionicModal',
  '$ionicPopup',
  'locationService',
  'remoteService',
  'tripService',
  'settingsService',
  'incidentService',
  'analyticsService',
  'config',
  '$cordovaNetwork',
  '$rootScope',
  function($scope, $ionicPlatform, $ionicModal, $ionicPopup, locationService, remoteService, tripService, settingsService, incidentService, analyticsService, config, $cordovaNetwork, $rootScope) {
    var that = this,
      map = new Map('current-map', {
        interactive: true,
        onLoad: function() {
          if (that.currentLocation) that.updateMap();
        }
      });
    that.START_TIME_KEY = 'bikemoves:starttime';
    that.setStatus = function(status, initial) {
      $scope.status = {
        isStopped: status == locationService.STATUS_STOPPED,
        isPaused: status == locationService.STATUS_PAUSED,
        isRecording: status == locationService.STATUS_RECORDING
      };

      // Disable other tabs while recording.
      $rootScope.isRecording = (status == locationService.STATUS_RECORDING);

      if (initial) return;
      return locationService.setStatus(status);
    };
    that.updateMap = function() {
      if (that.currentLocation) {
        map.setCurrentLocation(that.currentLocation);
        map.setCenter(that.currentLocation);
      }
      var linestring = $scope.trip.toLineString(true);
      if (linestring) map.setTrip(linestring);
    };
    var updateOdometer = function() {
        // Convert meters to miles.
        $scope.odometer = ($scope.trip.getDistance(true) * 0.000621371)
          .toFixed(1);
      },
      onLocation = function(location, skipUpdate) {
        that.currentLocation = ($scope.status.isRecording) ?
          $scope.trip.addLocation(location, false) : location;
        if (!skipUpdate) {
          updateOdometer();
          that.updateMap();
        }
      },
      onSubmitError = function() {
        $ionicPopup.alert({
          title: 'Trip Submission Failed',
          template: 'Sorry, an error occurred while submitting your trip. ' +
            'Please try again later.'
        });
        analyticsService.trackEvent('Error', 'Failed to Submit Trip');
      },
      initTrip = function() {
        $scope.trip.startTime = now();
        window.localStorage.setItem(
          that.START_TIME_KEY, String.valueOf($scope.trip.startTime));
        settingsService.getDesiredAccuracy().then(function(accuracy) {
          $scope.trip.desiredAccuracy = accuracy;
        });
      },
      submitTrip = function() {
        var submitted = false;
        return remoteService.postTrip($scope.trip).then(function(res) {
          submitted = (res.status == 200);
          if (res.status != 200) onSubmitError();
        }).catch(onSubmitError).finally(function() {
          $scope.trip.submitted = submitted;
          return tripService.saveTrip($scope.trip);
        });
      };

      that.resetTrip = function(skipUpdate) {
        $scope.trip = new Trip();
        $scope.trip.appVersion = config.appVersion;
        if (!skipUpdate) {
          that.updateMap();
          updateOdometer();
        }
      };

      var initView = function() {
        // Update the map size once the view has fully loaded.
        map.resize();
        
        if (!that.currentLocation) $scope.getCurrentPosition();

        settingsService.getSettings().then(function(settings) {
          $scope.autoSubmit = settings.autoSubmit;
        });
      },
      now = function() {
        return (new Date()).getTime();
      },
      initIncidentForm = function() {
        isWarned = false;
        $scope.isReport = false;
        $scope.incident = {
          category: "None",
          comment: '',
          Ui: "None"
        };
      };
    $scope.startRecording = function() {
      if ($scope.status.isStopped) {
        // This is a new trip.
        initTrip();
        locationService.clearDatabase().then(function() {
          that.setStatus(locationService.STATUS_RECORDING);
        });
      } else if ($scope.status.isPaused) {
        addPausePoint();
        that.setStatus(locationService.STATUS_RECORDING);
      }
        else {
        that.setStatus(locationService.STATUS_RECORDING);
      }
      analyticsService.trackEvent('Trip', 'Started Recording');
    };
    var addPausePoint = function(){
      locationService.getCurrentPosition({
        maximumAge: 0
      }).then(function(location){
        location.isPausePoint = true;
        $scope.trip.addLocation(location, false);
      })
    }
    $scope.pauseRecording = function() {
      that.setStatus(locationService.STATUS_PAUSED);
      addPausePoint();
      analyticsService.trackEvent('Trip', 'Paused Recording');
    }

    $scope.stopRecording = function() {
      that.setStatus(locationService.STATUS_PAUSED);
      $scope.trip.endTime = now();
      tripService.getTrips().then(function(trips) {
        $scope.trip.guessODTypes(trips);
        tripSubmitModal.show();
      });
      analyticsService.trackEvent('Trip', 'Stopped Recording');
    };

    $scope.submitTrip = function() {
      that.setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();

      // Don't submit trips that have no locations.
      if ($scope.trip.locations.length > 0) {
        submitTrip().finally(function() {
          that.resetTrip(false);
        });
      } else {
        tripService.saveTrip().finally(function() {
          that.resetTrip(false);
        });
      }
      analyticsService.trackEvent('Trip', 'Submitted Trip');
    };

    $scope.saveTrip = function() {
      tripService.saveTrip($scope.trip).finally(function() {
        that.resetTrip(false);
      });
      that.setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();
      analyticsService.trackEvent('Trip', 'Saved Trip');
    };

    $scope.resumeTrip = function() {
      that.setStatus(locationService.STATUS_RECORDING);
      tripSubmitModal.hide();
      analyticsService.trackEvent('Trip', 'Resumed Trip');
    };

    $scope.discardTrip = function() {
      that.resetTrip();
      that.setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();
      analyticsService.trackEvent('Trip', 'Discarded Trip');
    };

    $scope.getCurrentPosition = function() {
      locationService.getCurrentPosition({
        maximumAge: 0
      });
    };

    // Create a new trip, and set the initial status.
    that.resetTrip(true);
    that.setStatus(locationService.STATUS_STOPPED, true);

    // Create the modal window for trip submission.
    $ionicModal.fromTemplateUrl('templates/trip_form.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      tripSubmitModal = modal;
    });
    $scope.$on('modal.hidden', function(e) {
      cordova.plugins.Keyboard.close();
    });
    $scope.$on('$destroy', function() {
      tripSubmitModal.remove();
      incidentReportModal.remove();
    });

    //Create the modal window for incident reporting
    $ionicModal.fromTemplateUrl("templates/incident_form.html", {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      incidentReportModal = modal;
    });

    $scope.$on('IncidentReport', function(e, latLng) {
      $scope.incidentAddress = undefined;
      incidentService.getAddress(latLng).then(function(address) {
        $scope.incidentAddress = address;
        return $ionicPopup.confirm({
          title: 'Report Incident Near:',
          template: $scope.incidentAddress
        });
      }).catch(function() {
        return $ionicPopup.confirm({
          title: 'Report Incident Here',
        });
      }).then(function(res) {
        if (res) {
          incidentReportModal.show();
          // mapService.setMapState('normal');
        }
        // mapService.removeIncident();
      });
      analyticsService.trackEvent('Incident', 'Tapped Incident Location');
    });

    initIncidentForm();
    $scope.submitIncident = function() {
      var incident = new Incident();
      incident.time = (new Date()).getTime();
      incident.category = $scope.incident.Ui != "other" ? $scope.incident.specific : "other";
      incident.comment = $scope.incident.comment;
      incidentService.saveIncident(incident);
      incidentReportModal.hide();
      initIncidentForm();
      analyticsService.trackEvent('Incident', 'Submitted Incident');
    };
    $scope.discardIncident = function() {
      initIncidentForm();
      incidentReportModal.hide();
      analyticsService.trackEvent('Incident', 'Discarded Incident');
    };
    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      initView();
      analyticsService.trackView('Map');
    });
    locationService.getStatus().then(function(status) {
      if (status != locationService.STATUS_STOPPED) {
        // A trip is in progress.
        // Restore start time if the trip was recreated.
        $scope.trip.startTime = parseInt(window.localStorage.getItem(that.START_TIME_KEY));
        // Load locations from the cache.
        return locationService.getLocations().then(function(locations) {
          angular.forEach(locations, function(location, key) {
            onLocation(location, true);
          });
          that.updateMap();
          return status;
        });
      }
      return status;
    }).then(function(status) {
      updateOdometer();
      that.setStatus(status, true);
    });
    isWarned = false;
    var crashWarning = function() {
      var crashPopup = $ionicPopup.alert({
        title: 'If this is an emergency, close this app and dial 911',
        template: 'Submitting an incident report does <b> not </b>  notify police or emergency responders'
      });
      crashPopup.then(function(res) {
        isWarned = true;
      });
    };
    $scope.$watch('incident.Ui', function(oldVal, newVal) {
      if (oldVal == 'crash' && !(isWarned))
        crashWarning();
    });
    locationService.onLocation(onLocation);

    $scope.options = {
      locationType: remoteService.getOptions('Trip', 'LocationType')
    };

    $scope.reportIncident = function($event) {
      if ($scope.isReport) {
        $scope.isReport = false;
        // mapService.setMapState('normal');
      } else {
        $scope.isReport = true;
        // mapService.setMapState('report');
        analyticsService.trackEvent('Incident', 'Entered Reporting State');
      }
    };
    document.addEventListener("deviceready", function() {
      $scope.online = $cordovaNetwork.isOnline();
    });
    $scope.$on('$cordovaNetwork:online', function(event, networkState) {
      incidentService.postUnposted();
      $scope.online = true;
    });
    $scope.$on('$cordovaNetwork:offline', function(event, networkState) {
      $scope.online = false;
    });

  }
]);
