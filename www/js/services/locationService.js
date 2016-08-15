angular.module('bikemoves')
	.service('locationService', function($q, $cordovaGeolocation) {
		var service = this;

		service.STATUS_STOPPED = 'stopped';
		service.STATUS_RECORDING = 'recording';
		service.STATUS_PAUSED = 'paused';

		var ACCURACY_SETTINGS = [
				{
					desiredAccuracy: 0,
					timeout: 30000,
					maximumAge: 5000,
					enableHighAccuracy: true
				},
				{
					desiredAccuracy: 1,
					timeout: 60000,
					maximumAge: 10000,
					enableHighAccuracy: true
				},
				{
					desiredAccuracy: 2,
					timeout: 120000,
					maximumAge: 20000,
					enableHighAccuracy: false
				}
			],
			CURRENT_POSITION_SETTINGS = {
				timeout: 10000,
				maximumAge: 0,
				enableHighAccuracy: true
			},
			status = service.STATUS_STOPPED,
			accuracyLevel = 0,
			locationHandler = angular.noop,
			watchID = null,
			makeLocation = function(position) {
				return {
					time: position.timestamp,
					accuracy: position.coords.accuracy,
					altitude: position.coords.altitude,
					heading: position.coords.heading,
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					speed: position.coords.speed,
					paused: status == service.STATUS_PAUSED
				};
			};

		service.getSettings = function() {
			return ACCURACY_SETTINGS[accuracyLevel];
		};
		service.setAccuracy = function(level) {
			console.log('Setting accuracy', level);
			accuracyLevel = level;
		};
		service.onLocation = function(handler) {
			locationHandler = handler;
		};
		service.getCurrentPosition = function() {
			console.log('Requesting current position');
			$cordovaGeolocation.getCurrentPosition(
				CURRENT_POSITION_SETTINGS).then(function(position) {
					console.log('Got current position');
					locationHandler(makeLocation(position));
				}).catch(function(e) {
					console.log('Get current position failed');
					console.log(e);
				});
		};
		service.setStatus = function(newStatus) {
			status = newStatus;
			if (status != service.STATUS_STOPPED) {
				if (!watchID) {
					console.log('Setting new watch');
					watchID = $cordovaGeolocation.watchPosition(service.getSettings());
					watchID.then(function(position) {
						console.log('Got watch position');
						locationHandler(makeLocation(position));
					}).catch(function(e) {
						console.log('Watch position failed');
						console.log(e);
					});
				}
			} else if (watchID) {
				$cordovaGeolocation.clearWatch(watchID);
			}
		};
		service.getStatus = function() {
			return status;
		};
	});
