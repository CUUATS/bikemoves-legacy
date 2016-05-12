angular.module('bikemoves.controllers', [])

.controller('MapCtrl', [
  '$scope',
  '$ionicPlatform',
  '$ionicModal',
  '$http',
  '$ionicPopup',
  'mapService',
  'tripService',
  'settingsService',
  function($scope, $ionicPlatform, $ionicModal, $http, $ionicPopup, mapService, tripService, settingsService) {
    var TRIPS_ENDPOINT = 'http://api.bikemoves.me/v0.1/trip',
      STATUS_STOPPED = 'stopped',
      STATUS_RECORDING = 'recording',
      STATUS_PAUSED = 'paused',
      BG_PLUGIN_SETTINGS = {
          activityType: 'Fitness', // iOS activity type
          autoSync: false, // Do not automatically post to the server
          debug: false, // Disable debug notifications
          desiredAccuracy: 0, // Highest accuracy
          distanceFilter: 20, // Generate update events every 20 meters
          disableElasticity: true, // Do not auto-adjust distanceFilter
          fastestLocationUpdateInterval: 1000, // Prevent updates more than once per second (Android)
          locationUpdateInterval: 5000, // Request updates every 5 seconds (Android)
          startOnBoot: false, // Do not start tracking on device boot
          stationaryRadius: 20, // Activate the GPS after 20 meters (iOS)
          stopOnTerminate: true, // Stop geolocation tracking on app exit
          stopTimeout: 3 // Keep tracking for 3 minutes while stationary
        },
      bgGeo,
      currentLocation,
      tripSubmitModal;

    var getStatusFromScope = function() {
      if ($scope.status.isRecording) return STATUS_RECORDING;
      if ($scope.status.isPaused) return STATUS_PAUSED;
      return STATUS_STOPPED;
    },
    getStatusFromState = function(state) {
      // Get the current status from the geolocation plugin state.
      return (state.enabled) ? (
        (state.isMoving) ? STATUS_RECORDING : STATUS_PAUSED) : STATUS_STOPPED;
    },
    setStatus = function(status, callback, initial) {
      console.log('Seting status: ' + status);
      if (!angular.isDefined(callback)) var callback = angular.noop;
      $scope.status = {
        isStopped: status == STATUS_STOPPED,
        isPaused: status == STATUS_PAUSED,
        isRecording: status == STATUS_RECORDING
      };
      if (initial) return;

      if (status == STATUS_RECORDING) {
        setGeolocationEnabled(true, function() {
          setMoving(true, callback);
        });
      } else if (status == STATUS_PAUSED) {
        setGeolocationEnabled(true, function() {
          setMoving(false, callback);
        });
      } else {
        setGeolocationEnabled(false, callback);
      }
    },
    setGeolocationEnabled = function(on, callback) {
      if (!angular.isDefined(callback)) var callback = angular.noop;
      bgGeo.getState(function(state) {
        if (state.enabled === on) {
          callback();
        } else if (on) {
          bgGeo.start(callback);
        } else {
          bgGeo.stop(callback);
        }
      });
    },
    setMoving = function(moving, callback) {
      if (!angular.isDefined(callback)) var callback = angular.noop;
      bgGeo.getState(function(state) {
        if (state.isMoving === moving) {
          callback();
        } else {
          bgGeo.changePace(moving, callback);
        }
      });
    },
    updateMap = function() {
      if (currentLocation) {
        mapService.onMapReady(function() {
          mapService.setCurrentLocation(currentLocation);
          mapService.setCenter(currentLocation);

          var trip = tripService.getTrip();
          if (trip.locations.length > 1) {
            mapService.setTripLocations(trip.locations);
          }
        });
      }
    },
    updateOdometer = function() {
      // Convert meters to miles.
      $scope.$apply(function () {
        $scope.odometer = (tripService.getCurrentDistance() * 0.000621371).toFixed(1);
      });
    },
    makeLocation = function(e) {
      return angular.merge({
        moving: e.is_moving,
        time: e.timestamp.getTime()
      }, e.coords);
    },
    onLocation = function(e, taskId) {
      var location = makeLocation(e),
        evaluation = tripService.evaluateLocation(location);
      console.log(evaluation + ': ' + JSON.stringify(location));
      if (evaluation > -1) {
        currentLocation = location;
        if ($scope.status.isRecording) {
          if (evaluation == 0) {
            tripService.replaceLocation(location);
          } else {
            tripService.addLocation(location);
          }
          updateOdometer();
        }
        updateMap();
      }
      bgGeo.finish(taskId);
    },
    onLocationError = function(error) {
      console.error('Location error: ', error);
    },
    onMotionChange = function(isMoving, location, taskId) {
      if (isMoving) {
        console.log('Device has just started MOVING', location);
      } else {
        console.log('Device has just STOPPED', location);
      }
      bgGeo.finish(taskId);
    },
    onSubmitError = function() {
      mapService.setClickable(false);
      $ionicPopup.alert({
        title: 'Trip Submission Failed',
        template: 'Sorry, an error occurred while submitting your trip. Please try again later.'
      }).then(function() {
        mapService.setClickable(true);
      });
    },
    submitTrip = function() {
      return $http.post(TRIPS_ENDPOINT, {
        data: LZString.compressToBase64(JSON.stringify({
          deviceID: window.device.uuid,
          trip: tripService.getTrip()
        }))
      }).then(function success(res) {
        tripService.saveTrip(res.status == 200);
        if (res.status != 200) onSubmitError();
      }, function failure(res) {
        console.log(res);
        tripService.saveTrip(false);
        onSubmitError();
      });
    },
    initView = function() {
      console.log('Entered map view');
      mapService.onMapReady(function() {
        $scope.settings = settingsService.getSettings();
        console.log('Resetting the map');
        mapService.resetMap('current');
        $scope.getCurrentPosition();
      });
    };

    $scope.startRecording = function() {
      console.log('Tapped record button');
      setStatus(STATUS_RECORDING);
      tripService.setStartTime();
    };

    $scope.pauseRecording = function() {
      console.log('Tapped pause button');
      setStatus(STATUS_PAUSED);
    };

    $scope.stopRecording = function() {
      console.log('Tapped stop button');
      setStatus(STATUS_PAUSED);
      tripService.setEndTime();
      mapService.setClickable(false);
      tripSubmitModal.show();
    };

    $scope.submitTrip = function() {
      setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();
      submitTrip().finally(function () {
        tripService.resetTrip();
        updateMap();
      });
    };

    $scope.saveTrip = function() {
      tripService.saveTrip(false);
      tripService.resetTrip();
      updateMap();
      setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();
    };

    $scope.resumeTrip = function() {
      setStatus(STATUS_RECORDING);
      tripSubmitModal.hide();
    };

    $scope.discardTrip = function() {
      tripService.resetTrip();
      updateMap();
      setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();
    };

    $scope.getCurrentPosition = function() {
      setGeolocationEnabled(true, function() {
        bgGeo.getCurrentPosition(function success(e, taskId) {
          // Reset background geolocation to its former state.
          setStatus(getStatusFromScope());
        }, function error(errorCode) {
          console.log('Error code: ' + errorCode)
        }, {maximumAge: 0});
      });
    };

    $ionicPlatform.ready(function() {
      // Create the modal window for trip submission.
      $ionicModal.fromTemplateUrl('templates/trip_form.html', {
        scope: $scope,
        animation: 'slide-in-up'
      }).then(function(modal) {
        tripSubmitModal = modal;
      });
      $scope.$on('modal.hidden', function(e) {
        mapService.setClickable(true);
      });
      $scope.$on('$destroy', function() {
        tripSubmitModal.remove();
      });

      // Set up the geolocation plugin.
      bgGeo = window.BackgroundGeolocation;
      bgGeo.onLocation(onLocation, onLocationError);
      bgGeo.onMotionChange(onMotionChange);
      bgGeo.configure(BG_PLUGIN_SETTINGS);

      // Set the initial state.
      bgGeo.getState(function(state) {
        console.log(JSON.stringify(state));
        if (state.enabled === false) tripService.resetTrip();
        updateOdometer();
        setStatus(getStatusFromState(state), angular.noop, true);
      });

      // Set up the view.
      $scope.$on('$ionicView.enter', function(e) {
        initView();
      });

      // iOS does not fire the "enter" event on first load.
      if (ionic.Platform.isIOS()) initView();
    });
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
      $scope.trips = tripService.getTrips();
    });
}])

