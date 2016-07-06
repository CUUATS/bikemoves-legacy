describe("Pervious Trips Controller Test", function() {
  beforeEach(inject(function($rootScope, $controller, $q) {
    scope = $rootScope.$new();
    $controller('PreviousTripsCtrl', {
      $scope: scope
    });
    scope.$emit('$ionicView.enter');
    scope.$digest();

  }));

  describe("Load Values", function() {
    it("should have loaded trips", function() {
      expect(tripServiceMock.getTrips).toHaveBeenCalled();
    })
    it("should have a trip", function() {
      genPromise.resolve([new Trip()]);
      scope.$digest();
      expect(scope.trips).toBeDefined();
    });
  })
})
