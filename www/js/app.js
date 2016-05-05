// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services', 'app.directives'])

.run(function($ionicPlatform, mapService) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
    if (window.cordova.plugins.locationAccuracy) {
      // Request high accuracy geolocation on Android.
      cordova.plugins.locationAccuracy.request(
        angular.noop,
        angular.noop,
        cordova.plugins.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY
      );
    }

    if(window.localStorage['devLog'] === undefined) {
      window.localStorage['devLog'] = JSON.stringify(new Array())
    }

    mapService.init();
  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl'
  })


  .state('app.profile', {
    url: '/profile',
    views: {
      'menuContent': {
        templateUrl: 'templates/profile.html'
      }
    }
  })

  .state('app.map', {
    url: '/map',
    views: {
      'menuContent': {
        templateUrl: 'templates/map.html',
        controller: 'MapCtrl'
      }
    }
  })

  .state('app.settings', {
    url: '/settings',
    views: {
      'menuContent': {
        templateUrl: 'templates/settings.html',
        controller: "SettingsCtrl"
      }
    }
  })

  .state('app.saved_locations', {
    url: '/settings/saved_locations',
    views: {
      'menuContent': {
        templateUrl: 'templates/saved_locations.html',
        controller: 'SavedLocationsCtrl'
      }
    }
  })

  .state('app.previous_trips', {
    cache: false,
    url: '/previous_trips',
    views: {
      'menuContent': {
        templateUrl: 'templates/previous_trips.html',
        controller: 'PreviousTripsCtrl'
      }
    }
  })

  .state('app.single', {
    url: '/previous_trips/:previousTripID',
    views: {
      'menuContent': {
        templateUrl: 'templates/previous_trip.html',
        controller: 'PreviousTripCtrl'
      }
    }
  })

  .state('app.devlog', {
    url: '/devlog',
    views: {
      'menuContent': {
        templateUrl: 'templates/dev_log.html',
        controller: 'DevLogCtrl'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/map');
});
