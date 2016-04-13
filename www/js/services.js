angular.module('starter.services', [])

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
            });

            markers.push(marker);
          }

        });

      /* Bike path markers */
      $http.get('http://utility.arcgis.com/usrsvcs/servers/31e89733946d441187c0c4f692be8cf3/rest/services/CCRPC/BicyclePedestrianNetwork/MapServer/0/query?outSR=4326&where=SHAPE+IS+NOT+NULL&outFields=*&f=json')
        .success(function(data) {
          console.log(data);
          for (var i = 0; i < data.features.length; i++) {
            var coordlist = data.features[i].geometry.paths[0];
            var properties = data.features[i].attributes;

            var path = [];

            for (var j = 0; j < coordlist.length; j++) {
              path.push({
                lat: coordlist[j][1],
                lng: coordlist[j][0]
              });
            }

            var bikepath = new google.maps.Polyline({
              path: path,
              geodesic: true,
              strokeColor: '#585858',
              strokeOpacity: .4,
              strokeWeight: 4,
              distance: properties.Dx_Miles,
              name: properties.Name
            });

            bikepath.setMap(map)

            bikepath.addListener('click', function(event) {

              var content = '';

              if (this.name) content += 'Name: ' + this.name + '<br>'

              if (this.distance) content += 'Distance: ' + this.distance.toFixed(2) + ' miles<br>';

              infoWindow.setContent(
                "<b>Bike Path Information:</b><br>" +
                content
              );

              infoWindow.setPosition(event.latLng);

              infoWindow.open(map, this);
              selectedPath = this;
              selectedPath.setOptions({
                strokeColor: '#FF0000'
              })
            });
          }
        });

    }
  })

  .factory('userLocationStorage', function() {
    var _locations = [] // should contain arrays like ['home', lat, lng]
    if (window.localStorage.getItem('locations') !== null) {
      _locations = JSON.parse(window.localStorage.getItem('locations'));
    }
    var service = {};

    // http://www.movable-type.co.uk/scripts/latlong.html
    /*var distance = function(lat1, lng1, lat2, lng2) {
      var R = 6371000; // metres
      var φ1 = lat1.toRadians();
      var φ2 = lat2.toRadians();
      var Δφ = (lat2-lat1).toRadians();
      var Δλ = (lon2-lon1).toRadians();

      var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      var d = R * c;
      return d;
    }*/

    // http://stackoverflow.com/a/21623256
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

    service.getClosestLocation = function(lat, lng) {
      var closest_idx = -1;
      var smallest_dist = Number.MAX_VALUE;
      for (var i = _locations.length - 1; i >= 0; i--) {
        var curr_dist = distance(_locations[i][1], _locations[i][2], lat, lng)
        if (curr_dist < smallest_dist) {
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

    service.addLocation = function(type, lat, lng) {
      var newLocation = [type, lat, lng]
      for (var i = _locations.length - 1; i >= 0; i--) {
        var curr_dist = distance(_locations[i][1], _locations[i][2], newLocation[1], newLocation[2])
        if (_locations[i][0] == newLocation[0] && curr_dist < 50)
          return;
      };
      _locations.push([type, lat, lng])
      window.localStorage['locations'] = JSON.stringify(_locations);
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
      defaultValue: 'true'
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

  // Build platform-specific list-of-settings
  var platformSettings = undefined;
  var getPlatformSettings = function() {
    if (platformSettings === undefined) {
      platformSettings = [].concat($settings[$platform || 'iOS']).concat($settings.common);
      if (!$platform) {
        platformSettings = platformSettings.concat($settings['Android']);
      }
    }
    return platformSettings;
  };

  /**
   * This is the BackgroundGeolocation callback.  I've set up the ability to add multiple listeners here so this
   * callback simply calls upon all the added listeners here
   */
  var fireLocationListeners = function(location, taskId) {
    console.log('[js] BackgroundGeolocation location received: ', JSON.stringify(location));
    var me = this;
    var callback;
    for (var n = 0, len = $locationListeners.length; n < len; n++) {
      callback = $locationListeners[n];
      try {
        callback.call(me, location);
      } catch (e) {
        console.log('error: ' + e.message);
      }
    }
    $plugin.finish(taskId);
  };

  return {
    /**
     * Set the plugin state to track in background
     * @param {Boolean} willEnable
     */
    setEnabled: function(willEnable, success, fail) {
      window.localStorage.setItem('bgGeo:enabled', willEnable);
      if ($plugin) {
        if (willEnable) {
          $plugin.start(success, fail);
        } else {
          $plugin.stop(success, fail);
        }
      }
    },
    /**
     * Is the plugin enabled to run in background?
     * @return {Boolean}
     */
    getEnabled: function() {
      return window.localStorage.getItem('bgGeo:enabled') === 'true';
    },
    /**
     * Toggle stationary/aggressive mode
     * @param {Boolean} willStart
     */
    setPace: function(willStart, successFn) {
      if ($plugin) {
        $plugin.changePace(willStart, successFn, function(error) {
          alert('Failed to change pace: ' + error);
        });
      }
    },
    /**
     * Manually sync plugin's persisted locations to server
     */
    sync: function(success, failure) {
      if ($plugin) {
        $plugin.sync(success, failure);
      } else {
        // Fake it for browser testing.
        setTimeout(success, 1000);
      }
    },
    finish: function(taskId) {
      console.log('- BackgroundGeolocationService#finish, taskId: ', taskId);
      if ($plugin) {
        $plugin.finish(taskId);
      }
    },
    /**
     * Add an event-listener for location-received from $plugin
     * @param {Function} callback
     */
    onLocation: function(callback) {
      $locationListeners.push(callback);
    },
    /**
     * Add a stationary-listener
     * @param {Function} stationary event-listener
     */
    onMotionChange: function(callback, failure) {
      var me = this;
      if ($plugin) {
        $plugin.onMotionChange(callback, failure);
      }
    },
    onGeofence: function(callback) {
      var me = this;
      if ($plugin) {
        $plugin.onGeofence(function(params, taskId) {
          console.log('- onGeofence:' + JSON.stringify(params));
          console.log('  taskId: ' + taskId);
          try {
            callback.call(me, params, taskId);
          } catch (e) {
            console.log('error: ' + e.message, e);
          }
        });
      }
    },

    /**
     * Return the current BackgroundGeolocation config-state as stored in localStorage
     * @return {Object}
     */
    getConfig: function() {
      return $config;
    },
    /**
     * Return a list of all available plugin settings, filtered optionally by "group"
     * @param {String} group
     * @return {Array}
     */
    getSettings: function(group) {
      var mySettings = getPlatformSettings();
      if (group) {
        var filterFn = function(setting) {
          return setting.group === group;
        };
        return mySettings.filter(filterFn);
      } else {
        return mySettings;
      }
    },
    /**
     * Get a single config value by key
     * @param {String} key A BackgroundGeolocation setting key to return a value for
     * @return {Mixed}
     */
    get: function(key) {
      return $config[key];
    },
    /**
     * Set a single config value by key,value
     * @param {String} key
     * @param {Mixed} value
     */
    set: function(key, value) {
      $ls.setItem('settings:' + key, value);
      $config[key] = value;

      if ($plugin) {
        $plugin.setConfig(function(response) {
          console.log('- setConfig: ', response);
        }, function(error) {
          console.warn('- setConfig error: ', error);
        }, $config);
      }
    },
    /**
     * Configure the BackgroundGeolocation Cordova $plugin
     * @param {BackgroundGeolocation} bgGeoPlugin
     */
    configurePlugin: function(bgGeoPlugin) {
      var device = ionic.Platform.device();
      $platform = device.platform;

      var me = this;
      var config = this.getConfig();

      config.configureUrl = 'http://192.168.11.120:8080/configure';
      config.configureInterval = 10000;
      config.extras = {
        "foo": "extra data item"
      };

      config.preventSuspend = true;
      config.heartbeatInterval = 30;

      config.params = config.params || {};

      // Append Cordova device-info to POST params so we can map a device-id to the location
      config.params.device = device;

      $plugin = bgGeoPlugin;

      // Configure BackgroundGeolocation Plugin
      $plugin.configure(fireLocationListeners, function(error) {
        window.alert('Location error: ' + error);
        console.warn('BackgroundGeolocation Error: ' + error);
      }, config);

      if (this.getEnabled()) {
        $plugin.start();
      }
    },
    /**
     * Return a reference to Cordova BackgroundGeolocation plugin
     * @return {BackgroundGeolocation}
     */
    getPlugin: function() {
      return $plugin;
    },
    addGeofence: function(data, callback) {
      if ($plugin) {
        var me = this;
        $plugin.addGeofence(data, function(res) {
          me.playSound('ADD_GEOFENCE');
          callback.call(me, res);
        });
      } else {
        callback.call(me);
      }
    },
    removeGeofence: function(identifier) {
      if ($plugin) {
        var me = this;
        $plugin.removeGeofence(identifier, function(status) {
          me.playSound('ADD_GEOFENCE');
        }, function(error) {
          console.log('- FAILED to remove geofence');
        });
      }
    },
    getCurrentPosition: function(callback, failure, options) {
      if ($plugin) {
        $plugin.getCurrentPosition(callback, failure, options);
      }
    },
    playSound: function(action) {
      if ($plugin) {
        var soundId = $SOUNDS[action + '_' + $platform.toUpperCase()];
        if (soundId) {
          $plugin.playSound(soundId);
        } else {
          console.warn('Failed to locate sound-id "' + action + '"');
        }
      }
    }
  };
})();