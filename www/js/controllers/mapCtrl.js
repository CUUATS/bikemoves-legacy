angular.module('bikemoves').controller('MapCtrl', [
  '$scope',
  '$ionicPlatform',
  '$ionicModal',
  '$ionicPopup',
  'locationService',
  'mapService',
  'remoteService',
  'tripService',
  'settingsService',
  'incidentService',
  '$cordovaNetwork',
  '$rootScope',
  'analyticsService',
  function($scope, $ionicPlatform, $ionicModal, $ionicPopup, locationService, mapService, remoteService, tripService, settingsService, incidentService, $cordovaNetwork, $rootScope, analyticsService) {
    analyticsService.trackView("Map");
    var START_TIME_KEY = 'bikemoves:starttime',
      currentLocation,
      tripSubmitModal,
      comfirmPopup;

    var setStatus = function(status, initial) {
        console.log('Setting status: ' + status);
        $scope.status = {
          isStopped: status == locationService.STATUS_STOPPED,
          isPaused: status == locationService.STATUS_PAUSED,
          isRecording: status == locationService.STATUS_RECORDING
        };
        // Disable other tabs while recording.
        // TODO: Find a way around this $parent nonsense.
        $scope.$parent.$parent.$parent.isRecording = $scope.status.isRecording;

        if (initial) return;
        return locationService.setStatus(status);
      },
      updateMap = function() {
        if (currentLocation) {
          mapService.setCurrentLocation(currentLocation);
          mapService.setCenter(currentLocation);
        }
        mapService.setTripLocations($scope.trip.locations);
      },
      updateOdometer = function() {
        // Convert meters to miles.
        $scope.odometer = ($scope.trip.getDistance() * 0.000621371).toFixed(1);
      },
      onLocation = function(location, skipUpdate) {
        currentLocation = ($scope.status.isRecording) ?
          $scope.trip.addLocation(location, false) : location;
        if (!skipUpdate) {
          updateOdometer();
          updateMap();
        }
      },
      onSubmitError = function() {
        mapService.setClickable(false);
        $ionicPopup.alert({
          title: 'Trip Submission Failed',
          template: 'Sorry, an error occurred while submitting your trip. ' +
            'Please try again later.'
        }).then(function() {
          mapService.setClickable(true);
        });
      },
      initTrip = function() {
        $scope.trip.startTime = now();
        window.localStorage.setItem(
          START_TIME_KEY, String.valueOf($scope.trip.startTime));
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
      },

      resetTrip = function(skipUpdate) {
        $scope.trip = new Trip();
        if (!skipUpdate) {
          updateMap();
          updateOdometer();
        }
      },

      initView = function() {
        mapService.resetMap(mapService.MAP_TYPE_CURRENT);
        if (!angular.isDefined(currentLocation)) $scope.getCurrentPosition();
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
          setStatus(locationService.STATUS_RECORDING);
        });
      } else {
        setStatus(locationService.STATUS_RECORDING);
      }
    };

    $scope.pauseRecording = function() {
      setStatus(locationService.STATUS_PAUSED);
    };

    $scope.stopRecording = function() {
      analyticsService.trackEvent("Trip", "Finished");
      setStatus(locationService.STATUS_PAUSED);
      $scope.trip.endTime = now();
      tripService.getTrips().then(function(trips) {
        $scope.trip.guessODTypes(trips);
        mapService.setClickable(false);
        tripSubmitModal.show();
      });
    };

    $scope.submitTrip = function() {
      analyticsService.trackEvent("Trip", "Submitted");

      setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();

      // Don't submit trips that have no locations.
      if ($scope.trip.locations.length > 0) {
        submitTrip().finally(function() {
          resetTrip(false);
        });
      } else {
        console.log("Submitted trip with no data points");
        tripService.saveTrip().finally(function() {
          resetTrip(false);
        });
      }
    };

    $scope.saveTrip = function() {
      tripService.saveTrip().finally(function() {
        resetTrip(false);
      });
      setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();
    };

    $scope.resumeTrip = function() {
      setStatus(locationService.STATUS_RECORDING);
      tripSubmitModal.hide();
    };

    $scope.discardTrip = function() {
      resetTrip();
      setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();
    };

    $scope.getCurrentPosition = function() {
      locationService.getCurrentPosition({
        maximumAge: 0
      });
    };

    // Create a new trip, and set the initial status.
    resetTrip(true);
    setStatus(locationService.STATUS_STOPPED, true);

    // Create the modal window for trip submission.
    $ionicModal.fromTemplateUrl('templates/trip_form.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      tripSubmitModal = modal;
    });
    $scope.$on('modal.hidden', function(e) {
      cordova.plugins.Keyboard.close();
      mapService.setClickable(true);
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
      mapService.setClickable(false);
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
          mapService.setMapState('normal');
        } else {
          mapService.setClickable(true);
        }
        mapService.removeIncident();
      });
    });

    initIncidentForm();
    $scope.submitIncident = function() {
      analyticsService.trackEvent("Incident", "Submitted");
      var incident = new Incident();
      incident.time = (new Date()).getTime();
      incident.category = $scope.incident.Ui != "other" ? $scope.incident.specific : "other";
      incident.comment = $scope.incident.comment;
      incidentService.saveIncident(incident);
      incidentReportModal.hide();
      console.log("Submit");
      initIncidentForm();
    };
    $scope.discardIncident = function() {
      initIncidentForm();
      incidentReportModal.hide();
      console.log("discard");
    };
    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      initView();
    });
    locationService.getStatus().then(function(status) {
      if (status != locationService.STATUS_STOPPED) {
        // A trip is in progress.
        // Restore start time if the trip was recreated.
        $scope.trip.startTime = parseInt(window.localStorage.getItem(START_TIME_KEY));
        // Load locations from the cache.
        return locationService.getLocations().then(function(locations) {
          angular.forEach(locations, function(location, key) {
            onLocation(location, true);
          });
          updateMap();
          return status;
        });
      }
      return status;
    }).then(function(status) {
      updateOdometer();
      setStatus(status, true);
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
      if ($scope.status.isRecording) {
        mapService.setClickable(false);
        var noReportPopup = $ionicPopup.alert({
          title: 'Unable to Report Incident While Recording'
        });
        noReportPopup.then(function(res) {
          mapService.setClickable(true);
        });
      } else {
        if ($scope.isReport) {
          $scope.isReport = false;
          mapService.setMapState('normal');
        } else {
          analyticsService.trackEvent("Incident", "Entered Report State");
          $scope.isReport = true;
          mapService.setMapState('report');
        }
      }
    };
    document.addEventListener("deviceready", function() {
      $scope.online = $cordovaNetwork.isOnline();
    });
    $rootScope.$on('$cordovaNetwork:online', function(event, networkState) {
      $scope.online = true;
    });
    $rootScope.$on('$cordovaNetwork:offline', function(event, networkState) {
      $scope.online = false;
    });

  }
]);
