mapboxgl.accessToken = 'pk.eyJ1IjoiY3V1YXRzIiwiYSI6ImNpbm03NGFrdTB6ZTB1a2x5MHl6dTV6MXIifQ.Aq-CCCulBhKbmLGZUH6VDw';

function Map(containerId, options) {
  this.options = options || {};
  this.containerId = containerId;
  this.loaded = false;

  // Create the map.
  this.map = new mapboxgl.Map({
      container: containerId,
      style: this.MAP_STYLE,
      zoom: this.DEFAULT_ZOOM,
      center: this.DEFAULT_LOCATION
  });

  // Add navigation control.
  new mapboxgl.NavigationControl().addTo(this.map);

  // Set up event handlers.
  var obj = this;
  this.map.on('click', function(e) {
    if (obj.options.interactive) obj._onMapClick(e);
    if (obj.options.onClick) obj.options.onClick(e);
  });

  // Add the trip source and layer.
  this.map.on('load', function() {
    obj._addTripSource();
    obj._addTripLayer();
    obj.loaded = true;
    if (obj.options.onLoad) obj.options.onLoad();
  });
}

Map.prototype.DEFAULT_LOCATION = [-88.227203, 40.109403];
Map.prototype.DEFAULT_ZOOM = 16;
Map.prototype.MAP_STYLE =
  'http://tileserver.bikemoves.me/styles/bikemoves-v1.json';
Map.prototype.POPUP_FIELDS = [
	{name: 'path_type', label: 'Path Type'},
	{name:'rack_type', label: 'Rack Type'},
	{name:'is_covered', label: 'Covered'},
	{name:'location', label: 'Location'},
	{name:'phone', label: 'Phone'}
];
Map.prototype.BIKEMOVES_LAYERS = [
  'bikemoves_bike_rack',
  'bikemoves_bike_repair_retail',
  'bikemoves_bike_path'
];

Map.prototype._onMapClick = function(e) {
  var features = this._getFeaturesNear(e.point, 10);
  if (!features.length) return;

  var feature = features[0],
    popupPoint = this._snapToFeature(feature, e.lngLat),
    popupContent = this._getPopupContent(feature);

  var popup = new mapboxgl.Popup()
    .setLngLat(popupPoint)
    .setHTML(popupContent)
    .addTo(this.map);

  this.map.flyTo({
    center: popupPoint
  });
};

Map.prototype._getFeaturesNear = function(point, distance) {
  // First try querying using the exact point that was tapped.
  var features = this.map.queryRenderedFeatures(point, {
    layers: this.BIKEMOVES_LAYERS
  });
  if (features.length) return features;

  // Fallback to querying around the point that was tapped.
  return this.map.queryRenderedFeatures([
    [point.x - distance, point.y + distance],
    [point.x + distance, point.y - distance]
  ], {
    layers: this.BIKEMOVES_LAYERS
  });
};

Map.prototype._snapToFeature = function(feature, lngLat) {
  if (feature.geometry.type == 'Point') {
    return feature.geometry.coordinates;
  } else if (feature.geometry.type == 'LineString') {
    var nearest = turf.pointOnLine(
      feature, turf.point([lngLat.lng, lngLat.lat]));
    return nearest.geometry.coordinates;
  }
  return lngLat;
};

Map.prototype._getPopupContent = function(feature) {
  var props = feature.properties,
    headline = (feature.layer.id == 'bikemoves_bike_rack') ?
    'Bike Rack' : props.name;
  var content = '<h2>' + headline + '</h2>';
  angular.forEach(this.POPUP_FIELDS, function(field) {
    if (field.name in props && props[field.name]) {
      content += '<p class="feature-field"><strong class="field-name">' +
        field.label + ':</strong> <span class="field-value">' +
        props[field.name] + '</span></p>';
    }
  });
  return content;
};

Map.prototype._addTripSource = function() {
  this.map.addSource('trip', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });
  this.tripSource = this.map.getSource('trip');
};

Map.prototype._addTripLayer = function() {
  this.map.addLayer({
    id: 'bikemoves-trip',
    type: 'line',
    source: 'trip',
    paint: {
      'line-color': '#FBB03B',
      'line-width': {
        base: 1.4,
        stops: [
          [6, 0.5],
          [20, 30]
        ]
      }
    }
  });
};

Map.prototype.setInteractive = function(interactive) {
  this.options.interactive = interactive;
};

Map.prototype.locationToLngLat = function(location) {
  return [location.longitude, location.latitude];
};

Map.prototype.setCurrentLocation = function(location) {
  if (!this.currentLocationMarker) {
    this.currentLocationMarkerEl = document.createElement('div');
    this.currentLocationMarkerEl.id = 'current-location-marker';
    this.currentLocationMarker = new mapboxgl.Marker(
      this.currentLocationMarkerEl, {
        offset: [-15, -15]
    }).setLngLat(this.locationToLngLat(location)).addTo(this.map);
  } else {
    this.currentLocationMarker.setLngLat(this.locationToLngLat(location));
  }
};

Map.prototype.setCenter = function(location) {
  this.map.flyTo({
    center: this.locationToLngLat(location)
  });
};

Map.prototype.setTrip = function(linestring) {
  this.tripLinestring = linestring;
  this.tripSource.setData({
    type: 'FeatureCollection',
    features: [linestring]
  });
};

Map.prototype.zoomToTrip = function() {
  // if (!this.tripLinestring) return;
  // var bbox = turf.bbox(this.tripLinestring);
  // this.map.fitBounds([bbox.slice(0, 2), bbox.slice(2)]);
};
