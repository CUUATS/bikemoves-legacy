describe('Settings Controller Test', function() {
  beforeEach(inject(function($rootScope, $controller, $q) {
    scope = $rootScope.$new();
    confirm = $q.defer();
    $controller('SettingsCtrl', {
      $scope: scope
    });
  }));
  describe('Update Settings', function() {
    beforeEach(function() {
      scope.updateSettings();
    })
    it("should make analytics call", function() {
      expect(analyticsServiceMock.trackEvent).toHaveBeenCalledWith("Settings", "Updated");
    });
    it("should call settings update service", function() {
      expect(settingsServiceMock.updateSettings).toHaveBeenCalled();
    });
  });
  describe('Reset Data', function() {
    beforeEach(function() {
      scope.reset();
    });
    it("shoud open a popup", function() {
      expect(ionicPopupMock.confirm).toHaveBeenCalled();
    });
    it("on reject does nothing", function() {
      confirm.resolve(false);
      scope.$digest();
      expect(settingsServiceMock.clearAll).not.toHaveBeenCalled();
    });
    it("on success calls full reset", function() {
      confirm.resolve(true);
      scope.$digest();
      expect(profileServiceMock.clearAll).toHaveBeenCalled();
      expect(settingsServiceMock.clearAll).toHaveBeenCalled();
      expect(tripServiceMock.clearAll).toHaveBeenCalled();
    });
  });
});
