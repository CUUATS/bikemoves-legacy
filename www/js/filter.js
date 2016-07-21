var vectorize = require('vectorize');

function gpsFilter() {}

gpsFilter.prototype.produceVectors = function(points) {
    return {
        positions: vectorize.toPositions(points), //Meters
        velocities: vectorize.toVelocities(points), //Meters / Second
        accelerations: vectorize.toAccelerations(points) //Meters / Second^2
    };
};
//Bounds Maginitude of Position Vector
gpsFilter.prototype.positionFilter = function(points, min, max) {
    var outputPoints = [];
    var positions = this.produceVectors(points).positions;
    var filtered = vectorFilter(min, max, positions);
    var j = 0;
    for (var i = 0; i < filtered.length; i++) { //Pushes points that werent removed by filter
        while (filtered[i] != positions[i + j]) {
            j++;
        }
        //Stores the two points that define the vector
        if (outputPoints.indexOf(points[i + j]) == -1)
            outputPoints.push(points[i + j]);
        if (outputPoints.indexOf(points[i + j + 1]) == -1)
            outputPoints.push(points[i + j + 1]);
    }
    return outputPoints;
};

//Bounds Magnitude of Velocity Vector
gpsFilter.prototype.velocityFilter = function(points, min, max) {
    var outputPoints = [];
    var velocities = this.produceVectors(points).velocities;
    var filtered = vectorFilter(min, max, velocities);
    var j = 0;
    for (var i = 0; i < filtered.length; i++) { //Pushes points that werent removed by filter
        while (filtered[i] != velocities[i + j]) {
            j++;
        }
        //Stores the two points that define the vector
        if (outputPoints.indexOf(points[i + j]) == -1)
            outputPoints.push(points[i + j]);
        if (outputPoints.indexOf(points[i + j + 1]) == -1)
            outputPoints.push(points[i + j + 1]);
    }
    return outputPoints;
};

//Bounds Acceleration of Acceleration Vector
gpsFilter.prototype.accelerationFilter = function(points, min, max) {
    var outputPoints = [];
    var accelerations = this.produceVectors(points).accelerations;
    var filtered = vectorFilter(min, max, accelerations);
    var j = 0;
    for (var i = 0; i < filtered.length; i++) { //Pushes points that werent removed by filter
        while (filtered[i] != accelerations[i + j]) {
            j++;
        }
        //Stores the three points that define the vector
        if (outputPoints.indexOf(points[i + j]) == -1)
            outputPoints.push(points[i + j]);
        if (outputPoints.indexOf(points[i + j + 1]) == -1)
            outputPoints.push(points[i + j + 1]);
        if (outputPoints.indexOf(points[i + j + 2]) == -1)
            outputPoints.push(points[i + j + 2]);
    }
    return outputPoints;
};

// Removes points where the angleBetween Vectors is too greater than than the sharpness
// Sharpness of 0 removes all points, 180 removes none;
gpsFilter.prototype.removeSpikes = function(points, sharpness, iterations) {
    var outputPoints = points;
    for (var k = 0; k < iterations; k++) {
        var diff = 0 ;
        var vels = this.produceVectors(outputPoints).velocities;
        for (var i = 0; i < vels.length - 1; i++) {
            if (this.angleBetween(vels[i], vels[i + 1]) > sharpness){
                outputPoints.splice(i + 1 - diff, 1);
                diff+=1;
              }
        }
    }
    return outputPoints;
};

// Checks if a vectors is ~parallel to the sum of the vectors following it
// Threshold define ~parallel 0-Must be perfectly parallel 180-All lines are considered parallel
gpsFilter.prototype.smoothLine = function(points, threshold){
  var outputPoints = points;
  var positions = this.produceVectors(points).positions;
  var diff =0;
  for(var i = 0; i < positions.length-2; i++){
    if(this.angleBetween(positions[i], positions[i+1].add(positions[i+2]))< threshold){
      outputPoints.splice(i+2 - diff,1);
      diff+=1;
    }
  }
  return outputPoints;
};
gpsFilter.prototype.angleBetween = function(vec1, vec2) {
    return (Math.acos(vec1.dot(vec2) / (vec1.magnitude() * vec2.magnitude())) * 180) / Math.PI;
};

var vectorFilter = function(min, max, vectors) {
    return vectors.filter(function(v) {
        return v.magnitude() > min && v.magnitude() < max;
    });
};
function Vectorize() {}