.controller('PreviousTripCtrl', [
  '$scope',
  '$stateParams',
  'mapService',
  'tripService',
  function($scope, $stateParams, mapService, tripService) {
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
      },
      trip = tripService.getTripByIndex($stateParams.tripIndex),
      duration = new Date(trip.endTime) - new Date(trip.startTime), // In milliseconds
      distance = trip.distance * 0.000621371, // In miles
      speed = distance / (duration / HOUR); // In MPH

    $scope.origin = trip.origin;
    $scope.destination = trip.destination;
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

    // Set up the view.
    $scope.$on('$ionicView.enter', function(e) {
      mapService.onMapReady(function() {
        mapService.resetMap('previous');
        if (trip.locations.length > 0) {
          mapService.setTripLocations(trip.locations);
          mapService.zoomToTripPolyline();
        }
      });
    });
}])

.controller('SettingsCtrl', [
  '$scope',
  '$ionicPopup',
  'settingsService',
  'tripService',
  function($scope, $ionicPopup, settingsService, tripService) {
    var reloadSettings = function() {
      $scope.settings = settingsService.getSettings();
    };

    $scope.updateSettings = function() {
      settingsService.updateSettings($scope.settings);
    };

    $scope.reset = function() {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Reset Saved Data',
        template: 'Are you sure you want to delete all saved data, including settings and saved trips?'
      });

      confirmPopup.then(function(res) {
        if (res) {
          settingsService.clearAll();
          reloadSettings();
          tripService.clearAll();
          $ionicPopup.alert({
            title: 'Data Reset',
            content: 'All data have been reset.'
          });
        }
      })
    };

    reloadSettings();
}])

