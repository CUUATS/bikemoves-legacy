<<<<<<< HEAD
angular.module('starter.services', [])

  // Load map markers
  .service('mapInfoService', function($http) {
    this.init = function(map) {
      var selectedPath;
      var markers = [];
      var markersVisible = true;

      var infoWindow = new google.maps.InfoWindow();

      infoWindow.addListener('closeclick', function() {
        infoWindow.setContent("");
      });

      infoWindow.addListener('content_changed', function() {
        if (selectedPath) {
          selectedPath.setOptions({
            strokeColor: '#585858'
          })
          selectedPath = null;
        }
      });

      /* Bike rack markers */
      $http.get('http://utility.arcgis.com/usrsvcs/servers/9e391a972ba14591945243a8f11408d3/rest/services/CCRPC/BicycleRack/MapServer/0/query?outSR=4326&where=SHAPE+IS+NOT+NULL&outFields=*&f=json')
        .success(function(data) {

          for (var i = 0; i < data.features.length; i++) {
            var coords = data.features[i].geometry;
            var properties = data.features[i].attributes;

            var covered = false;

            if (properties.Covered) covered = true;

            var marker = new google.maps.Marker({
              position: {
                lat: coords.y,
                lng: coords.x
              },
              map: map,
              icon: "img/bike_rack.png",
              owner: properties.Owner,
              parkName: properties.ParkName,
              covered: covered
            });

            marker.addListener('click', function() {
              var content = '';

              if (this.owner) content += 'Owner: ' + this.owner + '<br>';

              if (this.parkName) content += 'Park Name: ' + this.parkName + '<br>';

              if (this.covered) {
                content += 'Covered: Yes';
              } else
                content += 'Covered: No';

              infoWindow.setContent(
                "<b>Bike Rack Information:</b><br>" +
                content
              );

              infoWindow.open(map, this);
=======
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
      mapType,
      currentMapCamera,
      currentLocation,
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
>>>>>>> maptiles
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
            returnGeometry: true
          });
        });
      },
      snapToFeature = function(feature, latLng) {
        if (feature.geometryType == 'esriGeometryPoint') {
          return new plugin.google.maps.LatLng(feature.geometry.y, feature.geometry.x);
        } else if (feature.geometryType == 'esriGeometryPolyline') {
          var point,
            distance = Infinity;
          angular.forEach(feature.geometry.paths, function(path, idx) {
            var tapPoint = turf.point([latLng.lng, latLng.lat]),
              newPoint = turf.pointOnLine(turf.linestring(path), tapPoint),
              newDist = turf.distance(tapPoint, newPoint);
            if (newDist < distance) {
              point = newPoint;
              distance = newDist;
            }
          });
          return new plugin.google.maps.LatLng(
            point.geometry.coordinates[1], point.geometry.coordinates[0]);
        }
        return latLng;
      },
      displayFeatureInfo = function(feature, latLng) {
        var snippetParts = [];
        angular.forEach(feature.attributes, function(value, attr) {
          if (excludedFields.indexOf(attr) == -1 && attr != feature.displayFieldName) {
            snippetParts.push(attr + ': ' + value);
          }
        });
<<<<<<< HEAD

    }
  })

  // Tracks user locations for autocomplete of trip submission form
  .factory('userLocationStorage', function() {
    var _locations = [] // should contain arrays of form ['home', lat, lng]
    if (window.localStorage.getItem('locations') !== null) {
      _locations = JSON.parse(window.localStorage.getItem('locations'));
    }
    var service = {};

    // http://stackoverflow.com/a/21623256, returns distance in km
    function distance(lat1, lon1, lat2, lon2) {
      var R = 6371; // Radius of the earth in km
      var dLat = (lat2 - lat1) * Math.PI / 180; // deg2rad below
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a =
        0.5 - Math.cos(dLat) / 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        (1 - Math.cos(dLon)) / 2;

      return R * 2 * Math.asin(Math.sqrt(a));
    }

    // Find saved location closest to provided location. Distance must be less than 1 km.
    service.getClosestLocation = function(lat, lng) {
      var closest_idx = -1;
      var smallest_dist = Number.MAX_VALUE;
      for (var i = _locations.length - 1; i >= 0; i--) {
        var curr_dist = distance(_locations[i][1], _locations[i][2], lat, lng)
        if (curr_dist < smallest_dist && curr_dist < 1) {
          closest_idx = i;
          smallest_dist = curr_dist;
        }
      };
      if (closest_idx >= 0) {
        return [_locations[closest_idx][0], smallest_dist];
      } else {
        return null;
      }
    }

    // Add new location to list of user locations unless a location is saved nearby already
    service.addLocation = function(type, lat, lng) {
      var newLocation = [type, lat, lng]
      for (var i = _locations.length - 1; i >= 0; i--) {
        var curr_dist = distance(_locations[i][1], _locations[i][2], newLocation[1], newLocation[2])
        if (_locations[i][0] == newLocation[0] && curr_dist < 1)
          return;
      };
      _locations.push([type, lat, lng])
      window.localStorage['locations'] = JSON.stringify(_locations);
    }

    return service;
  })

  // Store devlog entries and provide functions to get and add logs
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
  })

