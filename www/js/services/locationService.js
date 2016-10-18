angular.module('bikemoves')
	.service('locationService', function($q, $ionicPlatform) {
		var service = this,
			geo,
			watchId,
			ready = false,
			readyQueue = [],
			initService = function() {
				return $q(function(resolve, reject) {
					if (ready) {
						resolve();
					} else {
						readyQueue.push(resolve);
					}
				});
			},
			serviceReady = function() {
				ready = true;
				angular.forEach(readyQueue, function(callback) {
					callback();
				});
			},
			makeLocation = function(e) {
				return {
					accuracy: e.coords.accuracy,
					altitude: e.coords.altitude,
					heading: e.coords.heading,
					latitude: e.coords.latitude,
					longitude: e.coords.longitude,
					speed: e.coords.speed,
					time: e.timestamp
				};
			},
			getOptions = function() {
				return {
					enableHighAccuracy: service.desiredAccuracy == 0,
					timeout: 15000,
					maximumAge: 5000
				};
			};

		service.ERROR_PERMISSION_DENIED = 1;
		service.ERROR_POSITION_UNAVAILABLE = 2;
		service.ERROR_TIMEOUT = 3;

		service.desiredAccuracy = 0;

		service.getCurrentPosition = function() {
			return initService().then(function() {
				return $q(function(resolve, reject) {
					geo.getCurrentPosition(function success(position) {
						resolve(makeLocation(position));
					}, function failure(e) {
						reject(e.code);
					}, getOptions());
				});
			});
		};

		service.watchPosition = function(success, failure) {
			return initService().then(function() {
				watchId = geo.watchPosition(function(position) {
					success(makeLocation(position));
				}, function(e) {
					failure(e.code);
				}, getOptions());
			});
		};

		service.clearWatch = function() {
			return initService().then(function() {
				return $q(function(resolve, reject) {
					if (watchId) {
						geo.clearWatch(watchId);
						watchId = null;
						resolve();
					} else {
						reject();
					}
				});
			});
		};

		$ionicPlatform.ready(function() {
			if (navigator && 'geolocation' in navigator) {
				geo = navigator.geolocation;
				serviceReady();
			}
		});
	});
