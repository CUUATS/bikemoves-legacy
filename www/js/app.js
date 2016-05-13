angular.module('bikemoves', [
  'ionic',
  'bikemoves.controllers',
  'bikemoves.services',
  'app.directives'
])

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
    templateUrl: 'templates/tabs.html',
    controller: 'AppCtrl'
  })

  .state('app.profile', {
    url: '/profile',
    views: {
      'tab-profile': {
        templateUrl: 'templates/profile.html'
      }
    }
  })

  .state('app.map', {
    url: '/map',
    views: {
      'tab-map': {
        templateUrl: 'templates/map.html',
        controller: 'MapCtrl'
      }
    }
  })

  .state('app.settings', {
    url: '/settings',
    views: {
      'tab-settings': {
        templateUrl: 'templates/settings.html',
        controller: "SettingsCtrl"
      }
    }
  })

  .state('app.previous_trips', {
    url: '/previous_trips',
    views: {
      'tab-previous-trips': {
        templateUrl: 'templates/previous_trips.html',
        controller: 'PreviousTripsCtrl'
      }
    }
  })

  .state('app.single', {
    url: '/previous_trips/:tripIndex',
    views: {
      'tab-previous-trips': {
        templateUrl: 'templates/previous_trip.html',
        controller: 'PreviousTripCtrl'
      }
    }
  })

  .state('app.privacy', {
    url: '/privacy',
    views: {
      'tab-settings': {
        templateUrl: 'templates/privacy.html'
      }
    }
  })

  .state('app.legal', {
    url: '/legal',
    views: {
      'tab-settings': {
        templateUrl: 'templates/legal.html',
        controller: 'LegalCtrl'
      }
    }
  })

  .state('app.credits', {
    url: '/credits',
    views: {
      'tab-settings': {
        templateUrl: 'templates/credits.html'
      }
    }
  });
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/app/map');
});
