angular.module('bikemoves')
	.service('mapService', function($http, $q, $ionicPlatform, incidentService, $rootScope) {
		var service = this,
			DEFAULT_LOCATION = [-88.227203, 40.109403],
			DEFAULT_ZOOM = 16,
			excludedFields = ['OBJECTID', 'Shape', 'SHAPE'],
			container,
			map;
		service.isReporting = false;
		service.currentLocation = null;

		service.location2LatLng = function(location) {
			// return new plugin.google.maps.LatLng(location.latitude, location.longitude);
		};
		var mapClick = function(e) {
				// layer.scene.getFeatureAt(e.containerPoint).then(function(selection) {
				// 	if (selection.feature && selection.feature.source_name == 'bikemoves') {
				// 		map.openPopup(getPopupContent(selection.feature), e.latlng);
				// 	}
				// });
			},
			createMap = function() {
				map = new mapboxgl.Map({
				    container: 'current-map',
				    style: 'mapbox://styles/mapbox/bright-v9',
						zoom: DEFAULT_ZOOM,
						center: DEFAULT_LOCATION
				});
				map.on('load', function() {
					map.addSource('bikemoves', {
						type: 'vector',
						url: 'http://tileserver.bikemoves.me/data/bikemoves.json'
					});
					map.addLayer({
            interactive: true,
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            type: 'line',
            source: 'bikemoves',
            id: 'bikemoves_bike_path',
            paint: {
              'line-color': {
                property: 'path_type',
                type: 'categorical',
                stops: [
									['Bike Route', '#ffff66'],
									['Shared Lane Markings (sharrows)', '#ffff66'],
									['Bike Lanes (on-street)', '#ff8080'],
									['Bike Path', '#66b3ff'],
									['UIUC Bike Path', '#66b3ff'],
									['Divided Shared-Use Path', '#66b3ff'],
                  ['Shared-Use Path (sidepath)', '#66b3ff'],
									['Shared-Use Path (off-street)', '#66b3ff']
                ]
              },
              'line-width': {
                base: 1.4,
                stops: [
                  [6, 0.5],
                  [20, 30]
                ]
              }
            },
            'source-layer': 'bike_path'
	        }, 'water_label');
					map.addLayer({
						interactive: false,
						layout: {
							'line-cap': 'round',
							'line-join': 'round'
						},
						type: 'line',
						source: 'bikemoves',
						id: 'bikemoves_sidewalk',
						paint: {
							'line-color': '#aaaaaa',
							'line-width': {
								base: 1.4,
								stops: [
									[13, 0.25],
									[20, 8]
								]
							}
						},
						'source-layer': 'sidewalk'
					}, 'water_label');
				});
			};

		service.initMap = function() {
			return $q(function(resolve, reject) {
				if (ready) {
					resolve();
				} else {
					readyQueue.push(resolve);
				}
			});
		};

		service.MAP_TYPE_CURRENT = 'current';
		service.MAP_TYPE_PREVIOUS = 'previous';

		service.setCurrentLocation = function(location) {
			return service.initMap().then(function() {
				service.currentLocation = location;
				service.currentLocationMarker.setPosition(service.location2LatLng(location));
				service.currentLocationMarker.setVisible(true);
			});
		};
		service.setCenter = function(location, duration) {
      return service.initMap().then(function() {
				if (typeof duration === 'undefined') {duration = 0};
        if (duration === 0) {
					map.setCenter(service.location2LatLng(location));
				} else {
					return $q(function(resolve, reject) {
						map.getCameraPosition(function(camera) {
							camera.target = service.location2LatLng(location);
							camera.duration = duration;
							map.animateCamera(camera, resolve);
						});
					});
				}
			});
		};
		service.setClickable = function(clickable) {
			return service.initMap().then(function() {
				map.setClickable(clickable);
			});
		};
		service.setTripLineString = function(linestring) {
			return service.initMap().then(function() {
				tripPolyline.setPoints(
					linestring.geometry.coordinates.map(function(coords) {
						return new plugin.google.maps.LatLng(coords[1], coords[0]);
					}));
				tripPolyline.setVisible(linestring.geometry.coordinates.length > 1);
			});
		};
		service.zoomToTripPolyline = function() {
			return service.initMap().then(function() {
				return $q(function(resolve, reject) {
					map.moveCamera({
						'target': tripPolyline.getPoints()
					}, resolve);
				});
			});
		};
		service.resetMap = function(newMapType) {
			return service.initMap().then(function() {
				mapType = newMapType;
				var containerId = (mapType == service.MAP_TYPE_CURRENT) ?
					'current-map' : 'previous-map';
				container = document.getElementById(containerId);
				map.setDiv(container);

				// Show/hide map elements.
				if (tileOverlay)
					tileOverlay.setVisible(mapType == service.MAP_TYPE_CURRENT);
				if (infoMarker) infoMarker.setVisible(false);
				if (service.currentLocationMarker) service.currentLocationMarker.setVisible(false);
				if (tripPolyline) tripPolyline.setVisible(false);


				// Reset the camera if this is the current map.
				if (mapType == service.MAP_TYPE_CURRENT &&
					angular.isDefined(currentMapCamera)) {
					if (angular.isDefined(service.currentLocation))
						service.setCurrentLocation(service.currentLocation);
					return $q(function(resolve, reject) {
						map.moveCamera(currentMapCamera, resolve);
					});
				}
			});
		};
		service.getLegalText = function() {
			return $q(function(resolve, reject) {
				map.getLicenseInfo(resolve);
			});
		};
		service.initializeMap = function() {
			createMap();
		};
		service.setMapState = function(name) {
			service.isReporting = (name == 'report');
		};
		service.removeIncident = function() {
			return currentIncidentMarker.setVisible(false);
		};
		service.testMap = function(mapSpy) { // Only Used for Browser Testing
			map = mapSpy;
			declareMapFeatures(map.mapFeatures);
		};

		$ionicPlatform.ready().then(service.initializeMap);
	});
