angular.module('starter.services', [])

  .service('mapService', function($http) {
    var service = this,
      DEFAULT_LOCATION = {
        latitude: 40.109403,
        longitude: -88.227203
      },
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
      container = document.getElementById('map_canvas');
      map = plugin.google.maps.Map.getMap(container, {
        'camera': {
          'latLng': defaultCenter,
          'zoom': 16.1
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
    service.resetMap = function() {

    };
  })

  .service('tripService', function() {
    var service = this;
    var TRIPS_KEY = 'bikemoves:trips',
      CURRENT_TRIP_KEY = 'bikemoves:currenttrip',
      STATUS_KEY = 'bikemoves:status',
      DISTANCE_KEY = 'bikemoves:totaldistance',
      NEAR_THESHOLD = 500, // Maximum distance for location guesses, in meters
      get = function(key, defaultValue) {
        var value = window.localStorage.getItem(key);
        return (value === null) ? defaultValue : JSON.parse(value);
      },
      set = function(key, value) {
        window.localStorage[key] = JSON.stringify(value);
      },
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
      newTrip = function() {
        return {
          origin: null,
          destination: null,
          distance: 0,
          locations: [],
          submitted: false
        };
      },
      trips = get(TRIPS_KEY, {}),
      distance = get(DISTANCE_KEY, 0),
      currentTrip = get(CURRENT_TRIP_KEY, newTrip()),
      status = get(STATUS_KEY, 'stopped'),
      getPreviousLocation = function(offset) {
        if (typeof offset === 'undefined') var offset = 0;
        return currentTrip.locations[currentTrip.locations.length - (1 + offset)];
      };

    service.getStatus = function() {
      return status;
    };
    service.setStatus = function(newStatus) {
      status = newStatus
      set(STATUS_KEY, newStatus);
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
      if (location.accuracy > prev.accuracy) return 0;
      return -1;
    };
    service.replaceLocation = function(location) {
      if (currentTrip.distance)
        currentTrip.distance -= getDistance(getPreviousLocation(), getPreviousLocation(1));
      currentTrip.locations[currentTrip.locations.length - 1] = location;
      if (currentTrip.locations.length > 0)
        currentTrip.distance += getDistance(getPreviousLocation(), getPreviousLocation(1));
      set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.addLocation = function(location) {
      if (currentTrip.locations.length > 0)
        currentTrip.distance += getDistance(getPreviousLocation(), location);
      currentTrip.locations.push(location);
      set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.countLocations = function() {
      return currentTrip.locations.length;
    };
    service.saveTrip = function(submitted) {
      currentTrip.submitted = submitted;
      trips.push(currentTrip);
      distance += trip.distance;
      set(TRIPS_KEY, trips);
      set(DISTANCE_KEY, distance);
    };
    service.resetTrip = function() {
      currentTrip = newTrip();
      set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.getTrips = function() {
      return trips;
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
