angular.module('bikemoves')
	.service('mapService', function($http, $q, $ionicPlatform, incidentService, $rootScope) {
		var service = this,
			DEFAULT_LOCATION = [-88.227203, 40.109403],
			DEFAULT_ZOOM = 16,
			MAP_STYLE = 'http://tileserver.bikemoves.me/styles/bikemoves.json',
			POPUP_FIELDS = [
				{name: 'path_type', label: 'Path Type'},
				{name:'rack_type', label: 'Rack Type'},
				{name:'is_covered', label: 'Covered'},
				{name:'location', label: 'Location'},
				{name:'phone', label: 'Phone'}
			],
			excludedFields = ['OBJECTID', 'Shape', 'SHAPE'],
			container,
			map;
		service.isReporting = false;
		service.currentLocation = null;

		service.location2LatLng = function(location) {
			// return new plugin.google.maps.LatLng(location.latitude, location.longitude);
		};
		var mapClick = function(e) {
				var features = map.queryRenderedFeatures(e.point, {
					layers: [
						'bikemoves_bike_rack',
						'bikemoves_bike_repair_retail',
						'bikemoves_bike_path'
					]
				});

				if (!features.length) return;

				var feature = features[0],
					popupPoint = snapToFeature(feature, e.lngLat),
					popupContent = getPopupContent(feature);

				var popup = new mapboxgl.Popup()
	        .setLngLat(popupPoint)
	        .setHTML(popupContent)
	        .addTo(map);

				map.flyTo({
					center: popupPoint
				});
			},
			snapToFeature = function(feature, lngLat) {
				if (feature.geometry.type == 'Point') {
					return feature.geometry.coordinates;
				} else if (feature.geometry.type == 'LineString') {
					var nearest = turf.pointOnLine(
						feature, turf.point([lngLat.lng, lngLat.lat]));
					return nearest.geometry.coordinates;
				}
				return lngLat;
			},
			getPopupContent = function(feature) {
				var props = feature.properties,
					headline = (feature.layer.id == 'bikemoves_bike_rack') ?
					'Bike Rack' : props.name;
				var content = '<h2>' + headline + '</h2>';
				angular.forEach(POPUP_FIELDS, function(field) {
					if (field.name in props && props[field.name]) {
						content += '<p class="feature-field"><strong class="field-name">' +
							field.label + ':</strong> <span class="field-value">' +
							props[field.name] + '</span></p>';
					}
				});
				return content;
			}
			createMap = function() {
				map = new mapboxgl.Map({
				    container: 'current-map',
				    style: MAP_STYLE,
						zoom: DEFAULT_ZOOM,
						center: DEFAULT_LOCATION
				});
				new mapboxgl.Navigation().addTo(map);
				map.on('click', mapClick);
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
