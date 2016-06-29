angular.module('bikemoves')
  .service('mapService', function($http, $q, $ionicPlatform, incidentService, $rootScope) {
    var service = this,
      isReporting = false,
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
      disableDoubleClickZoom = true,
      currentLocation,
      currentIncidentMarker;
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
      addCurrentIncidentMarker = function(map) {
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
          params: {
            f: 'json'
          }
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
          if (excludedFields.indexOf(attr) == -1 && value.toLowerCase() != 'null') {
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
      mapClick = function(latLng, map) {
        if (isReporting) {
          currentIncidentMarker.setVisible(true);
          currentIncidentMarker.setPosition(latLng);
          $rootScope.$broadcast('IncidentReport', latLng);
        } else {
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
        }
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
        if (duration === 0) {
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
        addTripPolyline(map),
        addCurrentIncidentMarker(map)
      ]);
    }).then(function(mapFeatures) {
      tileOverlay = mapFeatures[0];
      infoMarker = mapFeatures[1];
      currentLocationMarker = mapFeatures[2];
      tripPolyline = mapFeatures[3];
      currentIncidentMarker = mapFeatures[4];
      map.on(plugin.google.maps.event.CAMERA_CHANGE, cameraChange);
      map.on(plugin.google.maps.event.MAP_CLICK, mapClick);
      ready = true;
      angular.forEach(readyQueue, function(callback) {
        callback();
      });
    });
    service.setMapState = function(name) {
      if (name == 'report') {
        isReporting = true;
        console.log("Enetered Report State");
      } else {
        isReporting = false;
        console.log("Entered Normal State");
      }
      return;
    };
    service.removeIncident = function() {
      return currentIncidentMarker.setVisible(false);
    };
  });