Vectorize.prototype.toAccelerations = function(points) {
    points = this.standardize(points);
    var velocities = this.toVelocities(points);
    var accels = [],
        time;
    for (var i = 0; i < velocities.length - 1; i++) {
        time = speedFilter.calcElapsed(points[i + 1].time, points[i + 2].time);
        accels.push(this.accelerationVector(velocities[i], velocities[i + 1], time));
    }
    return accels;
};
Vectorize.prototype.accelerationVector = function(v1, v2, time) {
    var vDif = v2.subtract(v1);
    return new Victor(vDif.x / time, vDif.y / time);
};
Vectorize.prototype.toVelocities = function(points) {
    points = this.standardize(points);
    var vectors = [];
    for (var i = 0; i < points.length - 1; i++) {
        vectors.push(this.velocityVector(points[i], points[i + 1]));
    }
    return vectors;
};
Vectorize.prototype.velocityVector = function(pt1, pt2) {
    var speed = speedFilter.calcSpeeds([pt1, pt2]),
        latDif = pt2.lat - pt1.lat,
        lngDif = pt2.lng - pt1.lng,
        x = Math.abs(speed * Math.cos(Math.atan(latDif / lngDif)));
        y = Math.abs(speed * Math.sin(Math.atan(latDif / lngDif)));
        if(pt1.lat > pt2.lat)
          y*=-1;
        if(pt1.lng > pt2.lng)
          x*=-1;
    return new Victor(x, y);
};
Vectorize.prototype.toPositions = function(points) {
    points = this.standardize(points);
    var vectors = [];
    for (var i = 0; i < points.length - 1; i++) {
        vectors.push(this.positionVector(points[i], points[i + 1]));
    }
    return vectors;
};
Vectorize.prototype.positionVector = function(pt1, pt2) {
    var dist = getDistance(pt1.lat, pt1.lng, pt2.lat, pt2.lng),
        latDif = Math.abs(pt1.lat - pt2.lat),
        lngDif = Math.abs(pt1.lng - pt2.lng),
        x = dist * Math.cos(Math.atan(latDif / lngDif)),
        y = dist * Math.sin(Math.atan(latDif / lngDif));
    return new Victor(x, y);
};
Vectorize.prototype.standardize = function(points) {
    return points.map(function(v) {
        var obj;
        if (v.hasOwnProperty('lat'))
            obj = {
                lat: v.lat,
                lng: v.lng
            };
        if (v.hasOwnProperty('latitude'))
            obj = {
                lat: v.latitude,
                lng: v.longitude
            };
        if (v.hasOwnProperty('y'))
            obj = {
                lat: v.y,
                lng: v.x
            };
        if (v.hasOwnProperty('time'))
            obj.time = v.time;
        if (v.hasOwnProperty('timestamp'))
            obj.time = v.timestamp;
        if (v.hasOwnProperty('starttime'))
            obj.time = v.starttime;
        return obj;
    });
};

var getDistance = function(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in Meters
};
var deg2rad = function deg2rad(deg) {
    return deg * (Math.PI / 180);
};
speedFilter.prototype.calcSpeeds = function(points) {
    var elapsed = [],
        distances = this.calcDists(points);
    for (var i = 0; i < points.length - 1; i++) {
        elapsed.push(this.calcElapsed(points[i].time, points[i + 1].time));
    }
    return distances.map(function(v, i) {
        return v / elapsed[i]; //Speeds are in meters per second;
    });
};
speedFilter.prototype.filter = function(points, lowBound, highBound) {
    points = points.slice();
    var speeds = this.calcSpeeds(points);
    for (var i = 0; i < speeds.length; i++) {
        while (speeds[i] < lowBound || speeds[i] > highBound) {
            if (i >= speeds.length)
                break;
            points.splice(i + 1, 1);
            speeds = this.calcSpeeds(points);
        }
    }
    return points;
};
speedFilter.prototype.calcElapsed = function(time1, time2) {
    time1 = moment(time1);
    time2 = moment(time2);
    return Math.abs(time1.diff(time2, "seconds")); // returns difference in seconds;
};
speedFilter.prototype.calcDists = function(points) {
    var dists = [];
    for (var i = 0; i < points.length - 1; i++) {
        dists.push(this.dist(points[i], points[i + 1]));
    }
    return dists;
};
speedFilter.prototype.dist = function(pt1, pt2) {
    if (pt1.hasOwnProperty('x')) {
        return getDistance(pt1.y, pt1.x, pt2.y, pt2.x);
    }
    if (pt1.hasOwnProperty('lat')) {
        return getDistance(pt1.lat, pt1.lng, pt2.lat, pt2.lng);
    }
    if (pt1.hasOwnProperty('latitude')) {
        return getDistance(pt1.latitude, pt1.longitude, pt2.latitude, pt2.longitude);
    }
};

module.exports = exports = new gpsFilter();
