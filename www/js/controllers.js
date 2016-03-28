angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});
})

.controller('mapCtrl', function($scope, $ionicLoading, $ionicModal, $http, $ionicPopup, userLocationStorage) {
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
  $scope.map                    = undefined;
  $scope.currentLocationMarker  = undefined;
  $scope.previousLocation       = undefined;
  $scope.locationMarkers        = [];
  $scope.path                   = undefined;
  $scope.currentLocationMarker  = undefined;
  $scope.locationAccuracyMarker = undefined;
  $scope.stationaryRadiusMarker = undefined;
  $scope.recording               = false;

  if(typeof device !== 'undefined') {
    $scope.deviceID = device.uuid;
  }

  $scope.odometer = 0;

  // Add BackgroundGeolocation event-listeners when Platform is ready.
  ionic.Platform.ready(function() {
    BackgroundGeolocationService.onLocation($scope.centerOnMe);
    BackgroundGeolocationService.onMotionChange($scope.onMotionChange);
  });

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
    BackgroundGeolocationService.playSound('BUTTON_CLICK');
    $scope.bgGeo.isMoving = false;
    $scope.startButtonIcon = PLAY_BUTTON_CLASS;

    // Clear previousLocation
    $scope.previousLocation = undefined;

    // Clear location-markers.
    var marker;
    for (var n=0,len=$scope.locationMarkers.length;n<len;n++) {
      marker = $scope.locationMarkers[n];
      marker.setMap(null);
    }
    $scope.locationMarkers = [];


    // Clear red stationaryRadius marker
    if ($scope.stationaryRadiusMarker) {
      $scope.stationaryRadiusMarker.setMap(null);
      $scope.stationaryRadiusMarker = null;
    }

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

  /**
  * Show an alert
  * @param {String} title
  * @param {String} content
  */
  $scope.showAlert = function(title, content) {
    $ionicPopup.alert({
      title: title,
      content: content
    });
  };

  $scope.mapCreated = function(map) {
    $scope.map = map;

    // Add BackgroundGeolocationService event-listeners when Platform is ready.
    ionic.Platform.ready(function() {
      var bgGeo = BackgroundGeolocationService.getPlugin();
      if (!bgGeo) { return; }
    });

    $scope.infoWindow = new google.maps.InfoWindow();

    $scope.infoWindow.addListener('closeclick', function(){
      $scope.infoWindow.setContent("");
    });

    $scope.infoWindow.addListener('content_changed', function() {
      if ($scope.selectedPath) {
        $scope.selectedPath.setOptions({strokeColor: '#585858'})
        $scope.selectedPath = null;
      }
    });

    $scope.markers = [];
    $scope.markersVisible = true;

    /* Bike rack markers */
    $http.get('http://utility.arcgis.com/usrsvcs/servers/9e391a972ba14591945243a8f11408d3/rest/services/CCRPC/BicycleRack/MapServer/0/query?outSR=4326&where=SHAPE+IS+NOT+NULL&outFields=*&f=json')
      .success(function(data) {

        for (var i = 0; i < data.features.length; i++) {
            var coords = data.features[i].geometry;
            var properties = data.features[i].attributes;

            var covered = false;

            if (properties.Covered) covered = true;

            var marker = new google.maps.Marker({
              position: {lat : coords.y, lng: coords.x},
              map: $scope.map,
              icon: "img/bike_rack.png",
              owner: properties.Owner,
              parkName: properties.ParkName,
              covered: covered
            });

            marker.addListener('click', function() {
              var content = '';

              if (this.owner) content += 'Owner: ' + this.owner + '<br>';

              if (this.parkName) content += 'Park Name: ' + this.parkName + '<br>';

              if (this.covered) {
                content += 'Covered: Yes';
              }
              else
                content += 'Covered: No';

              $scope.infoWindow.setContent(
                "<b>Bike Rack Information:</b><br>" +
                content
              );

              $scope.infoWindow.open($scope.map, this);
            });

            $scope.markers.push(marker);
        }

    });

    var selectedPath;
    $scope.selectedPath = selectedPath;

    /* Bike path markers */
    $http.get('http://utility.arcgis.com/usrsvcs/servers/31e89733946d441187c0c4f692be8cf3/rest/services/CCRPC/BicyclePedestrianNetwork/MapServer/0/query?outSR=4326&where=SHAPE+IS+NOT+NULL&outFields=*&f=json')
      .success(function(data) {
        console.log(data); for (var i = 0; i < data.features.length; i++) {
            var coordlist = data.features[i].geometry.paths[0];
            var properties = data.features[i].attributes;

            var path = [];

            for (var j = 0; j < coordlist.length; j++) {
              path.push({lat: coordlist[j][1], lng: coordlist[j][0]});
            }

            var bikepath = new google.maps.Polyline({
              path: path,
              geodesic: true,
              strokeColor: '#585858',
              strokeOpacity: .4,
              strokeWeight: 4,
              distance: properties.Dx_Miles,
              name: properties.Name
            });

            bikepath.setMap($scope.map)

            bikepath.addListener('click', function(event) {

              var content = '';

              if (this.name) content += 'Name: ' + this.name + '<br>'

              if (this.distance) content += 'Distance: ' + this.distance + ' miles<br>';

              $scope.infoWindow.setContent(
                "<b>Bike Path Information:</b><br>" +
                content
              );

              $scope.infoWindow.setPosition(event.latLng);

              $scope.infoWindow.open($scope.map, this);
              $scope.selectedPath = this;
              $scope.selectedPath.setOptions({strokeColor: '#FF0000'})
            });
        }
    });
  };
/*
  $scope.onMotionChange = function(isMoving, location, taskId) {
    console.log('[js] onMotionChange: ', isMoving, JSON.stringify(location));

    // Cache isMoving state in localStorage
    window.localStorage.setItem('bgGeo:isMoving', isMoving);
    $scope.bgGeo.isMoving = isMoving;

    // Change state of start-button icon:  [>] or [||]
    $scope.startButtonIcon  = (isMoving) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;

    if ($scope.map) {
      $scope.map.setCenter(new google.maps.LatLng(location.coords.latitude, location.coords.longitude));
      if (!isMoving) {
        $scope.setStationaryMarker(location);
      } else if ($scope.stationaryRadiusMarker) {
        $scope.setCurrentLocationMarker(location);
        $scope.stationaryRadiusMarker.setMap(null);
      }
    }
    BackgroundGeolocationService.finish(taskId);
  }
*/
  /**
  * Draw google map marker for current location
  */
  $scope.setCurrentLocationMarker = function(location) {
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
    }
    var latlng = new google.maps.LatLng(coords.latitude, coords.longitude);

    if ($scope.previousLocation && $scope.recording) {
      var prevLocation = $scope.previousLocation;
      // Drop a breadcrumb of where we've been.
      /*$scope.locationMarkers.push(new google.maps.Marker({
        zIndex: 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#11b700',//'26cc77',
          fillOpacity: 1,
          strokeColor: '#0d6104',
          strokeWeight: 1,
          strokeOpacity: 0.7
        },
        map: $scope.map,
        position: new google.maps.LatLng(prevLocation.coords.latitude, prevLocation.coords.longitude)
      }));*/
    }

    // Update our current position marker and accuracy bubble.
    $scope.currentLocationMarker.setPosition(latlng);
    //$scope.locationAccuracyMarker.setCenter(latlng);
    //$scope.locationAccuracyMarker.setRadius(location.coords.accuracy);

    if (location.sample === true) {
      return;
    }

    // Add breadcrumb to current Polyline path.
    if($scope.recording) {
      $scope.path.getPath().push(latlng);
    }

    $scope.previousLocation = location;

    if (plugin && $scope.recording) {
      // Update odometer
      plugin.getOdometer(function(value) {
        $scope.$apply(function() {
          var dist_in_km = (value/1000)
          $scope.odometer = (dist_in_km*0.62137).toFixed(1)
        });
      });
    }
  };

  /**
  * Draw red stationary-circle on google map
  */
  /*$scope.setStationaryMarker = function(location) {
    console.log('[js] BackgroundGeoLocation onStationary ' + JSON.stringify(location));
    $scope.setCurrentLocationMarker(location);

    var coords = location.coords;

    if (!$scope.stationaryRadiusMarker) {
      $scope.stationaryRadiusMarker = new google.maps.Circle({
        zIndex: 0,
        fillColor: '#ff0000',
        strokeColor: '#aa0000',
        strokeWeight: 2,
        fillOpacity: 0.5,
        strokeOpacity: 0.5,
        map: $scope.map
      });
    }
    var radius = 50;
    var center = new google.maps.LatLng(coords.latitude, coords.longitude);
    $scope.stationaryRadiusMarker.setRadius(radius);
    $scope.stationaryRadiusMarker.setCenter(center);
    $scope.stationaryRadiusMarker.setMap($scope.map);
    $scope.map.setCenter(center);
  };*/

  /**
  * Enable BackgroundGeolocationService
  */
  /*$scope.onToggleEnabled = function() {
    var isEnabled = $scope.bgGeo.enabled;

    console.log('onToggleEnabled: ', isEnabled);
    BackgroundGeolocationService.setEnabled(isEnabled, function() {}, function(error) {
      alert('Failed to start tracking with error code: ' + error);
    });
    if (!isEnabled) {
      resetGeolocation();
    }
  };*/

  /**
  * Start/stop aggressive monitoring / stationary mode
  */
  $scope.onClickStart = function() {
    if(!$scope.running) {
      var d = new Date();
      $scope.startTime = d.getTime();
    }
    if($scope.recording) {
      $scope.recording = false;
    } else {
      $scope.running = true;
      $scope.recording = true;
    }
    $scope.startButtonIcon  = ($scope.recording) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;
    var willStart = !$scope.bgGeo.isMoving;
    console.log('onClickStart: ', willStart);

    BackgroundGeolocationService.setPace(willStart, function() {
      $scope.bgGeo.isMoving    = willStart;
    });
  };

  $scope.onClickStop = function() {
    if(!$scope.running)
      return;
    var points = [];
    var fromGuess = null;
    var toGuess = null;
    if($scope.path) {
      points = $scope.path.getPath().getArray()
      var closestStartLoc = userLocationStorage.getClosestLocation(points[0].lat(), points[0].lng())
      if(closestStartLoc) fromGuess = closestStartLoc[0]
      var closestEndLoc = userLocationStorage.getClosestLocation(points[points.length-1].lat(), points[points.length-1].lng())
      if(closestEndLoc) toGuess = closestEndLoc[0];
    }
    var confirmPopup = $ionicPopup.confirm({
      title: 'Complete Route',
      template: 'Are you done recording your route?'
    });
    confirmPopup.then(function(res) {
      if(res) {

        $scope.formData = {};
        if(fromGuess !== null) {
          $scope.formData["from"] = fromGuess
        }
        if(toGuess !== null) {
          $scope.formData["to"] = toGuess
        }

        var tripForm = $ionicPopup.show({
          title: 'Tell Us about Your Trip',
          templateUrl: 'templates/trip_form.html',
          scope: $scope,
          buttons: [
            { text: 'Save and Submit',
              type: 'button-positive',
              onTap: function(e) {
                return $scope.formData;
              }
            }
          ]
        });

        tripForm.then(function(res) {

          $scope.running = false;
          $scope.recording = false;
          $scope.startButtonIcon  = ($scope.recording) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;
          var d = new Date();
          $scope.endTime = d.getTime();

          if($scope.path) {
            userLocationStorage.addLocation($scope.formData.from, points[0].lat(), points[0].lng())
            userLocationStorage.addLocation($scope.formData.to, points[points.length-1].lat(), points[points.length-1].lng())
          }

          var trips = {};
          if(window.localStorage.getItem('trips') !== null) {
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

          if ($scope.minutes < 12)
          {
            $scope.minutes = '0' + $scope.minutes;
          }

          trips[$scope.startTime] = {
            title: $scope.day + ', ' + $scope.month + ' ' + $scope.date + ' at ' + $scope.hour + ":" + $scope.minutes + $scope.period,
            id: $scope.startTime,
            points: points,
            distance: $scope.odometer,
            startTime: $scope.startTime,
            endTime: $scope.endTime,
            deviceID: $scope.deviceID,
            from: $scope.formData.from,
            to: $scope.formData.to
          }
          window.localStorage['trips'] = JSON.stringify(trips);

          //Update total distance
          window.localStorage['totalDistProf'] = JSON.stringify((JSON.parse(window.localStorage['totalDistProf']) || 0) + $scope.odometer);

          console.log(trips[$scope.startTime]);

          $http.post("http://api.bikemoves.cuuats.org/v0.1/trip", {tripData: LZString.compressToBase64(JSON.stringify(trips[$scope.startTime]))}).then(
          //$http.post("http://api.bikemoves.cuuats.org/v0.1/trip", {tripData: JSON.stringify(trips[$scope.startTime])}).then(
            function successCallback(response) {
              console.log(response)
            }, function errorCallback(response) {
              console.log(response)
            });

          resetGeolocation();
        });


      } else {

      }
    });
  }

  /**
  * Show Settings screen
  */
  $scope.onClickSettings = function() {
    BackgroundGeolocationService.playSound('BUTTON_CLICK');
    $state.transitionTo('settings');
  };
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

  /**
  * Center map button
  */
  $scope.centerOnMe = function (location) {
    $scope.map.setCenter(new google.maps.LatLng(location.coords.latitude, location.coords.longitude));
    $scope.setCurrentLocationMarker(location);
  };


  $scope.toggleMarkers = function() {
    for (var i=0; i < $scope.markers.length; i++){
      $scope.markers[i].setMap($scope.markersVisible ? null : $scope.map);
    }
    $scope.markersVisible = ! $scope.markersVisible;
  }
})

