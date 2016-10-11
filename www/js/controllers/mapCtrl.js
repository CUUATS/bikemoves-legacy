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
  'analyticsService',
  'config',
  '$cordovaNetwork',
  '$rootScope',
  function($scope, $ionicPlatform, $ionicModal, $ionicPopup, locationService, mapService, remoteService, tripService, settingsService, incidentService, analyticsService, config, $cordovaNetwork, $rootScope) {
    var controller = this,
      STATUS_STOPPED = 'stopped',
      STATUS_RECORDING = 'recording',
      STATUS_PAUSED = 'paused',
      isWarned = false,
      updateOdometer = function() {
        // Convert meters to miles.
        $scope.odometer = ($scope.trip.getDistance(true) * 0.000621371)
          .toFixed(1);
      },
      onLocation = function(location, force) {
        controller.currentLocation = ($scope.status.isRecording) ?
          $scope.trip.addLocation(location, force) : location;
        updateOdometer();
        controller.updateMap();
      },
      onLocationError = function(errorCode) {
        console.log('Location error: ' + errorCode);
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
        analyticsService.trackEvent('Error', 'Failed to Submit Trip');
      },
      initTrip = function() {
        $scope.trip.startTime = now();
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
      initView = function() {
        mapService.resetMap(mapService.MAP_TYPE_CURRENT);
        if (!angular.isDefined(this.currentLocation)) $scope.getCurrentPosition();
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
      },
      displayCrashWarning = function() {
        var crashPopup = $ionicPopup.alert({
          title: 'If this is an emergency, close this app and dial 911',
          template: 'Submitting an incident report does <b> not </b>  notify police or emergency responders'
        });
        crashPopup.then(function(res) {
          isWarned = true;
        });
      },
      initModals = function() {
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

        // Create the modal window for incident reporting.
        $ionicModal.fromTemplateUrl("templates/incident_form.html", {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          incidentReportModal = modal;
        });
      },
      initNetworkEvents = function() {
        document.addEventListener('deviceready', function() {
          $scope.online = $cordovaNetwork.isOnline();
        });
        $scope.$on('$cordovaNetwork:online', function(event, networkState) {
          incidentService.postUnposted();
          $scope.online = true;
        });
        $scope.$on('$cordovaNetwork:offline', function(event, networkState) {
          $scope.online = false;
        });
      },
      initIncidentReportEvent = function() {
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
          analyticsService.trackEvent('Incident', 'Tapped Incident Location');
        });
        $scope.$watch('incident.Ui', function(oldVal, newVal) {
          if (oldVal == 'crash' && !isWarned) displayCrashWarning();
        });
      },
      setScopeStatus = function(status) {
        $scope.status = {
          isStopped: status == STATUS_STOPPED,
          isPaused: status == STATUS_PAUSED,
          isRecording: status == STATUS_RECORDING
        };

        // Disable other tabs while recording.
        $rootScope.isRecording = (status == STATUS_RECORDING);
      };

    controller.setStatus = function(status) {
      if (!$scope.status.isRecording && status == STATUS_RECORDING) {
        locationService.watchPosition(onLocation, onLocationError);
      } else if ($scope.status.isRecording && status != STATUS_RECORDING) {
        locationService.clearWatch();
      }
      setScopeStatus(status);
    };

    controller.updateMap = function() {
      if (controller.currentLocation) {
        mapService.setCurrentLocation(controller.currentLocation);
        mapService.setCenter(controller.currentLocation);
      }
      mapService.setTripLineString($scope.trip.toLineString(true));
    };

    controller.resetTrip = function() {
      $scope.trip = new Trip();
      $scope.trip.appVersion = config.appVersion;
      controller.updateMap();
      updateOdometer();
    };

    $scope.options = {
      locationType: remoteService.getOptions('Trip', 'LocationType')
    };

    $scope.startRecording = function() {
      if ($scope.status.isStopped) initTrip();
      controller.setStatus(STATUS_RECORDING);
      analyticsService.trackEvent('Trip', 'Started Recording');
    };

    $scope.pauseRecording = function() {
      $scope.getCurrentPosition(Trip.PAUSE_POINT).then(function() {
        controller.setStatus(STATUS_PAUSED);
        analyticsService.trackEvent('Trip', 'Paused Recording');
      });
    }

    $scope.stopRecording = function() {
      controller.setStatus(STATUS_PAUSED);
      $scope.trip.endTime = now();
      tripService.getTrips().then(function(trips) {
        $scope.trip.guessODTypes(trips);
        mapService.setClickable(false);
        tripSubmitModal.show();
      });
      analyticsService.trackEvent('Trip', 'Stopped Recording');
    };

    $scope.submitTrip = function() {
      controller.setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();

      // Don't submit trips controller have no locations.
      if ($scope.trip.locations.length > 0) {
        submitTrip().finally(function() {
          controller.resetTrip();
        });
      } else {
        tripService.saveTrip().finally(function() {
          controller.resetTrip();
        });
      }
      analyticsService.trackEvent('Trip', 'Submitted Trip');
    };

    $scope.saveTrip = function() {
      tripService.saveTrip($scope.trip).finally(function() {
        controller.resetTrip();
      });
      controller.setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();
      analyticsService.trackEvent('Trip', 'Saved Trip');
    };

    $scope.resumeTrip = function() {
      controller.setStatus(STATUS_RECORDING);
      tripSubmitModal.hide();
      analyticsService.trackEvent('Trip', 'Resumed Trip');
    };

    $scope.discardTrip = function() {
      controller.resetTrip();
      controller.setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();
      analyticsService.trackEvent('Trip', 'Discarded Trip');
    };

    $scope.getCurrentPosition = function(pointType) {
      return locationService.getCurrentPosition().then(function(location) {
        if (pointType) location.pointType = pointType;
        onLocation(location);
      }).catch(onLocationError);
    };

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

    $scope.reportIncident = function($event) {
      if ($scope.isReport) {
        $scope.isReport = false;
        mapService.setMapState('normal');
      } else {
        $scope.isReport = true;
        mapService.setMapState('report');
        analyticsService.trackEvent('Incident', 'Entered Reporting State');
      }
    };

    // Create a new trip, and set the initial status.
    controller.resetTrip();
    setScopeStatus(STATUS_STOPPED);
    initModals();
    initIncidentReportEvent();
    initIncidentForm();
    initNetworkEvents();

    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      initView();
      analyticsService.trackView('Map');
    });
  }
]);
