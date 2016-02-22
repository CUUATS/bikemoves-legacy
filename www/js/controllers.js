angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };
})

.controller('mapCtrl', function($scope, $ionicLoading, $ionicModal, $http, $ionicPopup) {
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

  $scope.odometer = 0;

  // Add BackgroundGeolocation event-listeners when Platform is ready.
  ionic.Platform.ready(function() {
    BackgroundGeolocationService.onLocation($scope.centerOnMe);
    BackgroundGeolocationService.onMotionChange($scope.onMotionChange);
  });

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
      $scope.locationAccuracyMarker = new google.maps.Circle({
        zIndex: 9,
        fillColor: '#3366cc',
        fillOpacity: 0.4,
        strokeOpacity: 0,
        map: $scope.map
      });
    }

    if (!$scope.path) {
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
    
    if ($scope.previousLocation) {
      var prevLocation = $scope.previousLocation;
      // Drop a breadcrumb of where we've been.
      $scope.locationMarkers.push(new google.maps.Marker({
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
      }));
    }

    // Update our current position marker and accuracy bubble.
    $scope.currentLocationMarker.setPosition(latlng);
    $scope.locationAccuracyMarker.setCenter(latlng);
    $scope.locationAccuracyMarker.setRadius(location.coords.accuracy);

    if (location.sample === true) {
      return;
    }
    
    // Add breadcrumb to current Polyline path.
    $scope.path.getPath().push(latlng);
    $scope.previousLocation = location;

    if (plugin) {
      // Update odometer
      plugin.getOdometer(function(value) {
        $scope.$apply(function() {
          $scope.odometer = (value/1000).toFixed(1);
        });
      });
    }
  };

  /**
  * Draw red stationary-circle on google map
  */
  $scope.setStationaryMarker = function(location) {
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
  };

  /**
  * Enable BackgroundGeolocationService
  */
  $scope.onToggleEnabled = function() {
    var isEnabled = $scope.bgGeo.enabled;
    
    console.log('onToggleEnabled: ', isEnabled);
    BackgroundGeolocationService.setEnabled(isEnabled, function() {}, function(error) {
      alert('Failed to start tracking with error code: ' + error);
    });

    if (!isEnabled) {
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
  };

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
    var confirmPopup = $ionicPopup.confirm({
      title: 'Complete Route',
      template: 'Are you done recording your route?'
    });
    confirmPopup.then(function(res) {
      if(res) {
        console.log("route stopped");
        console.log($scope.locationMarkers);
        
        $scope.running = false;
        $scope.recording = false;
        $scope.startButtonIcon  = ($scope.recording) ? PAUSE_BUTTON_CLASS : PLAY_BUTTON_CLASS;
        var d = new Date();
        $scope.endTime = d.getTime();

        var trips = {};
        if(window.localStorage.getItem('trips') !== null) {
          trips = JSON.parse(window.localStorage.getItem('trips')); 
        }
        if($scope.path) {
          console.log($scope.path);
          console.log($scope.path.getPath());
          trips[$scope.startTime] = {
            title: 'Trip ' + $scope.startTime,
            id: $scope.startTime,
            points: $scope.path.getPath(),
            startTime: $scope.startTime,
            endTime: $scope.endTime
          }
          window.localStorage['trips'] = JSON.stringify(trips);
        }
        else {
          trips[$scope.startTime] = {
            title: 'Trip ' + $scope.startTime,
            id: $scope.startTime,
            points: [],
            startTime: $scope.startTime,
            endTime: $scope.endTime
          }
          window.localStorage['trips'] = JSON.stringify(trips);
        }

        $http.post("http://api.bikemoves.cuuats.org/v0.1/trip", tripData: trips[$scope.startTime]).then(
          function successCallback(response) {
            console.log(response)
          }, function errorCallback(response) {
            console.log(response)
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
 
    if ($scope.trip.points == undefined) 
    {
      var testPath = [
        {lat: 37.772, lng: -122.214},
        {lat: 21.291, lng: -157.821},
        {lat: -18.142, lng: 178.431},
        {lat: -27.467, lng: 153.027}
      ]; 
      $scope.trip.points = new google.maps.Polyline({
        zIndex: 1,
        path: testPath,
        geodesic: true,
        strokeColor: '#2677FF',
        strokeOpacity: 0.7,
        strokeWeight: 5
      });
    }

    $scope.trip.points.setMap($scope.map);
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

    $ionicActionSheet.show({
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
      },
      destructiveButtonClicked: function() {
        window.localStorage.clear();
        $ionicPopup.alert({
          title: 'Data Reset',
          content: 'All data has been reset.'
        }).then(function(res) {
          console.log('Test Alert Box');
        });
        return true;
      }
    });
  
  }
})
