angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
})

.controller('MenuCtrl', [
  '$scope',
  '$ionicSideMenuDelegate',
  function($scope, $ionicSideMenuDelegate) {
    // Because of the positioning of the map view, we have to hide the side menu
    // when it is closed.
    $scope.$watch(function(){
      return $ionicSideMenuDelegate.getOpenRatio();
    }, function(newValue, oldValue) {
      $scope.hideLeft = (newValue == 0);
    });
}])

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
      $scope.odometer = (tripService.getCurrentDistance() * 0.000621371).toFixed(1);
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
    getDeviceID = function() {
      return (typeof device !== 'undefined') ? device.uuid : null;
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
      $http.post(TRIPS_ENDPOINT, {
        tripData: LZString.compressToBase64(JSON.stringify(tripService.getTrip()))
      }).then(function success(res) {
        tripService.saveTrip(res.status == 200);
        if (res.status != 200) onSubmitError();
      }, function failure(res) {
        console.log(res);
        tripService.saveTrip(false);
        onSubmitError();
      });
    };

    $scope.startRecording = function() {
      console.log('Tapped record button');
      setStatus(STATUS_RECORDING);
    };

    $scope.pauseRecording = function() {
      console.log('Tapped pause button');
      setStatus(STATUS_PAUSED);
    };

    $scope.stopRecording = function() {
      console.log('Tapped stop button');
      setStatus(STATUS_PAUSED);
      mapService.setClickable(false);
      tripSubmitModal.show();
    };

    $scope.submitTrip = function() {
      submitTrip();
      tripService.resetTrip();
      updateMap();
      setStatus(STATUS_STOPPED);
      tripSubmitModal.hide();
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
        $scope.getCurrentPosition();
      });

      // Set up the view.
      $scope.$on('$ionicView.enter', function(e) {
        $scope.settings = settingsService.getSettings();
      });
    });
}])

.controller('PreviousTripsCtrl', function($scope, $ionicActionSheet) {

  var formatDate = function(date) {
    var startDate = new Date($scope.startTime);
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    $scope.date = startDate.getDate();
    $scope.day = days[startDate.getDay()];
    $scope.month = months[startDate.getMonth()];
    $scope.hour = startDate.getHours();
    $scope.minutes = startDate.getMinutes();
    $scope.period = "AM";

    if ($scope.hour >= 12) {
      $scope.hour -= 12;
      $scope.period = 'PM';
    }

    if ($scope.hour == 0) {
      $scope.hour = 12;
    }

    if ($scope.minutes < 12) {
      $scope.minutes = '0' + $scope.minutes;
    }
    return $scope.day + ', ' + $scope.month + ' ' + $scope.date + ' at ' + $scope.hour + ":" + $scope.minutes + $scope.period
  };

  $scope.onItemDelete = function(item) {
    $ionicActionSheet.show({
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
        // add cancel code..
      },
      destructiveButtonClicked: function(index) {
        delete $scope.trips[item.id];
        console.log(index);
        window.localStorage['trips'] = JSON.stringify($scope.trips);
        return true;
      }
    });
  };

  if (window.localStorage.getItem('trips') == undefined) {
    var sampleTrips = {};
    window.localStorage['trips'] = JSON.stringify(sampleTrips);
  }
  $scope.trips = JSON.parse(window.localStorage.getItem('trips'));

})

