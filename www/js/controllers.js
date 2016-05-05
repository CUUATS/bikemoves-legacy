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
  '$ionicModal',
  '$http',
  '$ionicPopup',
  'mapService',
  'tripService',
  function($scope, $ionicModal, $http, $ionicPopup, mapService, tripService) {
    var TRIPS_ENDPOINT = 'http://api.bikemoves.me/v0.1/trip',
      STATUS_STOPPED = 'stopped',
      STATUS_RECORDING = 'recording',
      STATUS_PAUSED = 'paused',
      BG_PLUGIN_SETTINGS = {
          debug: false
        },
      bgGeo = window.BackgroundGeolocation,
      currentLocation;

    $scope.status = {
      isStopped: status == true,
      isPaused: status == false,
      isRecording: status == false
    };

    var setStatus = function(status) {
      console.log('Setting status: ' + status);
      $scope.status = {
        isStopped: status == STATUS_STOPPED,
        isPaused: status == STATUS_PAUSED,
        isRecording: status == STATUS_RECORDING
      };
      tripService.setStatus(status);
      if (status == STATUS_RECORDING) {
        bgGeo.start();
        bgGeo.changePace(true);
      } else if (status == STATUS_PAUSED) {
        bgGeo.start();
        bgGeo.changePace(false);
      } else {
        bgGeo.stop();
      }
    },
    updateMap = function() {
      if (currentLocation) {
        mapService.onMapReady(function() {
          mapService.setCurrentLocation(currentLocation);
          mapService.setCenter(currentLocation);
        });
      }
    },
    onLocation = function(e, taskId) {
      var location = angular.merge({
        moving: e.is_moving,
        time: e.timestamp.getTime()
      }, e.coords);
      console.log(location);
      currentLocation = location;
      if ($scope.status.isRecording) {
        var dist = tripService.addLocation(location);
        $scope.odometer = ((dist / 1000) * 0.62137).toFixed(1);
      }
      updateMap();
      bgGeo.finish(taskId);
    },
    onLocationError = function(error) {
      console.error('Location error: ', error);
    }
    getDeviceID = function() {
      return (typeof device !== 'undefined') ? device.uuid : null;
    },
    showTripSubmitForm = function(submit, save, resume, discard) {
      var buttons = [
        {
          text: 'Save and Submit',
          type: 'button-positive',
          onTap: submit
        },
        {
          text: 'Save',
          type: 'button-calm',
          onTap: save
        },
        {
          text: 'Resume',
          type: 'button-stable',
          onTap: resume
        },
        {
          text: 'Discard',
          type: 'button-assertive',
          onTap: discard
        }
      ];

      // Hide the save button if automatic submission is enabled.
      // if (settingsService.get('autoSubmit')) buttons.splice(1);

      // Prepopulate the trip form using previously saved trip data.
      // $scope.formData['from'] = tripService.guessLocationType(trip.locations[0]);
      // $scope.formData['to'] = tripService.guessLocationType(trip.locations[trip.locations.length - 1]);

      mapService.setClickable(false);
      var tripForm = $ionicPopup.show({
        title: 'Tell Us about Your Trip',
        templateUrl: 'templates/trip_form.html',
        scope: $scope,
        buttons: buttons
      });

      tripForm.then(function() {
        mapService.setClickable(true);
      });
    },
    onSubmitError = function() {
      $ionicPopup.alert({
        title: 'Trip Submission Failed',
        template: 'Sorry, an error occurred while submitting your trip. Please try again later.'
      });
    },
    submitTrip = function() {
      $http.post(TRIPS_ENDPOINT, {
        tripData: LZString.compressToBase64(JSON.stringify(trip))
      }).then(function success(res) {
        tripService.saveTrip(res.status == 200);
        if (res.status != 200) onSubmitError();
      }, function failure() {
        tripService.saveTrip(false);
        onSubmitError();
      });
    };

    $scope.startRecording = function() {
      console.log('Tapped record button');
      bgGeo.getState(function(state) {
        console.log(state);
      });
      setStatus(STATUS_RECORDING);
    };

    $scope.pauseRecording = function() {
      console.log('Tapped pause button');
      setStatus(STATUS_STOPPED);
    };

    $scope.stopRecording = function() {
      console.log('Tapped stop button');
      if (tripService.countLocations() < 2) {
        tripService.resetTrip();
        setStatus(STATUS_STOPPED);
        return;
      };
      setStatus(STATUS_PAUSED);
      showTripSubmitForm(function submit() {
        // Save and submit the trip.
        submitTrip();
        tripService.resetTrip();
        setStatus(STATUS_STOPPED);
      }, function save() {
        // Save the trip, but do not submit.
        tripService.saveTrip(false);
        tripService.resetTrip();
        setStatus(STATUS_STOPPED);
      }, function resume() {
        // Resume the trip.
        setStatus(STATUS_RECORDING);
      }, function discard() {
        // Discard the trip.
        tripService.resetTrip();
        setStatus(STATUS_STOPPED);
      });
    };

    $scope.getCurrentPosition = function() {
      bgGeo.start();
      bgGeo.getCurrentPosition(function success(location, taskId) {
        // Reset background geolocation to its former state.
        setStatus(tripService.getStatus());
        // TODO: Determine if bgGeo.stop() before bgGeo.finish(taskId)
        // causes problems.
        onLocation(location, taskId);
      }, function error(errorCode) {
        console.log('Error code: ' + errorCode)
      }, {maximumAge: 0})
    };

    // Set up the geolocation plugin.
    bgGeo.on('location', onLocation, onLocationError);
    bgGeo.configure(BG_PLUGIN_SETTINGS);
    $scope.getCurrentPosition();
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


.controller('SettingsCtrl', function($scope, $ionicActionSheet, $ionicPopup) {
  if (window.localStorage.getItem("dataSubmission") == undefined) {
    window.localStorage['dataSubmission'] = "true";
  }

  $scope.dataSubmission = {
    checked: JSON.parse(window.localStorage['dataSubmission'])
  };
  $scope.dataSubmissionChange = function() {
    window.localStorage['dataSubmission'] = JSON.stringify($scope.dataSubmission.checked);
  };

  $scope.reset = function() {

    var confirmPopup = $ionicPopup.confirm({
      title: 'Reset Local Data',
      template: 'Are you sure you want to delete all saved data (including routes and saved locations)?'
    });

    confirmPopup.then(function(res) {
      if (res) {
        window.localStorage.clear();
        $ionicPopup.alert({
          title: 'Data Reset',
          content: 'All data has been reset.'
        });
      }
    })
  }
})

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
