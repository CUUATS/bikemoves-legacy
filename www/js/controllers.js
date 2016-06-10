angular.module('bikemoves.controllers', [])

.controller('AppCtrl', [
  '$scope',
  function($scope) {
    $scope.isRecording = false;
}])

.controller('MapCtrl', [
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
  function($scope, $ionicPlatform, $ionicModal, $ionicPopup, locationService, mapService, remoteService, tripService, settingsService, incidentService) {
    var TRIPS_ENDPOINT = 'http://api.bikemoves.me/v0.1/trip',
      START_TIME_KEY = 'bikemoves:starttime',
      currentLocation,
      tripSubmitModal;

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
        $scope.trip.addLocation(location) : location;
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
      setStatus(locationService.STATUS_PAUSED);
      $scope.trip.endTime = now();
      tripService.getTrips().then(function(trips) {
        $scope.trip.guessODTypes(trips);
        mapService.setClickable(false);
        tripSubmitModal.show();
      });
    };

    $scope.submitTrip = function() {
      setStatus(locationService.STATUS_STOPPED);
      tripSubmitModal.hide();

      // Don't submit trips that have no locations.
      if ($scope.trip.locations.length > 0) {
        submitTrip().finally(resetTrip);
      } else {
        console.log("Submitted trip with no data points")
        tripService.saveTrip().finally(resetTrip);
      }
    };

    $scope.saveTrip = function() {
      tripService.saveTrip().finally(resetTrip);
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

    $scope.$on("OpenIncidentReportModal", function(){
      mapService.setClickable("false")
<<<<<<< HEAD
      $scope.incidentAddress = 'test';
      incidentService.getAddress().then(function(resolve,reject){
        if(reject){
          $scope.incidentAddress = ""
        }
        else {
          $scope.incidentAddress = resolve;
        }
      });
      incidentReportModal.show();
    });
    $scope.incident = {
      category: "None",
      comment: "None",
      Ui: "None"
    };

    $scope.submitIncident = function(){
      var incident = {
        time: (new Date()).getTime(),
        category: $scope.incident.Ui != "other" ? $scope.incident.specific : "other",
        comment: $scope.incident.comment
      }
      incidentService.saveIncident(incident);
      incidentReportModal.hide();
      console.log("Submit")
    };
    $scope.discardIncident = function(){
      incidentReportModal.hide();
      console.log("discard")
    };


    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      initView();
    });

    locationService.getStatus().then(function(status) {
      if (status != locationService.STATUS_STOPPED) {
        // A trip is in progress.
        // Restore start time if the trip was recreated.
        $scope.trip.startTime =
          parseInt(window.localStorage.getItem(START_TIME_KEY));
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

    locationService.onLocation(onLocation);

    $scope.options = {
      locationType: remoteService.getOptions('Trip', 'LocationType')
    };
}])

.controller('PreviousTripsCtrl', [
  '$scope',
  'tripService',
  function($scope, tripService) {
    var service = this;
    $scope.formatDate = function(timestamp) {
      return moment(timestamp).calendar(moment(), {
        sameElse: 'dddd, MMMM D, YYYY [at] h:mm A'
      });
    };

    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      tripService.getTrips().then(function(trips) {
        $scope.trips = trips;
      });
    });
}])

