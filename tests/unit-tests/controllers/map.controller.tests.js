describe('Map Controller Test', function() {
  beforeEach(inject(function($rootScope, $controller, $q) {
    scope = $rootScope.$new();
    confirm = $q.defer();
    $controller('SettingsCtrl', {
      $scope: scope
    });
  }));