.controller('PreviousTripCtrl', function($scope, $ionicActionSheet, $stateParams) {
  $scope.trips = JSON.parse(window.localStorage.getItem('trips'));
  $scope.trip = $scope.trips[$stateParams.previousTripID];
  var startDate = new Date($scope.trip.startTime);
  var endDate = new Date($scope.trip.endTime);
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  $scope.date = startDate.getDate();
  $scope.day = days[startDate.getDay()];
  $scope.month = months[startDate.getMonth()];
  $scope.year = startDate.getFullYear();
  $scope.duration = ($scope.trip.endTime - $scope.trip.startTime) / 1000;
  $scope.distance = $scope.trip.distance;
  $scope.avgSpeed = ($scope.trip.distance / $scope.duration * 3600).toFixed(2);

  var seconds = Math.round($scope.duration % 60);
  var minutes = Math.floor($scope.duration / 60);
  $scope.durationString = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

  //Constants for rider of 187 lb on road bike
  var K1 = 3.509;
  var K2 = .2581;
  // Total Calories = avgSpeed * (K1 + K2 * avgSpeed ^ 2) * (duration in min)
  $scope.trip.calories = (($scope.avgSpeed * (K1 + K2 * Math.pow($scope.avgSpeed, 2))) / 67.78 * (minutes + seconds / 60)).toFixed(0);

  $scope.greenhouse = ($scope.distance * .8115);

  $scope.mapCreated = function(map) {
    $scope.map = map;

    $scope.infoWindow = new google.maps.InfoWindow();

    $scope.infoWindow.addListener('closeclick', function() {
      $scope.infoWindow.setContent("");
    });

    $scope.infoWindow.addListener('content_changed', function() {
      if ($scope.selectedPath) {
        $scope.selectedPath.setOptions({
          strokeColor: '#585858'
        })
        $scope.selectedPath = null;
      }
    });

    $scope.map.setCenter(new google.maps.LatLng($scope.trip.points[0].lat, $scope.trip.points[0].lng));

    var points = new google.maps.Polyline({
      zIndex: 1,
      path: $scope.trip.points,
      map: $scope.map,
      geodesic: true,
      strokeColor: '#2677FF',
      strokeOpacity: 0.7,
      strokeWeight: 5
    });

  };

})

.controller('SavedLocationsCtrl', function($scope, $ionicActionSheet) {
  $scope.onItemDelete = function(item) {
    $ionicActionSheet.show({
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {},
      destructiveButtonClicked: function(index) {
        $scope.locations.splice($scope.locations.indexOf(item), 1);
        window.localStorage['saved_locations'] = JSON.stringify($scope.locations);
        return true;
      }
    });
  };

  if (window.localStorage.getItem("saved_locations") == undefined) {
    var sampleLocations = [{
      title: 'Home',
      id: 1
    }, {
      title: 'School',
      id: 2
    }, {
      title: 'Grocery Store',
      id: 3
    }, {
      title: 'Work',
      id: 4
    }];
    window.localStorage['saved_locations'] = JSON.stringify(sampleLocations);
  }
  $scope.locations = JSON.parse(window.localStorage.getItem("saved_locations"));
})


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

.controller('profileCtrl', function($scope, $ionicModal, $http) {
  //Loading data from local storage
  var totDist = 0;
  if (localStorage.getItem("totalDistProf") !== null)
    totDist = Number(JSON.parse(window.localStorage['totalDistProf']));

  var info = {
    sex: window.localStorage['sex'] || '',
    age: window.localStorage['age'] || '',
    cyclingExperience: window.localStorage['cyclingExperience'] || '',
    totalDist: totDist
  };

  $scope.info = info;

  //Save info to local storage after confirm
  $scope.confirmInfo = function() {
    window.localStorage['sex'] = info.sex;
    window.localStorage['age'] = info.age;
    window.localStorage['cyclingExperience'] = info.cyclingExperience;
    $scope.modal.hide();
    $scope.modal.remove();

    $http.post("http://api.bikemoves.cuuats.org/v0.1/user", {
            userData: LZString.compressToBase64(JSON.stringify({
                deviceID: $getDeviceID(),
                gender: info.sex,
                age: info.age,
                cycling_experience:info.cyclingExperience
            }))
          }).then(
            function successCallback(response) {
              console.log(response)
            },
            function errorCallback(response) {
              console.log(response)
            });
  }

  //Create modal for info edit
  $scope.editInfo = function() {

    $ionicModal.fromTemplateUrl('templates/profile_options.html', {
      scope: $scope
    }).then(function(modal) {
      $scope.modal = modal;
      modal.show();
    });
  };
})

.controller('DevLogCtrl', function($scope, devLogService) {
  $scope.devLogs = devLogService.get()
})