.controller('PreviousTripCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  '$ionicPopup',
  'mapService',
  'remoteService',
  'tripService',
  function($scope, $state, $stateParams, $ionicPopup, mapService, remoteService, tripService) {
    var SECOND = 1000,
      MINUTE = SECOND * 60,
      HOUR = MINUTE * 60,
      // Constants for rider of 187 lb on road bike
      K1 = 3.509,
      K2 = .2581,
      zeroPad = function(value, places) {
        var str = value.toString();
        if (str.length >= places) return str;
        return Array(places + 1 - str.length).join('0') + str;
      },
      formatDuration = function(millisec) {
        return zeroPad(Math.floor(millisec / HOUR), 2) + ':' +
          zeroPad(Math.floor((millisec % HOUR) / MINUTE), 2) + ':' +
          zeroPad(Math.round((millisec % MINUTE) / SECOND), 2);
      };

    tripService.getTrip($stateParams.tripID).then(function(trip) {
      var duration = new Date(trip.endTime) - new Date(trip.startTime), // In milliseconds
        distance = trip.getDistance() * 0.000621371, // In miles
        speed = distance / (duration / HOUR); // In MPH

      $scope.locations = trip.locations;
      $scope.origin = remoteService.getLabel(
          'Trip', 'LocationType', trip.origin);
      $scope.destination = remoteService.getLabel(
          'Trip', 'LocationType', trip.destination);
      $scope.date = moment(trip.startTime).format('MMM D, YYYY');
      $scope.time = moment(trip.startTime).format('h:mm A');
      $scope.distance = distance.toFixed(1);
      $scope.duration = formatDuration(duration);
      $scope.avgSpeed = speed.toFixed(1);
      // Total Calories = avgSpeed * (K1 + K2 * avgSpeed ^ 2) * (duration in min)
      $scope.calories = (
        (speed * (K1 + K2 * Math.pow(speed, 2))) / 67.78 * (duration / MINUTE)
      ).toFixed(0);
      $scope.ghg = (distance * .8115).toFixed(1);
    });

    $scope.deleteTrip = function() {
      mapService.setClickable(false);
      $ionicPopup.confirm({
         title: 'Delete Trip',
         template: 'Are you sure you want to delete this trip?',
         okText: 'Delete',
         okType: 'button-assertive'
      }).then(function(res) {
        mapService.setClickable(true);
        if (res) {
          tripService.deleteTrip($stateParams.tripID).then(function() {
            $state.go('app.previous_trips');
          });
        }
      });
    };

    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      mapService.resetMap(mapService.MAP_TYPE_PREVIOUS);
      if ($scope.locations.length > 0) {
        mapService.setTripLocations($scope.locations);
        mapService.zoomToTripPolyline();
      }
    });
}])

.controller('SettingsCtrl', [
  '$scope',
  '$q',
  '$ionicPopup',
  'profileService',
  'settingsService',
  'tripService',
  function($scope, $q, $ionicPopup, profileService, settingsService, tripService) {

    var reloadSettings = function() {
      return settingsService.getSettings().then(function(settings) {
        $scope.settings = settings;
      });
    };

    $scope.updateSettings = function() {
      return settingsService.updateSettings($scope.settings);
    };

    $scope.reset = function() {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Reset Saved Data',
        template: 'Are you sure you want to delete all saved data, including settings and saved trips?'
      });

      confirmPopup.then(function(res) {
        if (res) {
          var settingsReset = settingsService.clearAll().then(reloadSettings),
            profileReset = profileService.clearAll(),
            tripsReset = tripService.clearAll();
          $q.all([settingsReset, profileReset, tripsReset]).then(function() {
            $ionicPopup.alert({
              title: 'Data Reset',
              content: 'All data have been reset.'
            });
          });
        }
      });
    };

    reloadSettings();
}])

.controller('profileCtrl', [
  '$scope',
  '$ionicPopup',
  'profileService',
  'remoteService',
  'tripService',
  function($scope, $ionicPopup, profileService, remoteService, tripService) {
    var saveProfile = function(profile) {
        return profileService.updateProfile(profile);
      },
      submitProfile = function() {
        profileService.getProfile().then(function(profile) {
          remoteService.postUser(profile).catch(function(response) {
            console.log(response)
          });
        });
      };

    $scope.saveProfile = function() {
      // Prevent save action from firing twice when the save button is tapped.
      if (!$scope.dirty) return;
      $scope.dirty = false;
      saveProfile($scope.profile).then(submitProfile);
    };

    $scope.profileChanged = function() {
      $scope.dirty = true;
    };

    $scope.$on('$ionicView.enter', function(e) {
      $scope.dirty = false;
      profileService.getProfile().then(function(profile) {
        $scope.profile = profile;
      });
      tripService.getTotalDistance().then(function(distance) {
        var miles = distance * 0.000621371;
        $scope.distance =  miles.toFixed(1);
        $scope.ghg = (miles * .8115).toFixed(1);
      });
    });

    $scope.$on('$ionicView.beforeLeave', function(e) {
      // TODO: Prevent the view from changing until the popup has been
      // dismissed. See: https://github.com/driftyco/ionic/issues/3791
      var profile = angular.copy($scope.profile);
      if ($scope.dirty) {
        $ionicPopup.confirm({
           title: 'Save Your Profile',
           template: 'Do you want to save the changes to your profile?',
           cancelText: 'Discard',
           okText: 'Save'
        }).then(function(res) {
          if (res) saveProfile(profile).then(submitProfile);
        });
      }
    });

    $scope.options = {
      age: remoteService.getOptions('User', 'Age'),
      cyclingExperience: remoteService.getOptions('User', 'ExperienceLevel'),
      gender: remoteService.getOptions('User', 'Gender')
    };
}])

.controller('LegalCtrl', [
  '$scope',
  'mapService',
  function($scope, mapService) {
    mapService.getLegalText().then(function(text) {
      $scope.googleText = text;
    });
}]);
