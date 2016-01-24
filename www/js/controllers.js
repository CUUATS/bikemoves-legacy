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

.controller('PreviousTripsCtrl', function($scope, $ionicActionSheet) {

  $scope.onItemDelete = function(item) {
    $ionicActionSheet.show({
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
         // add cancel code..
      },
      destructiveButtonClicked: function(index) {
        $scope.trips.splice($scope.trips.indexOf(item), 1);
        window.localStorage['trips'] = JSON.stringify($scope.trips);
        return true;
      }
    });
  };

  if(window.localStorage.getItem("trips") !== undefined) {
    var sampleTrips = [
      { title: 'Trip 1', id: 1 },
      { title: 'Trip 2', id: 2 },
      { title: 'Trip 3', id: 3 },
      { title: 'Trip 4', id: 4 },
      { title: 'Trip 5', id: 5 },
      { title: 'Trip 6', id: 6 }
    ];
    window.localStorage['trips'] = JSON.stringify(sampleTrips);
  }
  $scope.trips = JSON.parse(window.localStorage.getItem("trips"));
})

.controller('mapCtrl', function($scope, $ionicLoading, $http) {
  $scope.mapCreated = function(map) {
    $scope.map = map;

    // Get a reference to the plugin.
    var bgGeo = window.BackgroundGeolocation;

    /**
    * This callback will be executed every time a geolocation is recorded in the background.
    */
    var callbackFn = function(location, taskId) {
        var coords = location.coords;
        var lat    = coords.latitude;
        var lng    = coords.longitude;

        $scope.map.setCenter(new google.maps.LatLng(lat, lng));

        // Simulate doing some extra work with a bogus setTimeout.  This could perhaps be an Ajax request to your server.
        // The point here is that you must execute bgGeo.finish after all asynchronous operations within the callback are complete.
        setTimeout(function() {
          bgGeo.finish(taskId); // <-- execute #finish when your work in callbackFn is complete
        }, 1000);
    };

    var failureFn = function(error) {
        console.log('BackgroundGeoLocation error');
    }

    // BackgroundGeoLocation is highly configurable.
    bgGeo.configure(callbackFn, failureFn, {
        // Geolocation config
        desiredAccuracy: 0,
        stationaryRadius: 50,
        distanceFilter: 50,
        disableElasticity: false, // <-- [iOS] Default is 'false'.  Set true to disable speed-based distanceFilter elasticity
        locationUpdateInterval: 5000,
        minimumActivityRecognitionConfidence: 80,   // 0-100%.  Minimum activity-confidence for a state-change 
        fastestLocationUpdateInterval: 5000,
        activityRecognitionInterval: 10000,
        stopDetectionDelay: 1,  // Wait x minutes to engage stop-detection system
        stopTimeout: 2,  // Wait x miutes to turn off location system after stop-detection
        activityType: 'AutomotiveNavigation',

        // Application config
        debug: true, // <-- enable this hear sounds for background-geolocation life-cycle.
        forceReloadOnLocationChange: false,  // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a new location is recorded (WARNING: possibly distruptive to user) 
        forceReloadOnMotionChange: false,    // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when device changes stationary-state (stationary->moving or vice-versa) --WARNING: possibly distruptive to user) 
        forceReloadOnGeofence: false,        // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a geofence crossing occurs --WARNING: possibly distruptive to user) 
        stopOnTerminate: false,              // <-- [Android] Allow the background-service to run headless when user closes the app.
        startOnBoot: true,                   // <-- [Android] Auto start background-service in headless mode when device is powered-up.

        // HTTP / SQLite config
        url: 'http://posttestserver.com/post.php?dir=cordova-background-geolocation',
        method: 'POST',
        batchSync: true,       // <-- [Default: false] Set true to sync locations to server in a single HTTP request.
        autoSync: true,         // <-- [Default: true] Set true to sync each location to server as it arrives.
        maxDaysToPersist: 1,    // <-- Maximum days to persist a location in plugin's SQLite database when HTTP fails
        headers: {
            "X-FOO": "bar"
        },
        params: {
            "auth_token": "maybe_your_server_authenticates_via_token_YES?"
        }
    });

    // Turn ON the background-geolocation system.  The user will be tracked whenever they suspend the app.
    bgGeo.start();

    // If you wish to turn OFF background-tracking, call the #stop method.
    // bgGeo.stop()

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

    $http.get('bikeracks.json')
      .success(function(data) {
        for (var i = 0; i < data.features.length; i++) {
            var coords = data.features[i].geometry.coordinates;
            var properties = data.features[i].properties;

            var covered = false;

            if (properties.Covered) covered = true;

            var marker = new google.maps.Marker({
              position: {lat : coords[1], lng: coords[0]},
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

    $http.get('bikepaths.json')
      .success(function(data) {
        for (var i = 0; i < data.features.length; i++) {
            var coords = data.features[i].geometry.coordinates;
            var properties = data.features[i].properties;

            var path = [];

            for (var j = 0; j < coords.length; j++) {
              path.push({lat: coords[j][1], lng: coords[j][0]});
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

  // $scope.centerOnMe = function () {
    
  //   if (!$scope.map) {
  //     return;
  //   }

  //   $scope.loading = $ionicLoading.show({
  //     content: 'Getting current location...',
  //     showBackdrop: false
  //   });

  //   navigator.geolocation.getCurrentPosition(function (pos) {
      
  //     $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
  //     $scope.loading.hide();
  //   }, function (error) {
  //     alert('Unable to get location: ' + error.message);
  //   });
  // };

  $scope.toggleMarkers = function() {
    for (var i=0; i < $scope.markers.length; i++){
      $scope.markers[i].setMap($scope.markersVisible ? null : $scope.map);
    }
    $scope.markersVisible = ! $scope.markersVisible;
  }
})

.controller('SavedLocationsCtrl', function($scope, $ionicActionSheet) {

  $scope.onItemDelete = function(item) {
    $ionicActionSheet.show({
      destructiveText: 'Delete',
      cancelText: 'Cancel',
      cancel: function() {
         // add cancel code..
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

.controller('SettingsCtrl', function($scope) {
  if (window.localStorage.getItem("dataSubmission") == undefined) {
    window.localStorage['dataSubmission'] = "true";
  }
  $scope.dataSubmission = { checked: JSON.parse(window.localStorage['dataSubmission'])};
  $scope.dataSubmissionChange = function() {
    window.localStorage['dataSubmission'] = JSON.stringify($scope.dataSubmission.checked);
  };
})
