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
  window.$ionicPlatform = {
    ready: function() {
      return $q.resolve();
    }
  };
  window.ready = true;
  genPromise = $q.defer();
}));
