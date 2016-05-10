angular.module('bikemoves.services', [])

  .service('mapService', function($http) {
    var service = this,
      DEFAULT_LOCATION = {
        latitude: 40.109403,
        longitude: -88.227203
      },
      DEFAULT_ZOOM = 16.1,
      SERVICE_ENDPOINT = 'http://utility.arcgis.com/usrsvcs/servers/c9e754f1fc35468a9392372c79452704/rest/services/CCRPC/BikeMovesBase/MapServer',
      excludedFields = ['OBJECTID', 'Shape', 'SHAPE'],
      layers = [],
      identifyLayerIds = [],
      identifyLayerNames = ['Bicycle Rack', 'Bicycle Repair and Retail', 'Bicycle Path'],
      ready = false,
      readyCount = 0,
      readyQueue = [],
      container,
      map,
      defaultCenter,
      tileOverlay,
      infoMarker,
      currentLocationMarker,
      tripPolyline,
      location2LatLng = function(location) {
        return new plugin.google.maps.LatLng(location.latitude, location.longitude);
      },
      getLayerInfo = function() {
        $http({
          method: 'GET',
          url: SERVICE_ENDPOINT,
          params: {f: 'json'}
        }).then(function(res) {
          if (res.status == 200) {
            layers = res.data.layers;
            angular.forEach(res.data.layers, function(layer, idx) {
              if (identifyLayerNames.indexOf(layer.name) != -1) {
                identifyLayerIds.push(layer.id);
              }
            });
          }
        });
      },
      getIdentifyParams = function(latLng, callback) {
        map.getVisibleRegion(function(bounds) {
          var ne = bounds.northeast,
            sw = bounds.southwest;
          callback({
            f: 'json',
            geometry: [latLng.lng, latLng.lat].join(','),
            geometryType: 'esriGeometryPoint',
            sr: 4326,
            layers: 'top:' + identifyLayerIds.join(','),
            tolerance: 10,
            mapExtent: [sw.lng, sw.lat, ne.lng, ne.lat].join(','),
            imageDisplay: [container.offsetWidth, container.offsetHeight, 96].join(','),
            returnGeometry: false
          });
        });
      },
      displayFeatureInfo = function(feature, latLng) {
        var snippetParts = [];
        angular.forEach(feature.attributes, function(value, attr) {
          if (excludedFields.indexOf(attr) == -1 && attr != feature.displayFieldName) {
            snippetParts.push(attr + ': ' + value);
          }
        });
        infoMarker.setPosition(latLng);
        infoMarker.setTitle(feature.value);
        infoMarker.setSnippet(snippetParts.join('\n'));
        infoMarker.setVisible(true);
        infoMarker.showInfoWindow();
      },
      mapClick = function(latLng) {
        if (!identifyLayerIds) return;
        getIdentifyParams(latLng, function(params) {
          $http({
            method: 'GET',
            url: SERVICE_ENDPOINT + '/identify',
            params: params
          }).then(function(res) {
            if (res.status == 200 && res.data.results.length) {
              displayFeatureInfo(res.data.results[0], latLng);
            } else {
              infoMarker.hideInfoWindow();
              infoMarker.setVisible(false);
            }
          });
        });
      },
      checkReady = function() {
        readyCount += 1;
        if (readyCount == 4) {
          // All map elements have been added. Process any deferred actions.
          ready = true;
          angular.forEach(readyQueue, function(callback, idx) {
            callback();
          });
        }
      };

    service.init = function() {
      defaultCenter = location2LatLng(DEFAULT_LOCATION);
      getLayerInfo();
      map = plugin.google.maps.Map.getMap({
        'camera': {
          'latLng': defaultCenter,
          'zoom': DEFAULT_ZOOM
        }
      });
      map.addEventListener(plugin.google.maps.event.MAP_READY, function() {
        // Tile overlay
        map.addTileOverlay({
          tileUrlFormat: "http://tiles.bikemoves.me/tiles/<zoom>/<y>/<x>.png"
        }, function(overlay) {
          tileOverlay = overlay;
          checkReady();
        });
        // Info window marker
        map.addMarker({
          position: defaultCenter,
          visible: false,
          icon: {
            url: 'www/img/transparent_marker.png',
            size: {height: 1, width: 1}
          }
        }, function(marker) {
          infoMarker = marker;
          map.on(plugin.google.maps.event.MAP_CLICK, mapClick);
          checkReady();
        });
        // Current position marker
        map.addMarker({
          position: defaultCenter,
          visible: false,
          icon: 'green'
        }, function(marker) {
          currentLocationMarker = marker;
          checkReady();
        });
        // Trip path
        map.addPolyline({
          points: [defaultCenter, defaultCenter],
          visible: false,
          geodesic: true,
          color: '#2677FF',
          width: 5
        }, function(polyline) {
          tripPolyline = polyline;
          checkReady();
        });
      });
    };
    service.onMapReady = function(callback) {
      if (ready) {
        callback();
      } else {
        readyQueue.push(callback);
      }
    };
    service.setCurrentLocation = function(location) {
      currentLocationMarker.setPosition(location2LatLng(location));
      currentLocationMarker.setVisible(true);
    };
    service.setCenter = function(location, duration) {
      if (typeof duration === 'undefined') var duration = 0;
      if (duration == 0) {
        map.setCenter(location2LatLng(location));
      } else {
        map.getCameraPosition(function(camera) {
          camera.target = location2LatLng(location);
          camera.duation = duration;
          map.animateCamera(camera);
        });
      }
    };
    service.setClickable = function(clickable) {
      map.setClickable(clickable);
    };
    service.setTripLocations = function(locations) {
      var latLngs = [];
      angular.forEach(locations, function(location, idx) {
        latLngs.push(location2LatLng(location));
      });
      tripPolyline.setPoints(latLngs);
      tripPolyline.setVisible(true);
    };
    service.zoomToTripPolyline = function() {
      if (!tripPolyline.points) return;
      map.moveCamera({
        'target': new plugin.google.maps.LatLngBounds(tripPolyline.points)
      });
    };
    service.resetMap = function(mapType) {
      var containerId = (mapType == 'current') ? 'current-map' : 'previous-map';
      container = document.getElementById(containerId);
      map.setDiv(container);
      if (infoMarker) infoMarker.setVisible(false);
      if (currentLocationMarker) currentLocationMarker.setVisible(false);
      if (tripPolyline) tripPolyline.setVisible(false);
    };
  })

  .service('storageService', function() {
    var service = this,
      KEY_PREFIX = 'bikemoves:';

    service.get = function(key, defaultValue) {
      var value = window.localStorage.getItem(KEY_PREFIX + key);
      return (value === null) ? defaultValue : JSON.parse(value);
    };

    service.set = function(key, value) {
      window.localStorage[KEY_PREFIX + key] = JSON.stringify(value);
    };
  })

  .service('settingsService', function(storageService) {
    var service = this,
      SETTINGS_KEY = 'settings',
      DEFAULT_SETTINGS = {
        autoSubmit: true
      },
      settings = storageService.get(SETTINGS_KEY, DEFAULT_SETTINGS);

    service.getSettings = function() {
      return angular.copy(settings);
    };

    service.updateSettings = function(newSettings) {
      angular.merge(settings, newSettings);
      storageService.set(SETTINGS_KEY, settings);
    };

    service.clearAll = function() {
      settings = angular.copy(DEFAULT_SETTINGS);
      storageService.set(SETTINGS_KEY, settings);
    };
  })

  .service('tripService', function(storageService) {
    var service = this,
      TRIPS_KEY = 'trips',
      CURRENT_TRIP_KEY = 'currenttrip',
      DISTANCE_KEY = 'totaldistance',
      NEAR_THESHOLD = 500, // Maximum distance for location guesses, in meters
      getDistance = function(loc1, loc2) {
        var R = 6371000, // Radius of the earth in meters
          dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180, // deg2rad below
          dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180,
          a = 0.5 - Math.cos(dLat) / 2 +
            Math.cos(loc1.latitude * Math.PI / 180) *
            Math.cos(loc2.latitude * Math.PI / 180) *
            (1 - Math.cos(dLon)) / 2;

        return R * 2 * Math.asin(Math.sqrt(a));
      },
      getTripDistance = function(trip) {
        var locationCount = trip.locations.length,
          distance = 0;
        for (var i = 1; i < locationCount; i++) {
          distance += getDistance(
            trip.locations[i], trip.locations[i - 1]);
        }
        return distance;
      },
      newTrip = function() {
        return {
          destination: null,
          distance: 0,
          endTime: null,
          locations: [],
          origin: null,
          startTime: null,
          submitted: false
        };
      },
      trips = storageService.get(TRIPS_KEY, []),
      distance = storageService.get(DISTANCE_KEY, 0),
      currentTrip = storageService.get(CURRENT_TRIP_KEY, newTrip()),
      getPreviousLocation = function() {
        return currentTrip.locations[currentTrip.locations.length - 1];
      };

    service.getTrip = function () {
      return currentTrip;
    };
    service.getCurrentDistance = function() {
      return currentTrip.distance;
    };
    service.evaluateLocation = function(location) {
      // Determine whether the current location should:
      // -1: Be discarded
      //  0: Replace the current location
      //  1: Be added
      if (currentTrip.locations.length == 0) return 1;
      var prev = getPreviousLocation(),
        dist = getDistance(getPreviousLocation(), location);
      if (dist > prev.accuracy && dist > location.accuracy) return 1;
      if (location.accuracy < prev.accuracy) return 0;
      return -1;
    };
    service.replaceLocation = function(location) {
      currentTrip.locations[currentTrip.locations.length - 1] = location;
      currentTrip.distance += getTripDistance(currentTrip);
      storageService.set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.addLocation = function(location) {
      currentTrip.locations.push(location);
      currentTrip.distance += getTripDistance(currentTrip);
      storageService.set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.setStartTime = function(timestamp) {
      if (!angular.isDefined(timestamp)) var timestamp = (new Date()).getTime();
      currentTrip.startTime = timestamp;
      storageService.set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.setEndTime = function(timestamp) {
      if (!angular.isDefined(timestamp)) var timestamp = (new Date()).getTime();
      currentTrip.endTime = timestamp;
      storageService.set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.saveTrip = function(submitted) {
      currentTrip.submitted = submitted;
      trips.unshift(currentTrip);
      distance += currentTrip.distance;
      storageService.set(TRIPS_KEY, trips);
      storageService.set(DISTANCE_KEY, distance);
    };
    service.resetTrip = function() {
      currentTrip = newTrip();
      storageService.set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.getTrips = function() {
      return trips;
    };
    service.getTripByIndex = function(idx) {
      return trips[idx];
    };
    service.getTotalDistance = function() {
      return distance;
    };
    service.guessLocationType = function(location) {
      var location_type,
        min_distance = NEAR_THESHOLD;

      angular.forEach(trips, function(trip, idx) {
        var origin = trip.locations[0],
          destination = trip.locations[trip.locations.length - 1],
          originDistance = getDistance(location, origin),
          destinationDistance = getDistance(location, origin);
        if (originDistance < min_distance) {
          location_type = trip.origin;
          min_distance = originDistance;
        }
        if (destinationDistance < min_distance) {
          location_type = trip.destination;
          min_distance = destinationDistance;
        }
      });
      return location_type;
    };
    service.clearAll = function() {
      trips = [];
      distance = 0;
      storageService.set(TRIPS_KEY, trips);
      storageService.set(DISTANCE_KEY, distance);
    };
  })

  .factory('devLogService', function() {
    var service = {}

    service.get = function() {
      return JSON.parse(window.localStorage['devLog'])
    }

    service.push = function(item) {
      var log = JSON.parse(window.localStorage['devLog'])
      var currentDate = new Date();
      log.unshift({data: item, time: currentDate})
      window.localStorage['devLog'] = JSON.stringify(log)
    }

    return service;
  });
