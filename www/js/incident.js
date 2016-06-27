function Incident(category, comment, time, lat, lng) {
    this.category = category;
    this.comment = comment;
    this.time = time;
    this.position = {
      lat: lat || 0,
      lng: lng || 0
    };
}
Incident.prototype.setLocation = function(lat, lng){
  this.position = {
    lat: lat,
    lng: lng
  };
};

Incident.prototype.serialize = function() {
    return {
      deviceUuid: window.device.uuid,
      category: this.category,
      comment: this.comment,
      time: this.time,
      position: {
        latitude: this.position.lat,
        longitude: this.position.lng
      }
    };
  };
