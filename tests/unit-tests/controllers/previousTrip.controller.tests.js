describe("Pervious Trip Controller", function() {
  beforeEach(inject(function($rootScope, $controller, $q) {
    scope = $rootScope.$new();
    confirm = $q.defer();
    $controller('PreviousTripCtrl', {
      $scope: scope
    });
  }));

  describe("Load Values", function() {
    it("should attempt to load trip", function() {
      expect(tripServiceMock.getTrip).toHaveBeenCalled();
    });
    it("should Have a trip", function(){
      genPromise.resolve(new Trip());
      scope.$digest();
      expect(scope.submitted).toBeDefined();
    });
  });
  describe("Delete Trip", function(){
    it("should call trip delete service", function(){
      scope.deleteTrip();
      confirm.resolve(true);
      scope.$digest();
      expect(tripServiceMock.deleteTrip).toHaveBeenCalled();
    });
  });
});
