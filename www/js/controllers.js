angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
})


.controller('mapCtrl', function($scope, $ionicLoading, $ionicModal, $http, $ionicPopup, userLocationStorage, mapInfoService, devLogService) {
  var PLAY_BUTTON_CLASS = "ion-play button-balanced",
    PAUSE_BUTTON_CLASS = "ion-pause button-energized",
    STOP_BUTTON_CLASS = "ion-stop button-assertive";

  /**
   * BackgroundGelocation plugin state
   */
  $scope.bgGeo = {
    enabled: (window.localStorage.getItem('bgGeo:enabled') == 'true'),
    isMoving: (window.localStorage.getItem('bgGeo:isMoving') == 'true')
  };
  $scope.startButtonIcon = ($scope.bgGeo.isMoving) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;
  $scope.stopButtonIcon = STOP_BUTTON_CLASS;
  $scope.map = undefined;
  $scope.currentLocationMarker = undefined;
  $scope.previousLocation = undefined;
  $scope.locationMarkers = [];
  $scope.path = undefined;
  $scope.currentLocationMarker = undefined;
  $scope.locationAccuracyMarker = undefined;
  $scope.recording = false;
  $scope.location = {
    isAccurate: false
  };
  $scope.odometer = 0;

  if (typeof device !== 'undefined') {
    $scope.deviceID = device.uuid;
  }

  // Add BackgroundGeolocation event-listeners when Platform is ready.
  ionic.Platform.ready(function() {
    BackgroundGeolocationService.onLocation($scope.centerOnMe);
    BackgroundGeolocationService.onMotionChange($scope.onMotionChange);
  });

  // Call this to reset all trip data
  var resetGeolocation = function() {
    console.log("geo reset")
      // Reset odometer to 0.
    var plugin = BackgroundGeolocationService.getPlugin();
    if (plugin) {
      plugin.resetOdometer(function() {
        $scope.$apply(function() {
          $scope.odometer = 0;
        });
      });
    }

    $scope.bgGeo.isMoving = false;
    $scope.startButtonIcon = PLAY_BUTTON_CLASS;

    // Clear previousLocation
    $scope.previousLocation = undefined;

    // Clear location-markers.
    var marker;
    for (var n = 0, len = $scope.locationMarkers.length; n < len; n++) {
      marker = $scope.locationMarkers[n];
      marker.setMap(null);
    }
    $scope.locationMarkers = [];

    // Clear blue route PolyLine
    if ($scope.path) {
      $scope.path.setMap(null);
      $scope.path = undefined;
    }
  }

  // Enable background geolocation
  $scope.bgGeo.enabled = true;
  BackgroundGeolocationService.setEnabled(true, function() {}, function(error) {
    alert('Failed to start tracking with error code: ' + error);
  });
  resetGeolocation();

  // Stores map when it is created on page
  $scope.mapCreated = function(map) {
    $scope.map = map;
    mapInfoService.init(map);

    // Add BackgroundGeolocationService event-listeners when Platform is ready.
    ionic.Platform.ready(function() {
      var bgGeo = BackgroundGeolocationService.getPlugin();
      if (!bgGeo) {
        return;
      }
    });
  };

  /**
   * Draw google map marker for current location
   */
  $scope.setCurrentLocationMarker = function(location) {
    // Only record point if accuracy is "good"
    if (location.coords.accuracy < 50) {
      $scope.location.isAccurate = true
    } else {
      $scope.location.isAccurate = false
      return;
    }

    var plugin = BackgroundGeolocationService.getPlugin();

    // Set currentLocation @property
    $scope.currentLocation = location;

    var coords = location.coords;

    if (!$scope.currentLocationMarker) {
      $scope.currentLocationMarker = new google.maps.Marker({
        map: $scope.map,
        zIndex: 10,
        title: 'Current Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#2677FF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeOpacity: 1,
          strokeWeight: 6
        }
      });
      // Draws a circle around location indicating location accuracy
      //$scope.locationAccuracyMarker = new google.maps.Circle({
      //  zIndex: 9,
      //  fillColor: '#3366cc',
      //  fillOpacity: 0.4,
      //  strokeOpacity: 0,
      //  map: $scope.map
      //});
    }

    if (!$scope.path && $scope.recording) {
      $scope.path = new google.maps.Polyline({
        zIndex: 1,
        map: $scope.map,
        geodesic: true,
        strokeColor: '#2677FF',
        strokeOpacity: 0.7,
        strokeWeight: 5
      });
      $scope.timestamps = [];
      $scope.accuracys = [];
    }
    var latlng = new google.maps.LatLng(coords.latitude, coords.longitude);

    if ($scope.previousLocation && $scope.recording) {
      var prevLocation = $scope.previousLocation;
    }

    // Update our current position marker and accuracy bubble.
    $scope.currentLocationMarker.setPosition(latlng);
    //$scope.locationAccuracyMarker.setCenter(latlng);
    //$scope.locationAccuracyMarker.setRadius(location.coords.accuracy);

    if (location.sample === true) {
      return;
    }

    // Add breadcrumb to current Polyline path.
    if ($scope.recording) {
      $scope.path.getPath().push(latlng);
      var d = new Date();
      $scope.timestamps.push(d.getTime());
      $scope.accuracys.push(coords.accuracy);
    }

    $scope.previousLocation = location;

    if (plugin && $scope.recording) {
      // Update odometer
      plugin.getOdometer(function(value) {
        $scope.$apply(function() {
          var dist_in_km = (value / 1000)
          $scope.odometer = (dist_in_km * 0.62137).toFixed(1)
        });
      });
    }
  };

  /**
   * Start/stop aggressive monitoring / stationary mode
   */
  $scope.onClickStart = function() {
    if (!$scope.running) {
      var d = new Date();
      $scope.startTime = d.getTime();
    }
    if ($scope.recording) {
      $scope.recording = false;
    } else {
      $scope.running = true;
      $scope.recording = true;
    }
    $scope.startButtonIcon = ($scope.recording) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;
    var willStart = !$scope.bgGeo.isMoving;
    console.log('onClickStart: ', willStart);

    BackgroundGeolocationService.setPace(willStart, function() {
      $scope.bgGeo.isMoving = willStart;
    });
  };

  // Stop recording, then save and submit trip
  $scope.onClickStop = function() {
    if (!$scope.running)
      return;
    var points = [];
    var fromGuess = null;
    var toGuess = null;
    // Try to guess start and end locations
    if ($scope.path) {
      points = $scope.path.getPath().getArray()
      var closestStartLoc = userLocationStorage.getClosestLocation(points[0].lat(), points[0].lng())
      if (closestStartLoc) fromGuess = closestStartLoc[0]
      var closestEndLoc = userLocationStorage.getClosestLocation(points[points.length - 1].lat(), points[points.length - 1].lng())
      if (closestEndLoc) toGuess = closestEndLoc[0];
    }

    var confirmPopup = $ionicPopup.confirm({
      title: 'Complete Route',
      template: 'Are you done recording your route?'
    });
    confirmPopup.then(function(res) {
      if (res) {
        // Check if trip should be posted to server
        if (window.localStorage.getItem("dataSubmission") == undefined) {
          window.localStorage['dataSubmission'] = "true";
        }
        var submitData = window.localStorage.getItem("dataSubmission")

        // Populate form with location guesses
        $scope.formData = {};
        if (fromGuess !== null) {
          $scope.formData["from"] = fromGuess
        }
        if (toGuess !== null) {
          $scope.formData["to"] = toGuess
        }

        var buttonText = (submitData === "true") ? 'Save and Submit' : 'Save'
        var tripForm = $ionicPopup.show({
          title: 'Tell Us about Your Trip',
          templateUrl: 'templates/trip_form.html',
          scope: $scope,
          buttons: [{
            text: buttonText,
            type: 'button-positive',
            onTap: function(e) {
              return $scope.formData;
            }
          }]
        });

        tripForm.then(function(res) {

          $scope.running = false;
          $scope.recording = false;
          $scope.startButtonIcon = ($scope.recording) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;
          var d = new Date();
          $scope.endTime = d.getTime();

          // Update location predictions with trip data
          if ($scope.path) {
            if (points[0]) {
              userLocationStorage.addLocation($scope.formData.from, points[0].lat(), points[0].lng())
              userLocationStorage.addLocation($scope.formData.to, points[points.length - 1].lat(), points[points.length - 1].lng())
            }
          }

          // Load past trips into local var
          var trips = {};
          if (window.localStorage.getItem('trips') !== null) {
            trips = JSON.parse(window.localStorage.getItem('trips'));
          }

          /* Temp test code, delete later
          $scope.path = new google.maps.Polyline({
            zIndex: 1,
            map: $scope.map,
            geodesic: true,
            strokeColor: '#2677FF',
            strokeOpacity: 0.7,
            strokeWeight: 5
          });
          $scope.path.getPath().push(new google.maps.LatLng(37.772, -122.214));
          $scope.path.getPath().push(new google.maps.LatLng(21.291, -157.821));
          $scope.path.getPath().push(new google.maps.LatLng(-18.142, 178.431));
          $scope.path.getPath().push(new google.maps.LatLng(-27.467, 153.027));
          $scope.odometer = 2;
          console.log($scope.path.getPath().getArray().toString());
          */

          // Generate trip title
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

          // Create new trip object
          trips[$scope.startTime] = {
            title: $scope.day + ', ' + $scope.month + ' ' + $scope.date + ' at ' + $scope.hour + ":" + $scope.minutes + $scope.period,
            id: $scope.startTime,
            points: points,
            timestamps: $scope.timestamps,
            accuracys: $scope.accuracys,
            distance: $scope.odometer,
            startTime: $scope.startTime,
            endTime: $scope.endTime,
            deviceID: $scope.deviceID,
            from: $scope.formData.from,
            to: $scope.formData.to
          }
          // Save trip to local storage
          window.localStorage['trips'] = JSON.stringify(trips);

          //Update total distance
          if (window.localStorage['totalDistProf'] !== undefined) {
            window.localStorage['totalDistProf'] = JSON.stringify(Number(JSON.parse(window.localStorage['totalDistProf'])) + Number($scope.odometer));
          } else {
            window.localStorage['totalDistProf'] = JSON.stringify(Number($scope.odometer));
          }


          console.log(trips[$scope.startTime]);

          // Submit trip to server if allowed by user
          if(submitData === "true") {
            $http.post("http://api.bikemoves.cuuats.org/v0.1/trip", {
              tripData: LZString.compressToBase64(JSON.stringify(trips[$scope.startTime]))
            }).then(
              //$http.post("http://api.bikemoves.cuuats.org/v0.1/trip", {tripData: JSON.stringify(trips[$scope.startTime])}).then(
              function successCallback(response) {
                console.log(response)
              },
              function errorCallback(response) {
                console.log(response)
                devLogService.push(response)
              });
          }

          // Reset trip data
          resetGeolocation();
        });


      } else {
        // Deal with no response to popup
      }
    });
  }

  /**
   * Show Settings screen
   */
  $scope.onClickSettings = function() {
    $state.transitionTo('settings');
  };

  /**
   * Center map button
   */
  $scope.getCurrentPosition = function() {
    if (!$scope.map) {
      return;
    }
    BackgroundGeolocationService.getCurrentPosition(function(location, taskId) {
      $scope.centerOnMe(location);

      BackgroundGeolocationService.finish(taskId);
    }, function(error) {
      console.error("- getCurrentPostion failed: ", error);
    }, {
      maximumAge: 0
    });
  };

  $scope.centerOnMe = function(location) {
    // Check if location accuracy is "good" and update ui accordingly
    if (location.coords.accuracy < 50) {
      $scope.location.isAccurate = true
    } else {
      $scope.location.isAccurate = false
    }
    $scope.$apply();
    console.log($scope.location.isAccurate)
    $scope.map.setCenter(new google.maps.LatLng(location.coords.latitude, location.coords.longitude));
    $scope.setCurrentLocationMarker(location);
  };


  /*$scope.toggleMarkers = function() {
    for (var i = 0; i < $scope.markers.length; i++) {
      $scope.markers[i].setMap($scope.markersVisible ? null : $scope.map);
    }
    $scope.markersVisible = !$scope.markersVisible;
  }*/
})

