beforeEach(module('bikemoves'));

beforeEach(module(function($provide, $urlRouterProvider) {
    $provide.value('$ionicTemplateCache', function(){} );
    $urlRouterProvider.deferIntercept();
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
  window,
  confirm;

beforeEach(inject(function($window, $q, $ionicPopup, analyticsService, incidentService, locationService, mapService, profileService, remoteService, settingsService, storageService, tripService){
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
  window = $window;
  window.analytics = jasmine.createSpyObj("analytics", ['startTrackerWithId'])
  window.cordova = jasmine.createSpyObj("cordavoa", ["plugins"])
  genPromise = $q.defer()

  spyOn(analyticsServiceMock, "trackEvent").and.callThrough();

  spyOn(profileServiceMock, "clearAll").and.callThrough();
  spyOn(profileServiceMock, "updateProfile").and.callThrough();
  spyOn(profileServiceMock, "getProfile").and.callThrough();


  spyOn(settingsServiceMock, "updateSettings").and.callThrough()
  spyOn(settingsServiceMock, "clearAll").and.callThrough()

  spyOn(tripServiceMock, "clearAll").and.callThrough();


  spyOn(tripServiceMock, "getTrip").and.callFake(function(){
    return genPromise.promise;
  });
  spyOn(tripServiceMock, "getTrips").and.callFake(function(){
    return genPromise.promise;
  });
  spyOn(tripServiceMock, "deleteTrip").and.callThrough();
  spyOn(tripServiceMock, "getTotalDistance").and.callFake(function(){
    return genPromise.promise;
  });



  spyOn(ionicPopupMock, "confirm").and.callFake(function(){
    return confirm.promise;
  })
}));
