angular.module('bikemoves')
  .service('mapService', function($rootScope) {
    var service = this,
      dispatchMapLoad = function() {
        $rootScope.$broadcast('map.load');
      },
      map = new Map('map', {
        interactive: true,
        onLoad: dispatchMapLoad
      });

    service.getMap = function() {
      return map;
    };

  });
