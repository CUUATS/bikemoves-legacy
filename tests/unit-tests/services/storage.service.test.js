describe("Storage Service Test", function() {
  var service, storageService, q;
  beforeEach(inject(function(tripService, _storageService_) {
    service = tripService;
    storageService = _storageService_;
  }));
  beforeEach(function(){
    storageService.initalizeDb(true);
    service.getTripsCollection().then(function(collection){
      collection.clear();
    });
    rootScope.$digest();
  });

});
