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

.controller('mapCtrl', function($scope, $ionicLoading) {
  $scope.mapCreated = function(map) {
    $scope.map = map;
  };

  $scope.centerOnMe = function () {
    console.log("Centering");
    if (!$scope.map) {
      return;
    }

    $scope.loading = $ionicLoading.show({
      content: 'Getting current location...',
      showBackdrop: false
    });

    navigator.geolocation.getCurrentPosition(function (pos) {
      console.log('Got pos', pos);
      $scope.map.setCenter(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
      $scope.loading.hide();
    }, function (error) {
      alert('Unable to get location: ' + error.message);
    });
  };

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
