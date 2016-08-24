describe('Legal Controller Test', function() {
  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    $controller('LegalCtrl', {
      $scope: scope
    });
  }));
  describe("On Load", function(){
    it("should get Legal Text", function(){
      genPromise.resolve("SomeText");
      scope.$digest();
      expect(scope.googleText).toBeDefined();
    });
  });
});
