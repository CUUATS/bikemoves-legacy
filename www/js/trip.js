function Trip(locations, startTime, endTime, origin, destination,
	transit, submitted, desiredAccuracy, debug, appVersion) {
	this.desiredAccuracy = desiredAccuracy || null;
	this.destination = destination || 0;
	this.endTime = endTime || null;
	this.locations = locations || [];
	this.origin = origin || 0;
	this.startTime = startTime || null;
	this.submitted = submitted || false;
	this.transit = transit || false;
	this.debug = debug || false;
	this.appVersion = appVersion || null;
}

// Maximum distance for location guesses, in meters
Trip.prototype.NEAR_THESHOLD = 500;
Trip.prototype.SIMPLIFY_TOLERANCE = 0.0002; // degrees

Trip.prototype._appendLocation = function(location) {
	this.locations.push(location);
	return location;
};

Trip.prototype._replaceLocation = function(location) {
	this.locations[this.locations.length - 1] = location;
	return location;
};

Trip.prototype._toPoint = function(location) {
	return turf.point([location.longitude, location.latitude]);
};

Trip.prototype._getDistance = function(loc1, loc2) {
	return turf.distance(
		this._toPoint(loc1), this._toPoint(loc2), 'kilometers') * 1000;
};

Trip.prototype._moreAccurate = function(loc1, loc2) {
	if (loc1.accuracy == loc2.accuracy)
		return (loc1.time > loc2.time) ? loc1 : loc2;
	return (loc1.accuracy < loc2.accuracy) ? loc1 : loc2;
};

Trip.prototype._getLocation = function(idx) {
	if (idx < 0) idx = this.locations.length + idx;
	return this.locations[idx] || null;
};

Trip.prototype._locationInfo = function(type, idx) {
	return {
		type: type,
		location: this._getLocation(idx)
	};
};

Trip.prototype.getODTypes = function() {
	if (this.locations.length < 2) return [];
	var od = [];
	if (this.origin > 0) od.push(this._locationInfo(this.origin, 0));
	if (this.destination > 0) od.push(this._locationInfo(this.destination, -1));
	return od;
};

Trip.prototype.addLocation = function(location, debug) {
	delete location.altitudeAccuracy; // Property only exists on iOS
	var prev = this._getLocation(-1);

	// If we have a previous location, check that the travel speed between
	// the two locations is reasonable. If not, keep only the more
	// accurate of the two locations.
	if (prev && !location.isPausePoint) {
		var meters = this._getDistance(prev, location),
			seconds = (location.time - prev.time) / 1000;
		if ((meters / seconds) > 23) {
			return this._replaceLocation(this._moreAccurate(prev, location));
		}
	}
	return this._appendLocation(location);
};

Trip.prototype.guessODTypes = function(trips) {
  var that = this;
	if (!this.locations.length || this.origin || this.destination) return;

	var odTypes = [];
	angular.forEach(trips, function(trip) {
		odTypes.push.apply(odTypes, trip.getODTypes());
	});
	var trip = this;
	var origin = this._getLocation(0),
		destination = this._getLocation(-1),
		minOrigin = this.NEAR_THESHOLD,
		minDestination = this.NEAR_THESHOLD;

	angular.forEach(odTypes, function(odType) {
		var distOrigin = trip._getDistance(odType.location, origin),
			distDestination = trip._getDistance(odType.location, destination);

		if (distOrigin < minOrigin) {
			minOrigin = distOrigin;
			that.origin = odType.type;
		}
		if (distDestination < minDestination) {
			minDestination = distDestination;
			that.destination = odType.type;
		}
	});
};

Trip.prototype.getDistance = function(simplify) {
	if (this.locations.length < 2) return 0;
	return turf.lineDistance(this.toLineString(simplify), 'kilometers') * 1000;
};

Trip.prototype.toLineString = function(simplify) {
	var linestring = turf.linestring(this.locations.map(function(location) {
		return [location.longitude, location.latitude];
	}));
	if (simplify && linestring.geometry.coordinates.length > 2) {
		return turf.simplify(linestring, this.SIMPLIFY_TOLERANCE, false);
	}
	return linestring;
};
Trip.prototype.calcRunningTime = function(){
  var totalTime = this.endTime - this.startTime;
  for(var i = 0; i < this.locations.length -1;i++){
    if(this.locations[i].isPausePoint){
      totalTime-=this.locations[i+1].time - this.locations[i].time;
      i++
    }
  }
  return totalTime;
};
Trip.prototype.serialize = function() {
	return {
		deviceUuid: window.device.uuid,
		locations: this.locations,
		startTime: this.startTime,
		endTime: this.endTime,
		desiredAccuracy: this.desiredAccuracy,
		transit: this.transit,
		origin: this.origin,
		destination: this.destination,
		debug: this.debug,
		appVersion: this.appVersion
	};
};