/**
 * BackgroundGeolocationService This is a generic singleton wrapper for managing BackgroundGeolocation plugin and its available settings
 * and configuration state in localStorage
 * @author Chris Scott <chris@transistorsoft.com>
 */
var BackgroundGeolocationService = (function() {
  /**
   * @private sound-id mapping for iOS & Android.  BackgroundGeolocation plugin has a simple system-sound API
   */
  var $SOUNDS = {
    "LONG_PRESS_ACTIVATE_IOS": 1113,
    "LONG_PRESS_ACTIVATE_ANDROID": 27,
    "LONG_PRESS_CANCEL_IOS": 1075,
    "LONG_PRESS_CANCEL_ANDROID": 94,
    "ADD_GEOFENCE_IOS": 1114,
    "ADD_GEOFENCE_ANDROID": 28,
    "BUTTON_CLICK_IOS": 1104,
    "BUTTON_CLICK_ANDROID": 89,
    "MESSAGE_SENT_IOS": 1303,
    "MESSAGE_SENT_ANDROID": 90,
    "ERROR_IOS": 1006
  };

  /**
   * @private {Array} List of subscribers to the plugin's "location" event.  The plugin itself doesn't allow multiple listeners so I've simply added the ability here in Javascript.
   */
  var $locationListeners = [];
  /**
   * @private {object} BackgroundGeolocation configuration
   */
  var $config = {};
  /**
   * @private BackgroundGeolocation plugin reference
   */
  var $plugin;
  /**
   * @private {String} platform
   */
  var $platform;

  // Handy shortcut for localStorage.
  var $ls = window.localStorage;

  /**
   * @private List of all available common and platform-specific settings
   */
  var $settings = {
    common: [{
      name: 'url',
      group: 'http',
      inputType: 'text',
      dataType: 'string',
      defaultValue: 'http://posttestserver.com/post.php?dir=ionic-cordova-background-geolocation'
    }, {
      name: 'method',
      group: 'http',
      inputType: 'select',
      dataType: 'string',
      values: ['POST', 'PUT'],
      defaultValue: 'POST'
    }, {
      name: 'autoSync',
      group: 'http',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'true'
    }, {
      name: 'batchSync',
      group: 'http',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }, {
      name: 'stopOnTerminate',
      group: 'application',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'true'
    }, {
      name: 'stopTimeout',
      group: 'activity recognition',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 1, 2, 5, 10],
      defaultValue: 1
    }, {
      name: 'activityRecognitionInterval',
      group: 'activity recognition',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 1000, 10000, 30000, 60000],
      defaultValue: 10000
    }, {
      name: 'debug',
      group: 'application',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }],
    iOS: [{
      name: 'desiredAccuracy',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [-1, 0, 10, 100, 1000],
      defaultValue: 0
    }, {
      name: 'distanceFilter',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 10, 20, 50, 100, 500],
      defaultValue: 20
    }, {
      name: 'stationaryRadius',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 20, 50, 100, 500],
      defaultValue: 20
    }, {
      name: 'activityType',
      group: 'geolocation',
      dataType: 'string',
      inputType: 'select',
      values: ['Other', 'AutomotiveNavigation', 'Fitness', 'OtherNavigation'],
      defaultValue: 'Other'
    }, {
      name: 'disableElasticity',
      group: 'geolocation',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }, {
      name: 'stopDetectionDelay',
      group: 'activity recognition',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 1, 2, 5],
      defaultValue: 0
    }],
    Android: [{
      name: 'desiredAccuracy',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 10, 100, 1000],
      defaultValue: 0
    }, {
      name: 'distanceFilter',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 10, 20, 50, 100, 500],
      defaultValue: 20
    }, {
      name: 'locationUpdateInterval',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 1000, 5000, 10000, 30000, 60000],
      defaultValue: 5000
    }, {
      name: 'fastestLocationUpdateInterval',
      group: 'geolocation',
      dataType: 'integer',
      inputType: 'select',
      values: [0, 1000, 5000, 10000, 30000, 60000],
      defaultValue: 1000
    }, {
      name: 'triggerActivities',
      group: 'activity recognition',
      dataType: 'string',
      inputType: 'select',
      values: ['in_vehicle', 'on_bicycle', 'on_foot', 'running', 'walking'],
      defaultValue: 'in_vehicle, on_bicycle, running, walking, on_foot'
    }, {
      name: 'forceReloadOnMotionChange',
      group: 'application',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }, {
      name: 'forceReloadOnLocationChange',
      group: 'application',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }, {
      name: 'forceReloadOnGeofence',
      group: 'application',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }, {
      name: 'startOnBoot',
      group: 'application',
      dataType: 'boolean',
      inputType: 'select',
      values: ['true', 'false'],
      defaultValue: 'false'
    }]
  };

  // Iterate list-of-settings and build our @private config {} from localStorage || defaultValue
  var setting;
  var value;
  var rs = [].concat($settings.common).concat($settings.iOS).concat($settings.Android);
  for (var n = 0, len = rs.length; n < len; n++) {
    setting = rs[n];
    value = $ls.getItem('settings:' + setting.name) || setting.defaultValue;
    if (setting.dataType === 'integer') {
      value = parseInt(value, 10);
    }
    $config[setting.name] = value;
  }
