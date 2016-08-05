/*jshint esversion: 6 */

angular.module("bikemoves")
	.service("smootherService", ["filterService", function(filterService) {
		var service = this,
			MIN_POINTS = 3;

		//Filters points based on distance between
		service.positionFilter = function(points, min, max) {
			return filterService.positionFilter(points, min, max);
		};
		//Filters points based on Velocity between
		service.velocityFilter = function(points, min, max) {
			return filterService.velocityFilter(points, min, max);
		};

		//Filters points based on Acceleration between
		service.accelerationFilter = function(points, min, max) {
			return filterService.accelerationFilter(points, min, max);
		};

		//Removes points that create "spikes" i.e _/\_ based on the threshold
		service.removeSpikes = function(points, threshold, iterations) {
			return filterService.removeSpikes(points, threshold, iterations);
		};
		service.smoothLine = function(points, threshold, iterations) {
			return filterService.smoothLine(points, threshold);
		};

		//The filter set used for rendering the map
		service.standardFilter = function(points) {
				if (points.length < MIN_POINTS)
					return points;
				var filters = [service.removeSpikes, service.smoothLine, service.removeSpikes];
				var params = [
					[160, 5],
					[20],
					[140, 3]
				];
				for (var i = 0; i < filters.length; i++) {
          params[i].unshift(points);
          results = filters[i].apply(service,params[i]);
					if (results.length < MIN_POINTS)
						return points;
					points = results;
				}
				return points;
			};
	}]);
