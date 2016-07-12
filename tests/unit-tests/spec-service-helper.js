beforeEach(module('bikemoves'));

beforeEach(module(function($provide, $urlRouterProvider) {
  $provide.value('$ionicTemplateCache', function() {});
  $urlRouterProvider.deferIntercept();
}));
var rootScope,
  window,
  genPromise,
  httpBackend;


beforeEach(inject(function( $window, $q, $rootScope, $httpBackend) {
  rootScope = $rootScope;
  httpBackend = $httpBackend;
  window = $window;
  window.analytics = jasmine.createSpyObj("analytics", ['startTrackerWithId', "trackEvent"]);
  window.cordova = jasmine.createSpyObj("cordova", ["plugins"]);
  window.cordova.plugins.Keyboard = {
    close: function() {}
  };
  // window.$ionicPlatform = {
  //   ready: function() {
  //     return $q.resolve();
  //   }
  // }
  // if (window.parent.cordova === undefined) {
  //  console.log("Loading cordova");
  //
  //  var elem = document.createElement("script");
  //  elem.src = "http://localhost:9876/absolute/Users/bikeapp/bikemoves/www/lib/ngCordova/dist/ng-cordova.js";
  //  window.parent.document.head.appendChild(elem);
  //  window.cordova = window.parent.cordova;
  //  window.analytics = window.parent.analytics;

 // }
  window.plugin = new plugin.google.map
  genPromise = $q.defer()
}));
