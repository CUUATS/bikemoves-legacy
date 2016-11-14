angular.module('bikemoves')
  .service('mapService', function($rootScope) {
    var service = this,
      dispatchMapLoad = function() {
        $rootScope.$broadcast('map.load');
      },
      dispatchMapClick = function() {
        $rootScope.$broadcast('map.click');
      },
      map = new Map('map', {
        interactive: true,
        onLoad: dispatchMapLoad,
        onClick: dispatchMapClick
      });

    service.getMap = function() {
      return map;
    };

  });
