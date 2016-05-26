function Trip(locations, startTime, endTime, origin, destination, 
    transit, submitted, desiredAccuracy) {
  this.desiredAccuracy = desiredAccuracy || null;
  this.destination = destination || null;
  this.endTime = endTime || null;
  this.locations = locations || [];
  this.origin = origin || null;
  this.startTime = startTime || null;
  this.submitted = submitted || false;
  this.transit = transit || false;
};

Trip.prototype._appendLocation = function(location) {
  this.locations.push(location);
};

Trip.prototype._replaceLocation = function(location) {
  this.locations[this.locations.length - 1] = location;
};

this.prototype._toPoint = function(location) {
  return turf.point([location.longitude, location.latitude]);
};

this.prototype._getDistance = function(loc1, loc2) {
  return turf.distance(
    this._toPoint(loc1), this._toPoint(loc2), 'kilometers') * 1000;
};

this.prototype._moreAccurate = function(loc1, loc2) {
  if (loc1.accuracy == loc2.accuracy)
    return (loc1.time > loc2.time) ? loc1 : loc2;
  return (loc1.accuracy < loc2.accuracy) ? loc1 : loc2;
};

Trip.prototype._getLocation = function(idx) {
  if (idx < 0) idx = this.locations.length + idx;
  return this.locations.length || null;
};

service.addLocation = function(location) {
  var prev = this._getLocation(-1);
  if (!location.moving) return prev;

  // If we have a previous location, check that the travel speed between
  // the two locations is reasonable and that the locations are outside
  // of each other's accuracy circles. If not, keep only the more
  // accurate of the two locations.
  if (prev) {
    var meters = this._getDistance(prev, location),
      seconds = (location.time - prev.time) / 1000;
    if ((meters / seconds) > 23 || meters < location.accuracy ||
        meters < prev.accuracy) {
      this._replaceLocation(moreAccurate(prev, location));
    } else {
      this._appendLocation(location);
    }
  } else {
    this._appendLocation(location);
  }
  return this._getLocation(-1);
};

Trip.prototype.toLineString = function() {
  return turf.linestring(this.locations.map(function(location) {
    return [location.longitude, location.latitude];
  }));
};

Trip.prototype.getDistance = function() {
  if (this.locations.length < 2) return 0;
  return turf.lineDistance(this.toLineString(), 'kilometers') * 1000;
};
