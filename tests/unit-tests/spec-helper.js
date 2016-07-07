beforeEach(module('bikemoves'));

beforeEach(module(function($provide, $urlRouterProvider) {
  $provide.value('$ionicTemplateCache', function() {});
  $urlRouterProvider.deferIntercept();
}));
var $httpBackend;

beforeEach(inject(function($injector) {
  $httpBackend = $injector.get('$httpBackend');
  $httpBackend.whenGET('templates/trip_form.html').respond(200, '');
  $httpBackend.whenGET('templates/incident_form.html').respond(200, '');

}));
var analyticsServiceMock,
  incidentServiceMock,
  locationServiceMock,
  mapServiceMock,
  profileServiceMock,
  remoteServiceMock,
  settingsServiceMock,
  storageServiceMock,
  tripServiceMock,
  tripMock,
  ionicPopupMock,
  incidentMock,
  scope,
  genPromise,
  tripSubmitModalMock,
  incidentReportModalMock,
  // window,
  confirm;

beforeEach(inject(function($window, $q, $ionicPopup, analyticsService, incidentService, locationService, mapService, profileService, remoteService, settingsService, storageService, tripService) {
  analyticsServiceMock = analyticsService;
  incidentServiceMock = incidentService;
  locationServiceMock = locationService;
  mapServiceMock = mapService;
  profileServiceMock = profileService;
  remoteServiceMock = remoteService;
  settingsServiceMock = settingsService;
  storageServiceMock = storageService;
  tripServiceMock = tripService;
  ionicPopupMock = $ionicPopup;
  tripSubmitModal = jasmine.createSpyObj("tripSubmitModal", ["show", "hide", "remove"]);
  incidentReportModal = jasmine.createSpyObj("incidentReportModal", ["show", "hide", "remove"]);

  window = $window;
  window.analytics = jasmine.createSpyObj("analytics", ['startTrackerWithId']);
  window.cordova = jasmine.createSpyObj("cordova", ["plugins"]);
  window.cordova.plugins.Keyboard = {
    close: function(){}
  };
  genPromise = $q.defer();

  spyOn(analyticsServiceMock, "trackEvent").and.callThrough();
  spyOn(analyticsServiceMock, "trackView").and.callThrough();



  spyOn(incidentServiceMock, "saveIncident");
  spyOn(incidentServiceMock, "postUnposted").and.callThrough();
  spyOn(incidentServiceMock, "getAddress").and.callFake(function(){
    return genPromise.promise;
  });

  spyOn(locationServiceMock, "clearDatabase").and.callThrough();
  spyOn(locationServiceMock, "getCurrentPosition").and.callThrough();

  spyOn(mapServiceMock, "setClickable").and.callThrough();
  spyOn(mapServiceMock, "removeIncident");
  spyOn(mapServiceMock, "resetMap").and.callThrough();
  spyOn(mapServiceMock, "setMapState").and.callThrough();
  spyOn(mapServiceMock, "getLegalText").and.callFake(function(){
    return genPromise.promise;
  });


  spyOn(profileServiceMock, "clearAll").and.callThrough();
  spyOn(profileServiceMock, "updateProfile").and.callThrough();
  spyOn(profileServiceMock, "getProfile").and.callThrough();

  spyOn(remoteServiceMock, "postTrip").and.callFake(function(){
    return genPromise.promise;
  });

  spyOn(settingsServiceMock, "updateSettings").and.callThrough()
  spyOn(settingsServiceMock, "clearAll").and.callThrough()
  spyOn(settingsServiceMock, "getSettings").and.callThrough()


  spyOn(tripServiceMock, "clearAll").and.callThrough();
  spyOn(tripServiceMock, "saveTrip").and.callThrough();


  spyOn(tripServiceMock, "getTrip").and.callFake(function() {
    return genPromise.promise;
  });
  spyOn(tripServiceMock, "getTrips").and.callFake(function() {
    return genPromise.promise;
  });
  spyOn(tripServiceMock, "deleteTrip").and.callThrough();
  spyOn(tripServiceMock, "getTotalDistance").and.callFake(function() {
    return genPromise.promise;
  });

  spyOn(ionicPopupMock, 'alert').and.callThrough();

  spyOn(ionicPopupMock, "confirm").and.callFake(function() {
    return confirm.promise;
  });
}));
