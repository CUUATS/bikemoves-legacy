angular.module("bikemoves")
  .service("smootherService", ["filterService", function(filterService) {
    var service = this;

    service.positionFilter = function(points, min, max) {
      return filterService.positionFilter(points, min, max);
    };
    service.velocityFilter = function(points, min, max) {
      return filterService.velocityFilter(points, min, max);
    };
    service.accelerationFilter = function(points, min, max) {
      return filterService.accelerationFilter(points, min, max);
    };
    service.removeSpikes = function(points, threshold, iterations) {
      return filterService.removeSpikes(points, threshold);
    };
    service.smoothLine = function(points, threshold, iterations) {
      return filterService.smoothLine(points, threshold);
    };
    service.standardFilter = function(points) {
      if (points.length > 3) {
        var firstPass = service.removeSpikes(points, 160, 5);
        var secondPass = service.smoothLine(firstPass, 20,5);
        var thirdPass = service.removeSpikes(points,140,3);
        return thirdPass;
      }
      return points;
    };
  }]);