.controller('PreviousTripsCtrl', function($scope, $ionicActionSheet) {

  $scope.onItemDelete = function(item) {
    $ionicActionSheet.show({
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
         // add cancel code..
      },
      destructiveButtonClicked: function(index)   {
        delete $scope.trips[item.id];
        console.log(index);
        window.localStorage['trips'] = JSON.stringify($scope.trips);
        return true;
      }
    });
  };

  if(window.localStorage.getItem('trips') == undefined) {
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

  $scope.mapCreated = function(map) {
    $scope.map = map;

    $scope.infoWindow = new google.maps.InfoWindow();

    $scope.infoWindow.addListener('closeclick', function(){
      $scope.infoWindow.setContent("");
    });

    $scope.infoWindow.addListener('content_changed', function() {
      if ($scope.selectedPath) {
        $scope.selectedPath.setOptions({strokeColor: '#585858'})
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
      cancel: function() {
      },
      destructiveButtonClicked: function(index) {
        $scope.locations.splice($scope.locations.indexOf(item), 1);
        window.localStorage['saved_locations'] = JSON.stringify($scope.locations);
        return true;
      }
    });
  };

  if(window.localStorage.getItem("saved_locations") == undefined) {
    var sampleLocations = [
      { title: 'Home', id: 1 },
      { title: 'School', id: 2 },
      { title: 'Grocery Store', id: 3 },
      { title: 'Work', id: 4 }
    ];
    window.localStorage['saved_locations'] = JSON.stringify(sampleLocations);
  }
  $scope.locations = JSON.parse(window.localStorage.getItem("saved_locations"));
})


.controller('SettingsCtrl', function($scope, $ionicActionSheet, $ionicPopup) {
  if (window.localStorage.getItem("dataSubmission") == undefined) {
    window.localStorage['dataSubmission'] = "true";
  }

  $scope.dataSubmission = { checked: JSON.parse(window.localStorage['dataSubmission'])};
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
  var totDist = 0;
  if(localStorage.getItem("totalDistProf") !== null)
    totDist = JSON.parse(window.localStorage['totalDistProf']);

  var info = {
    sex: window.localStorage['sex'] || '',
    age: window.localStorage['age'] || '',
    cyclingExperience: window.localStorage['cyclingExperience'] || '',
    totalDist: totDist
  };

  $scope.info = info;

  $scope.confirmInfo = function() {
    window.localStorage['sex'] = info.sex;
    window.localStorage['age'] = info.age;
    window.localStorage['cyclingExperience'] = info.cyclingExperience;
    $scope.modal.remove();

    /*$http.post('', {deviceID: device.uuid, sex: info.sex, age: info.age, cyclingExperience: info.cyclingExperience})
      .then(function successCallback(response) {
        console.log(response);
      }, function errorCallback(response) {
        console.log(response);
      });*/
  }

  $scope.editInfo = function() {

    $ionicModal.fromTemplateUrl('templates/profile_options.html',
      {
        scope: $scope
      }).then(function(modal) {
        $scope.modal = modal;
        modal.show();
    });
  };
})
