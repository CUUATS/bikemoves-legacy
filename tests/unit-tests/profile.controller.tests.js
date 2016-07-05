describe('ProfileController', function() {
  var scope, controller;
  beforeEach(module('bikemoves'));


  describe("#saveSettings", function() {
    beforeEach(inject(function($rootScope, $controller, _$window_) {
      scope = $rootScope.$new();
        // window = $window;
        // window.analytics.startTrackerWithId = function(){};
      controller = $controller('profileCtrl', {
        $scope: scope
      });
    }));

    // tests start here
    it('should run save settings', function() {
      spyOn(scope, 'saveProfile').and.callThrough();
      scope.saveProfile();
      expect(scope.saveProfile).toHaveBeenCalled();
    });
  });
});
