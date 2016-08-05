angular.module('bikemoves')
	.service('locationService', function($q, $ionicPlatform) {
		var service = this,
			BG_DEFAULT_SETTINGS = {
				activityType: 'OtherNavigation', // iOS activity type
				autoSync: false, // Do not automatically post to the server
				debug: false, // Disable debug notifications
				desiredAccuracy: 0, // Overridden by settings.
				distanceFilter: 20, // Generate update events every 20 meters
				disableElasticity: true, // Do not auto-adjust distanceFilter
				fastestLocationUpdateInterval: 1000, // Prevent updates more than once per second (Android)
				locationUpdateInterval: 5000, // Request updates every 5 seconds (Android)
				startOnBoot: false, // Do not start tracking on device boot
				stationaryRadius: 20, // Activate the GPS after 20 meters (iOS)
				stopOnTerminate: true, // Stop geolocation tracking on app exit
				stopTimeout: 3 // Keep tracking for 3 minutes while stationary
			},
			bgGeo,
			ready = false,
			readyQueue = [],
			geoSettings = angular.copy(BG_DEFAULT_SETTINGS),
			initPlugin = function() {
				return $q(function(resolve, reject) {
					if (ready) {
						resolve();
					} else {
						readyQueue.push(resolve);
					}
				});
			},
			getState = function() {
				return $q(function(resolve, reject) {
					bgGeo.getState(resolve, reject);
				});
			},
			doGeoTask = function(fn, options) {
				var task;
				return initPlugin().then(function() {
					return $q(function(resolve, reject) {
						bgGeo[fn](function(e, taskId) {
							task = taskId;
							resolve(e);
						}, function(e, taskId) {
							task = taskId;
							reject(e);
						}, options);
					}).finally(function() {
						bgGeo.finish(task);
					});
				});
			},
			setGeolocationEnabled = function(on) {
				return initPlugin().then(getState).then(function(state) {
						return $q(function(resolve, reject) {
							if (state.enabled === on) {
								resolve();
							} else if (on) {
								bgGeo.start(resolve);
							} else {
								bgGeo.stop(resolve);
							}
						});
					},
					setMoving = function(moving) {
						return initPlugin().then(getState).then(function(state) {
							return $q(function(resolve, reject) {
								if (angular.isDefined(state.isMoving) === moving) {
									resolve();
								} else {
									bgGeo.changePace(moving, resolve, reject);
								}
							});
						});
					});
			},
			makeLocation = function(e) {
				return angular.merge({
					moving: e.is_moving,
					time: e.timestamp.getTime()
				}, e.coords);
			};

		service.STATUS_STOPPED = 'stopped';
		service.STATUS_RECORDING = 'recording';
		service.STATUS_PAUSED = 'paused';

		service.getSettings = function() {
			return geoSettings;
		};

		service.updateSettings = function(newSettings) {
			return initPlugin().then(function() {
				angular.merge(geoSettings, newSettings);
				bgGeo.setConfig(geoSettings);
			});
		};
		service.getLocations = function() {
			return initPlugin().then(function() {
				return doGeoTask('getLocations').then(function(events) {
					return events.map(makeLocation);
				});
			});
		};
		service.onLocation = function(locationHandler) {
			return initPlugin().then(function() {
				bgGeo.onMotionChange(function(isMoving, loc, taskId) {
					console.log("Motion State Changed to:", isMoving);
					bgGeo.finish(taskId);
				});
				bgGeo.onLocation(function(e, taskId) {
					locationHandler(makeLocation(e));
					bgGeo.finish(taskId);
				});
			});
		};
		service.getCurrentPosition = function(options) {
			return doGeoTask('getCurrentPosition', options).then(function(position) {
				return makeLocation(position);
			});
		};
		service.clearDatabase = function() {
			return initPlugin().then(function() {
				return $q(function(resolve, reject) {
					bgGeo.clearDatabase(resolve, reject);
				});
			});
		};
		service.setStatus = function(status) {
			var enabled = status != service.STATUS_STOPPED;
			return setGeolocationEnabled(enabled).then(function() {
				if (enabled) return setMoving(status == service.STATUS_RECORDING);
			});
		};
		service.getStatus = function() {
			return initPlugin().then(getState).then(function(state) {
				return (state.enabled) ? (
						(state.isMoving) ? service.STATUS_RECORDING : service.STATUS_PAUSED) :
					service.STATUS_STOPPED;
			});
		};

		$ionicPlatform.ready(function() {
			bgGeo = window.BackgroundGeolocation;
			bgGeo.configure(geoSettings, function() {
				ready = true;
				angular.forEach(readyQueue, function(callback) {
					callback();
				});
			});
		});
	});