.controller('PreviousTripsCtrl', function($scope, $ionicActionSheet) {

  // Delete previous trip
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

  // Load previous trips
  if (window.localStorage.getItem('trips') == undefined) {
    var sampleTrips = {};
    window.localStorage['trips'] = JSON.stringify(sampleTrips);
  }
  $scope.trips = JSON.parse(window.localStorage.getItem('trips'));

})

.controller('PreviousTripCtrl', function($scope, $ionicActionSheet, $stateParams) {
  // Load previous trips
  $scope.trips = JSON.parse(window.localStorage.getItem('trips'));
  // Load selected previous trip
  $scope.trip = $scope.trips[$stateParams.previousTripID];

  // Create trip name
  var startDate = new Date($scope.trip.startTime);
  var endDate = new Date($scope.trip.endTime);
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  $scope.date = startDate.getDate();
  $scope.day = days[startDate.getDay()];
  $scope.month = months[startDate.getMonth()];
  $scope.year = startDate.getFullYear();

  // Calculate trip stats
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

  // Run when map is loaded
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

    // Center map on beginning of trip
    $scope.map.setCenter(new google.maps.LatLng($scope.trip.points[0].lat, $scope.trip.points[0].lng));

    // Add trip points to map
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

/*.controller('SavedLocationsCtrl', function($scope, $ionicActionSheet) {
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
})*/


.controller('SettingsCtrl', function($scope, $ionicActionSheet, $ionicPopup) {
  // Load data submission policy
  if (window.localStorage.getItem("dataSubmission") == undefined) {
    window.localStorage['dataSubmission'] = "true";
  }

  $scope.dataSubmission = {
    checked: JSON.parse(window.localStorage['dataSubmission'])
  };
  $scope.dataSubmissionChange = function() {
    window.localStorage['dataSubmission'] = JSON.stringify($scope.dataSubmission.checked);
  };

  // Reset all app data
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
  if (typeof device !== 'undefined') {
    $scope.deviceID = device.uuid;
  }
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

    // Post profile to server when saved
    $http.post("http://api.bikemoves.cuuats.org/v0.1/user", {
            userData: LZString.compressToBase64(JSON.stringify({
                deviceID: $scope.deviceID,
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