=======
        infoMarker.setPosition(snapToFeature(feature, latLng));
        infoMarker.setTitle(feature.value);
        infoMarker.setSnippet(snippetParts.join('\n'));
        infoMarker.setVisible(true);
        infoMarker.showInfoWindow();
      },
      mapClick = function(latLng) {
        if (!identifyLayerIds || mapType != service.MAP_TYPE_CURRENT) return;
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
      cameraChange = function(camera) {
        if (mapType == service.MAP_TYPE_CURRENT) {
          currentMapCamera = camera;
        }
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
>>>>>>> maptiles

    service.MAP_TYPE_CURRENT = 'current';
    service.MAP_TYPE_PREVIOUS = 'previous';

    service.init = function() {
      defaultCenter = location2LatLng(DEFAULT_LOCATION);
      container = document.getElementById('current-map');
      getLayerInfo();
      map = plugin.google.maps.Map.getMap(container, {
        'camera': {
          'latLng': defaultCenter,
          'zoom': DEFAULT_ZOOM
        }
      });
      map.addEventListener(plugin.google.maps.event.MAP_READY, function() {
        // Set up camera tracking for the current trip map.
        map.on(plugin.google.maps.event.CAMERA_CHANGE, cameraChange);
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
      currentLocation = location;
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
      map.moveCamera({
        'target': tripPolyline.getPoints()
      });
    };
    service.resetMap = function(newMapType) {
      mapType = newMapType;
      var containerId = (mapType == service.MAP_TYPE_CURRENT) ?
        'current-map' : 'previous-map';
      container = document.getElementById(containerId);
      map.setDiv(container);

      // Show/hide map elements.
      if (tileOverlay)
        tileOverlay.setVisible(mapType == service.MAP_TYPE_CURRENT);
      if (infoMarker) infoMarker.setVisible(false);
      if (currentLocationMarker) currentLocationMarker.setVisible(false);
      if (tripPolyline) tripPolyline.setVisible(false);

      // Reset the camera if this is the current map.
      if (mapType == service.MAP_TYPE_CURRENT &&
        angular.isDefined(currentMapCamera)) {
          if (angular.isDefined(currentLocation))
            service.setCurrentLocation(currentLocation);
          map.moveCamera(currentMapCamera);
      }
    };
    service.getLegalText = function(callback) {
      map.getLicenseInfo(callback);
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
        accuracyLevel: 1,
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

  .service('profileService', function(storageService) {
    var service = this,
      PROFILE_KEY = 'profile',
      DEFAULT_PROFILE = {
        age: null,
        cyclingExperience: null,
        sex: null
      },
      profile = storageService.get(PROFILE_KEY, DEFAULT_PROFILE);

    service.getProfile = function() {
      return angular.copy(profile);
    };

    service.setProfile = function(newProfile) {
      profile = newProfile;
      storageService.set(PROFILE_KEY, newProfile);
    };

    service.clearAll = function() {
      profile = angular.copy(DEFAULT_PROFILE);
      storageService.set(PROFILE_KEY, profile);
    };
  })

  .service('tripService', function(storageService) {
    var service = this,
      TRIPS_KEY = 'trips',
      CURRENT_TRIP_KEY = 'currenttrip',
      DISTANCE_KEY = 'totaldistance',
      NEAR_THESHOLD = 500, // Maximum distance for location guesses, in meters
      toGeoJSON = function(locations) {
        if (angular.isArray(locations))
          return turf.linestring(locations.map(function(location) {
            return [location.longitude, location.latitude];
          }));
        return turf.point([locations.longitude, locations.latitude]);
      },
      getDistance = function(loc1, loc2) {
        return turf.distance(
          toGeoJSON(loc1), toGeoJSON(loc2), 'kilometers') * 1000;
      },
      getTripDistance = function(trip) {
        if (trip.locations.length < 2) return 0;
        return turf.lineDistance(
          toGeoJSON(trip.locations), 'kilometers') * 1000;
      },
      newTrip = function() {
        return {
          desiredAccuracy: null,
          destination: null,
          distance: 0,
          endTime: null,
          locations: [],
          origin: null,
          startTime: null,
          submitted: false,
          transit: false
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
      currentTrip.distance = getTripDistance(currentTrip);
      storageService.set(CURRENT_TRIP_KEY, currentTrip);
    };
    service.addLocation = function(location) {
      currentTrip.locations.push(location);
      currentTrip.distance = getTripDistance(currentTrip);
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
    service.setTripMetadata = function(metadata) {
      angular.merge(currentTrip, metadata);
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
    service.deleteTrip = function(idx) {
      distance -= service.getTripByIndex(idx).distance;
      trips.splice(idx, 1);
      storageService.set(TRIPS_KEY, trips);
      storageService.set(DISTANCE_KEY, distance);
    };
    service.getTotalDistance = function() {
      return distance;
    };
    service.guessLocationType = function(od) {
      if (currentTrip.locations.length == 0) return null;

      var location = (od == 'origin') ?
          currentTrip.locations[0] :
          currentTrip.locations[currentTrip.locations.length - 1],
        locationType = null,
        minDistance = NEAR_THESHOLD;

      angular.forEach(trips, function(trip, idx) {
        if (trip.locations.length == 0) return;
        if (trip.origin) {
          var originDist = getDistance(location, trip.locations[0]);
          if (originDist < minDistance) {
            locationType = trip.origin;
            minDistance = originDist;
          }
        }
        if (trip.destination) {
          var destinationDist = getDistance(
            location, trip.locations[trip.locations.length - 1]);
          if (destinationDist < minDistance) {
            locationType = trip.destination;
            minDistance = destinationDist;
          }
        }
      });
      return locationType;
    };
    service.clearAll = function() {
      trips = [];
      distance = 0;
      storageService.set(TRIPS_KEY, trips);
      storageService.set(DISTANCE_KEY, distance);
    };
  });