.controller('profileCtrl', [
  '$scope',
  '$ionicModal',
  '$http',
  'profileService',
  'tripService',
  function($scope, $ionicModal, $http, profileService, tripService) {
    var ENDPOINT = 'http://api.bikemoves.me/v0.1/user',
      saveProfile = function() {
        profileService.setProfile($scope.profile);
        profileEditModal.hide();
      },
      submitProfile = function() {
        $http.post(ENDPOINT, {
          data: LZString.compressToBase64(JSON.stringify({
            deviceID: window.device.uuid,
            profile: profileService.getProfile()
          }))
        }).catch(function errorCallback(response) {
          console.log(response)
        });
      },
      profileEditModal;

    $scope.profile = profileService.getProfile();

    $ionicModal.fromTemplateUrl('templates/profile_options.html', {
      scope: $scope
    }).then(function(modal) {
      profileEditModal = modal;
    });

    $scope.editProfile = function() {
      profileEditModal.show();
    };

    $scope.saveProfile = function() {
      saveProfile();
      submitProfile();
    };

    $scope.$on('$ionicView.enter', function(e) {
      var distance = tripService.getTotalDistance() * 0.000621371;
      $scope.distance =  distance.toFixed(1);
      $scope.ghg = (distance * .8115).toFixed(1);
    });
}])

.controller('DevLogCtrl', function($scope, devLogService) {
  $scope.devLogs = devLogService.get()
})
