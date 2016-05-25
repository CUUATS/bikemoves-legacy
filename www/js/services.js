angular.module('bikemoves.services', ['lokijs'])

  .service('locationService', function($q, $ionicPlatform) {
    var service = this,
      BG_DEFAULT_SETTINGS = {
        activityType: 'Fitness', // iOS activity type
        autoSync: false, // Do not automatically post to the server
        debug: false, // Disable debug notifications
        desiredAccuracy: 10, // Overridden by settings.
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
      geoSettings = angular.copy(BG_DEFAULT_SETTINGS),
      initPlugin = function() {
        return $q(function(resolve, reject) {
          if (bgGeo) {
            resolve();
          } else {
            $ionicPlatform.ready(function() {
              bgGeo = window.BackgroundGeolocation;
              bgGeo.onLocation(angular.noop);
              bgGeo.configure(geoSettings);
              resolve();
            });
          }
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
            console.log('finishing task', task);
            bgGeo.finish(task);
          });
        });
      },
      getState = function() {
        return initPlugin().then(function() {
          return $q(function(resolve, reject) {
            bgGeo.getState(resolve);
          });
        });
      },
      setGeolocationEnabled = function(on) {
        return getState().then(function(state) {
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
        return getState().then(function(state) {
          return $q(function(resolve, reject) {
            if (state.isMoving === moving) {
              resolve();
            } else {
              bgGeo.changePace(moving, resolve);
            }
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
      return doGeoTask('getLocations').then(makeLocation);
    };
    service.onLocation = function(locationHandler) {
      return initPlugin().then(function() {
        bgGeo.onLocation(function(e, taskId) {
          locationHandler(makeLocation(e));
          bgGeo.finish(taskId);
        });
      });
    };
    service.getCurrentPosition = function(options) {
      return doGeoTask('getCurrentPosition', options).then(makeLocation);
    };
    service.clearDatabase = function() {
      return initPlugin().then(function() {
        return $q(function(resolve, reject) {
          bgGeo.clearDatabase(resolve, reject);
        });
      })
    };
    service.setStatus = function(status) {
      var enabled = status != service.STATUS_STOPPED;
      return setGeolocationEnabled(enabled).then(function() {
        if (enabled) return setMoving(status == service.STATUS_RECORDING);
      });
    };
    service.getStatus = function() {
      return getState().then(function(state) {
        return (state.enabled) ? (
          (state.isMoving) ? service.STATUS_RECORDING : service.STATUS_PAUSED) :
            service.STATUS_STOPPED;
      });
    };
  })

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
        var snappedLatLng = snapToFeature(feature, latLng),
          snippetParts = [];
        angular.forEach(feature.attributes, function(value, attr) {
          if (excludedFields.indexOf(attr) == -1
              && value.toLowerCase() != 'null') {
            snippetParts.push(attr + ': ' + value);
          }
        });
        infoMarker.setPosition(snappedLatLng);
        infoMarker.setTitle(feature.layerName);
        infoMarker.setSnippet(snippetParts.join('\r\n'));
        infoMarker.setVisible(true);
        infoMarker.showInfoWindow();
        map.getCameraPosition(function(camera) {
          camera.target = snappedLatLng;
          camera.duration = 200;
          map.animateCamera(camera);
        });
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
          icon: '#fbb03b'
        }, function(marker) {
          infoMarker = marker;
          map.on(plugin.google.maps.event.MAP_CLICK, mapClick);
          checkReady();
        });
        // Current position marker
        map.addMarker({
          position: defaultCenter,
          visible: false,
          icon: '#00008b'
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
          camera.duration = duration;
          map.animateCamera(camera);
        });
      }
    };
    service.setClickable = function(clickable) {
      map.setClickable(clickable);
    };
    service.setTripLocations = function(locations) {
      tripPolyline.setPoints(locations.map(location2LatLng));
      tripPolyline.setVisible(locations.length > 1);
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

  .service('storageService', function($q, Loki) {
    var service = this,
      APP_COLLECTION = 'app',
      db = new Loki('bikemoves', {
        autosave: false,
        adapter: new LokiCordovaFSAdapter({'prefix': 'loki'})
      }),
      dbLoaded = false,
      loadDb = function() {
        return $q(function (resolve, reject) {
          if (dbLoaded) {
            resolve()
          } else {
            db.loadDatabase({}, function () {
              dbLoaded = true;
              resolve();
            });
          };
        });
      },
      getCollection = function(collectionName, uniqueIndices) {
        return loadDb().then(function() {
          var collection = db.getCollection(collectionName);
          if (!collection) {
            collection = db.addCollection(collectionName);
            if (uniqueIndices) {
              angular.forEach(uniqueIndices, function(indexName) {
                collection.ensureUniqueIndex(indexName);
              });
            }
          }
          return collection;
        });
      },
      save = function() {
        return loadDb().then(function() {
          return $q(function (resolve, reject) {
            db.saveDatabase(resolve);
          });
        });
      };

    service.get = function(docName, defaultValue) {
      return getCollection(APP_COLLECTION, ['_name']).then(function(collection) {
        var doc = collection.by('_name', docName);
        return (doc) ? doc : angular.copy(defaultValue);
      });
    };

    service.set = function(docName, doc) {
      return getCollection(APP_COLLECTION).then(function(collection) {
        var oldDoc = collection.by('_name', docName);
        if (!oldDoc) {
          collection.insert(angular.merge({'_name': docName}, doc));
        } else {
          collection.update(doc);
        }
        return save();
      });
    };

    service.delete = function(docName) {
      return getCollection(APP_COLLECTION).then(function(collection) {
        collection.removeWhere({
          '_name': docName
        });
        return save();
      });
    };
  })

  .service('settingsService', function(storageService) {
    var service = this,
      SETTINGS_KEY = 'settings',
      DEFAULT_SETTINGS = {
        accuracyLevel: 1,
        autoSubmit: true
      };

    service.getSettings = function() {
      return storageService.get(SETTINGS_KEY, DEFAULT_SETTINGS);
    };

    service.updateSettings = function(newSettings) {
      return storageService.set(SETTINGS_KEY, newSettings);
    };

    service.clearAll = function() {
      return storageService.delete(SETTINGS_KEY);
    };
  })

  .service('profileService', function(storageService) {
    var service = this,
      PROFILE_KEY = 'profile',
      DEFAULT_PROFILE = {
        age: null,
        cyclingExperience: null,
        sex: null
      };

    service.getProfile = function() {
      return storageService.get(PROFILE_KEY, DEFAULT_PROFILE);
    };

    service.updateProfile = function(newProfile) {
      return storageService.set(PROFILE_KEY, newProfile);
    };

    service.clearAll = function() {
      return storageService.delete(PROFILE_KEY);
    };
  })

  .service('tripService', function(storageService) {
    var service = this,
      TRIPS_KEY = 'trips',
      START_TIME_KEY = 'starttime',
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
      currentTrip = newTrip(),
      getPreviousLocation = function() {
        if (currentTrip.locations.length == 0) return null;
        return currentTrip.locations[currentTrip.locations.length - 1];
      },
      appendLocation = function(location) {
        currentTrip.locations.push(location);
      },
      replaceLocation = function(location) {
        currentTrip.locations[currentTrip.locations.length - 1] = location;
      },
      moreAccurate = function(loc1, loc2) {
        if (loc1.accuracy == loc2.accuracy)
          return (loc1.time > loc2.time) ? loc1 : loc2;
        return (loc1.accuracy < loc2.accuracy) ? loc1 : loc2;
      };

    service.getTrip = function () {
      return currentTrip;
    };
    service.getCurrentDistance = function() {
      return currentTrip.distance;
    };
    service.addLocation = function(location) {
      var prev = getPreviousLocation();
      if (!location.moving) return prev;

      // If we have a previous location, check that the travel speed between
      // the two locations is reasonable and that the locations are outside
      // of each other's accuracy circles. If not, keep only the more
      // accurate of the two locations.
      if (prev) {
        var meters = getDistance(prev, location),
          seconds = (location.time - prev.time) / 1000;
        if ((meters / seconds) > 23 || meters < location.accuracy ||
            meters < prev.accuracy) {
          replaceLocation(moreAccurate(prev, location));
        } else {
          appendLocation(location);
        }
      } else {
        appendLocation(location);
      }

      currentTrip.distance = getTripDistance(currentTrip);
      return getPreviousLocation();
    };
    service.setStartTime = function(timestamp) {
      if (!angular.isDefined(timestamp)) var timestamp = (new Date()).getTime();
      currentTrip.startTime = timestamp;
      storageService.set(START_TIME_KEY, timestamp);
    };
    service.setEndTime = function(timestamp) {
      if (!angular.isDefined(timestamp)) var timestamp = (new Date()).getTime();
      currentTrip.endTime = timestamp;
    };
    service.setTripMetadata = function(metadata) {
      angular.merge(currentTrip, metadata);
    };
    service.saveTrip = function(submitted) {
      // Restore start time if the trip was recreated.
      if (!currentTrip.starTime) currentTrip.starTime =
        storageService.get(START_TIME_KEY);

      currentTrip.submitted = submitted;
      trips.unshift(currentTrip);
      distance += currentTrip.distance;
      storageService.set(TRIPS_KEY, trips);
      storageService.set(DISTANCE_KEY, distance);
    };
    service.resetTrip = function() {
      currentTrip = newTrip();
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
