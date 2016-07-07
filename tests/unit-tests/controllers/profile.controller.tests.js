describe('Profile Controller Test', function() {
  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    $controller('profileCtrl', {
      $scope: scope
    });
  }));
  describe("Save Settings", function() {
    beforeEach(function(){
      scope.dirty = true;
      scope.saveProfile();
    });
    it('should run save settings', function() {
      expect(profileServiceMock.updateProfile).toHaveBeenCalled();
      });
    it('should set dirty to false', function(){
        expect(scope.dirty).toBeFalsy();
    });
    it('should trigger analytics', function(){
      expect(analyticsServiceMock.trackEvent).toHaveBeenCalledWith("Profile", "Saved");
    });
  });
  describe("On load",function(){
    beforeEach(function(){
      scope.$emit("$ionicView.enter");
      scope.$digest();
    });
    it("should get profile", function(){
      expect(profileServiceMock.getProfile).toHaveBeenCalled();
    });
    it("should get total distance", function(){
      expect(tripServiceMock.getTotalDistance).toHaveBeenCalled();
    });
    it("should set distance and ghg", function(){
      genPromise.resolve(10000900.232);
      scope.$digest();
      expect(scope.distance).toBeGreaterThan(1);
      expect(scope.ghg).toBeGreaterThan(1);
    });
  });
  describe("On exit", function(){
    it("should block if dirty", function(){
        scope.dirty = true;
        scope.$emit("$ionicView.beforeLeave");
        scope.$digest();
        expect(ionicPopupMock.confirm).toHaveBeenCalled();
    });
    it("should do nothing if clean", function(){
      scope.dirty = false;
      scope.$emit("$ionicView.beforeLeave");
      scope.$digest();
      expect(ionicPopupMock.confirm).not.toHaveBeenCalled();
    });
  });
});
