angular.module('bikemoves')
  .service('storageService', function($q, $ionicPlatform, Loki) {
    var service = this,
      APP_COLLECTION = 'app',
      TRIPS_COLLECTION = 'trips',
      INCIDENTS_COLLECTION = 'incidents',
      collections = {},
      ready = false,
      readyQueue = [],
      db,
      loadDb = function() {
        return $q(function(resolve, reject) {
          if (ready) {
            resolve();
          } else {
            readyQueue.push(resolve);
          }
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

        collections[INCIDENTS_COLLECTION] = db.getCollection(INCIDENTS_COLLECTION) ||
          db.addCollection(INCIDENTS_COLLECTION);
      };
    service.initalizeDb = function(isTest) {
      if (isTest) {
        db = new Loki('bikemoves', {
          autosave: false
        });
      } else {
        db = new Loki('bikemoves', {
          autosave: false,
          adapter: new LokiCordovaFSAdapter({
            'prefix': 'loki'
          })
        });
      }
      db.loadDatabase({
        trips: {
          proto: Trip
        }
      }, function() {
        buildCollections();
        ready = true;
        angular.forEach(readyQueue, function(callback) {
          callback();
        });
      });
    };
    service.getCollection = function(collectionName) {
      return loadDb().then(function() {
        return collections[collectionName];
      });
    };

    service.save = function() {
      return loadDb().then(function() {
        return $q(function(resolve, reject) {
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
          collection.insert(angular.merge({
            '_name': docName
          }, doc));
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
    $ionicPlatform.ready().then(service.initalizeDb);
  });
