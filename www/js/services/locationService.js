angular.module('bikemoves')
	.service('locationService', function($q, $ionicPlatform) {
		var service = this,
			bgGeo,
			nativeGeo,
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
					moving: (e.hasOwnProperty('is_moving')) ? e.is_moving : null,
					speed: e.coords.speed,
					time: (e.timestamp.getTime) ? e.timestamp.getTime() : e.timestamp
				};
			};

		service.ERROR_PERMISSION_DENIED = 1;
		service.ERROR_POSITION_UNAVAILABLE = 2;
		service.ERROR_TIMEOUT = 3;

		service.desiredAccuracy = 0;

		service.getCurrentPosition = function() {
			var task;
			return initService().then(function() {
				return $q(function(resolve, reject) {
					if (bgGeo) {
						var options = {
							timeout: 10,
							maximumAge: 5000,
							desiredAccuracy: 0,
							persist: false
						};
						bgGeo.getCurrentPosition(function success(position, taskId) {
							task = taskId;
							resolve(makeLocation(position));
						}, function failure(errorCode) {
							if (errorCode == 1) reject(service.ERROR_PERMISSION_DENIED)
								else reject(service.ERROR_POSITION_UNAVAILABLE);
						}, options);
					} else if (nativeGeo) {
						var options = {
							enableHighAccuracy: service.desiredAccuracy == 0,
							timeout: 10000,
							maximumAge: 5000
						};
						nativeGeo.getCurrentPosition(function success(position) {
							resolve(makeLocation(position));
						}, function failure(e) {
							reject(e.code);
						}, options);
					}
				}).finally(function() {
					if (bgGeo && task) bgGeo.finish(task);
				});
			});
		};

		service.watchPosition = function(success, failure) {
			return initService().then(function() {
				if (bgGeo) {
					var options = {
						interval: 1000,
						desiredAccuracy: service.desiredAccuracy,
						persist: false
					};
					console.log('bgGeo - Watching position with settings: ', options);
					bgGeo.watchPosition(function(position) {
						console.log('bgGeo - Watch got position: ', position);
						if (position) success(makeLocation(position));
					}, function(errorCode) {
						console.log('Watch error: ', errorCode);
						if (errorCode == 1) failure(service.ERROR_PERMISSION_DENIED)
							else failure(service.ERROR_POSITION_UNAVAILABLE);
					}, options);
				} else if (nativeGeo) {
					var options = {
						enableHighAccuracy: true,
						timeout: 10000,
						maximumAge: 5000
					};
					console.log('nativeGeo - Watching position with settings: ', options);
					watchId = nativeGeo.watchPosition(function(position) {
						console.log('nativeGeo - Watch got position: ', position);
						success(makeLocation(position));
					}, function(e) {
						failure(e.code);
					}, options);
				}
			});
		};

		service.clearWatch = function() {
			return initService().then(function() {
				return $q(function(resolve, reject) {
					if (bgGeo) {
						bgGeo.stopWatchPosition(resolve, reject);
					} else if (nativeGeo) {
						if (watchId) {
							nativeGeo.clearWatch(watchId);
							watchId = null;
							resolve();
						} else {
							reject();
						}
					}
				});
			});
		};

		$ionicPlatform.ready(function() {
			if (window.BackgroundGeolocation) {
				bgGeo = window.BackgroundGeolocation;
				bgGeo.configure({}, serviceReady);
			} else if (navigator && 'geolocation' in navigator) {
				nativeGeo = navigator.geolocation;
				serviceReady();
			}
		});
	});
