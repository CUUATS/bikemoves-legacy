angular.module('bikemoves.services', ['ionic', 'lokijs'])

  .service('locationService', function($q, $ionicPlatform) {
    var service = this,
      BG_DEFAULT_SETTINGS = {
        activityType: 'OtherNavigation', // iOS activity type
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
  })

  .service('mapService', function($http, $q, $ionicPlatform) {
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
      createMap = function() {
        if (!map) {
          defaultCenter = location2LatLng(DEFAULT_LOCATION);
          container = document.getElementById('current-map');
          getLayerInfo();
          map = plugin.google.maps.Map.getMap(container, {
            'camera': {
              'latLng': defaultCenter,
              'zoom': DEFAULT_ZOOM
            }
          });
        }
        return $q(function(resolve, reject) {
          map.addEventListener(plugin.google.maps.event.MAP_READY, resolve);
        });
      },
      addTileOverlay = function(map) {
        return $q(function(resolve, reject) {
          map.addTileOverlay({
            tileUrlFormat: "http://tiles.bikemoves.me/tiles/<zoom>/<y>/<x>.png"
          }, resolve);
        });
      },
      addInfoMarker = function(map) {
        return $q(function(resolve, reject) {
          map.addMarker({
            position: defaultCenter,
            visible: false,
            icon: '#fbb03b'
          }, resolve);
        });
      },
      addCurrentLocationMarker = function(map) {
        return $q(function(resolve, reject) {
          map.addMarker({
            position: defaultCenter,
            visible: false,
            icon: '#00008b'
          }, resolve);
        });
      },
      addTripPolyline = function(map) {
        return $q(function(resolve, reject) {
          map.addPolyline({
            points: [defaultCenter, defaultCenter],
            visible: false,
            geodesic: true,
            color: '#2677FF',
            width: 5
          }, resolve);
        });
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
        return $q(function(resolve, reject) {
          map.getVisibleRegion(function(bounds) {
            var ne = bounds.northeast,
              sw = bounds.southwest;
            resolve({
              f: 'json',
              geometry: [latLng.lng, latLng.lat].join(','),
              geometryType: 'esriGeometryPoint',
              sr: 4326,
              layers: 'top:' + identifyLayerIds.join(','),
              tolerance: 10,
              mapExtent: [sw.lng, sw.lat, ne.lng, ne.lat].join(','),
              imageDisplay: [
                container.offsetWidth,
                container.offsetHeight,
                96
              ].join(','),
              returnGeometry: true
            });
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
        getIdentifyParams(latLng).then(function(params) {
          return $http({
            method: 'GET',
            url: SERVICE_ENDPOINT + '/identify',
            params: params
          });
        }).then(function(res) {
          if (res.status == 200 && res.data.results.length) {
            displayFeatureInfo(res.data.results[0], latLng);
          } else {
            infoMarker.hideInfoWindow();
            infoMarker.setVisible(false);
          }
        });
      },
      cameraChange = function(camera) {
        if (mapType == service.MAP_TYPE_CURRENT) {
          currentMapCamera = camera;
        }
      },
      initMap = function() {
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
      return initMap().then(function() {
        currentLocation = location;
        currentLocationMarker.setPosition(location2LatLng(location));
        currentLocationMarker.setVisible(true);
      });
    };
    service.setCenter = function(location, duration) {
      return initMap().then(function() {
        if (typeof duration === 'undefined') var duration = 0;
        if (duration == 0) {
          map.setCenter(location2LatLng(location));
        } else {
          return $q(function(resolve, reject) {
            map.getCameraPosition(function(camera) {
              camera.target = location2LatLng(location);
              camera.duration = duration;
              map.animateCamera(camera, resolve);
            });
          });
        }
      });
    };
    service.setClickable = function(clickable) {
      return initMap().then(function() {
        map.setClickable(clickable);
      });
    };
    service.setTripLocations = function(locations) {
      return initMap().then(function() {
        tripPolyline.setPoints(locations.map(location2LatLng));
        tripPolyline.setVisible(locations.length > 1);
      });
    };
    service.zoomToTripPolyline = function() {
      return initMap().then(function() {
        return $q(function(resolve, reject) {
          map.moveCamera({
            'target': tripPolyline.getPoints()
          }, resolve);
        });
      });
    };
    service.resetMap = function(newMapType) {
      return initMap().then(function() {
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

    // Initialize the map.
    $ionicPlatform.ready().then(createMap).then(function() {
      return $q.all([
        addTileOverlay(map),
        addInfoMarker(map),
        addCurrentLocationMarker(map),
        addTripPolyline(map)
      ]);
    }).then(function(mapFeatures) {
      tileOverlay = mapFeatures[0];
      infoMarker = mapFeatures[1];
      currentLocationMarker = mapFeatures[2];
      tripPolyline = mapFeatures[3];
      map.on(plugin.google.maps.event.CAMERA_CHANGE, cameraChange);
      map.on(plugin.google.maps.event.MAP_CLICK, mapClick);
      ready = true;
      angular.forEach(readyQueue, function(callback) {
        callback();
      });
    });
  })

  .service('remoteService', function($http) {
    var service = this,
      ENDPOINT = 'http://api.bikemoves.me/v0.2/',
      POST_CONFIG = {
        headers: {'Content-Type': 'application/octet-stream'},
        transformRequest: []
      },
      ENUM_LABELS = {
        User: {
          Gender: [
            ['NOT_SPECIFIED', ''],
            ['MALE', 'Male'],
            ['FEMALE', 'Female'],
            ['OTHER', 'Other']
          ],
          Age: [
            ['NOT_SPECIFIED', ''],
            ['AGE_UNDER_15', 'Under 15'],
            ['AGE_15_TO_19', '15 to 19'],
            ['AGE_20_TO_24', '20 to 24'],
            ['AGE_25_TO_34', '25 to 34'],
            ['AGE_35_TO_44', '35 to 44'],
            ['AGE_45_TO_54', '45 to 54'],
            ['AGE_55_TO_64', '55 to 64'],
            ['AGE_65_TO_74', '65 to 74'],
            ['AGE_75_AND_OLDER', '75 and older']
          ],
          ExperienceLevel: [
            ['NOT_SPECIFIED', ''],
            ['BEGINNER', 'Beginner'],
            ['INTERMEDIATE', 'Intermediate'],
            ['ADVANCED', 'Advanced']
          ]
        },
        Trip: {
          LocationType: [
            ['NOT_SPECIFIED', ''],
            ['HOME', 'Home'],
            ['WORK', 'Work'],
            ['K12_SCHOOL', 'K-12 School'],
            ['UNIVERSITY', 'University'],
            ['SHOPPING', 'Shopping'],
            ['OTHER', 'Other']
          ]
        }
      },
      messages = dcodeIO.ProtoBuf.loadJsonFile('js/messages.json').build(),
      postMessage = function(url, msg) {
        return $http.post(
          ENDPOINT + url, msg.encode().toArrayBuffer(), POST_CONFIG);
      },
      getEnum = function(msgName, enumName) {
        return messages.bikemoves[msgName][enumName];
      };

    service.getOptions = function(msgName, enumName) {
      var values = getEnum(msgName, enumName),
        labels = ENUM_LABELS[msgName][enumName];
      return labels.map(function(labelInfo) {
        return {
          id: values[labelInfo[0]],
          label: labelInfo[1]
        };
      });
    };

    service.getLabel = function(msgName, enumName, value) {
      var options = service.getOptions(msgName, enumName);
      for (i=0; i < options.length; i++) {
        if (options[i].id == value) return options[i].label;
      }
    };

    service.postUser = function(profile) {
      var userMessage = new messages.bikemoves.User({
        deviceUuid: window.device.uuid,
        platformName: ionic.Platform.platform(),
        platformVersion: ionic.Platform.version(),
        age: profile.age,
        cyclingExperience: profile.cyclingExperience,
        gender: profile.gender
      });
      return postMessage('user', userMessage);
    };

    service.postTrip = function(trip) {
      var tripMessage = new messages.bikemoves.Trip(trip.serialize());
      return postMessage('trip', tripMessage);
    };
  })

  .service('storageService', function($q, Loki) {
    var service = this,
      APP_COLLECTION = 'app',
      TRIPS_COLLECTION = 'trips',
      db = new Loki('bikemoves', {
        autosave: false,
        adapter: new LokiCordovaFSAdapter({'prefix': 'loki'})
      }),
      collections = {},
      dbLoaded = false,
      loadDb = function() {
        return $q(function (resolve, reject) {
          if (dbLoaded) {
            resolve()
          } else {
            db.loadDatabase({
              trips: {
                proto: Trip
              }
            }, function () {
              buildCollections();
              dbLoaded = true;
              resolve();
            });
          };
        });
      },
      buildCollections = function() {
        // App collection
        collections[APP_COLLECTION] = db.getCollection(APP_COLLECTION) ||
          db.addCollection(APP_COLLECTION);
        collections[APP_COLLECTION].ensureUniqueIndex('_name');

        // Trips collection
        collections[TRIPS_COLLECTION] = db.getCollection(TRIPS_COLLECTION) ||
          db.addCollection(TRIPS_COLLECTION);
      };

    service.getCollection = function(collectionName) {
      return loadDb().then(function() {
        return collections[collectionName];
      });
    };

    service.save = function() {
      return loadDb().then(function() {
        return $q(function (resolve, reject) {
          db.saveDatabase(resolve);
        });
      });
    };

    service.get = function(docName, defaultValue) {
      return service.getCollection(APP_COLLECTION).then(function(collection) {
        var doc = collection.by('_name', docName);
        return (doc) ? doc : angular.copy(defaultValue);
      });
    };

    service.set = function(docName, doc) {
      return service.getCollection(APP_COLLECTION).then(function(collection) {
        var oldDoc = collection.by('_name', docName);
        if (!oldDoc) {
          collection.insert(angular.merge({'_name': docName}, doc));
        } else {
          angular.merge(oldDoc, doc);
          collection.update(oldDoc);
        }
        return service.save();
      });
    };

    service.delete = function(docName) {
      return service.getCollection(APP_COLLECTION).then(function(collection) {
        collection.removeWhere({
          '_name': docName
        });
        return service.save();
      });
    };
  })

  .service('settingsService', function(storageService, locationService) {
    var service = this,
      SETTINGS_KEY = 'settings',
      DEFAULT_SETTINGS = {
        accuracyLevel: 1,
        autoSubmit: true
      },
      updateAccuracy = function() {
        return service.getDesiredAccuracy().then(function(accuracy) {
          return locationService.updateSettings({desiredAccuracy: accuracy});
        });
      };

    service.getSettings = function() {
      return storageService.get(SETTINGS_KEY, DEFAULT_SETTINGS);
    };

    service.getDesiredAccuracy = function() {
      return service.getSettings().then(function(settings) {
        return [100, 10, 0][settings.accuracyLevel];
      });
    };

    service.updateSettings = function(newSettings) {
      return storageService.set(SETTINGS_KEY, newSettings).then(updateAccuracy);
    };

    service.clearAll = function() {
      return storageService.delete(SETTINGS_KEY);
    };

    // Set initial accuracy.
    updateAccuracy();
  })

  .service('profileService', function(storageService) {
    var service = this,
      PROFILE_KEY = 'profile',
      DEFAULT_PROFILE = {
        age: 0,
        cyclingExperience: 0,
        sex: 0
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
      getTripsCollection = function() {
        return storageService.getCollection('trips');
      };

    service.saveTrip = function(trip) {
      return getTripsCollection().then(function(collection) {
        collection.insert(trip);
        return storageService.save();
      });
    };
    service.getTrips = function() {
      return getTripsCollection().then(function(collection) {
        return collection.chain().simplesort('startTime', true).data();
      });
    };
    service.getTrip = function(tripID) {
      return getTripsCollection().then(function(collection) {
        return collection.get(tripID);
      });
    };
    service.deleteTrip = function(tripID) {
      return getTripsCollection().then(function(collection) {
        collection.remove(collection.data[tripID]);
        return storageService.save();
      });
    };
    service.getTotalDistance = function() {
      return getTripsCollection().then(function(collection) {
        if (collection.data.length == 0) return 0;
        return collection.mapReduce(function(trip) {
          return trip.getDistance();
        }, function(distances) {
          return distances.reduce(function(a, b) {
            return a + b;
          });
        });
      });
    };
    service.clearAll = function() {
      return getTripsCollection().then(function(collection) {
        collection.removeDataOnly();
        return storageService.save();
      });
    };
  });
