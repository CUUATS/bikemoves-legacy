describe("Map Service Test", function() {
	var service, storageService, map;
	var tileOverlay, infoMarker, tripPolyline, currentIncidentMarker;
	SERVICE_ENDPOINT = 'http://utility.arcgis.com/usrsvcs/servers/c9e754f1fc35468a9392372c79452704/rest/services/CCRPC/BikeMovesBase/MapServer';

	beforeEach(inject(function(mapService, _storageService_) {
		service = mapService;
		storageService = _storageService_;
	}));
	beforeEach(inject(function($q) {
		window.plugin = {
			google: {
				maps: {
					Map: {
						getMap: jasmine.createSpy("getMap").and.callFake(function() {
							return {
								addMarker: jasmine.createSpy("addMarker").and.callFake(function() {
									return {
										setPosition: function() {}
									};
								}),
								addEventListener: jasmine.createSpy("addEventListener").and.callFake($q.resolve())
							};
						})
					},
					event: {
						MAP_READY: "",
						CAMERA_CHANGE: "",
						MAP_CLICK: ""
					}
				}
			}
		};
		map = {
			mapFeatures: [
				jasmine.createSpyObj("tileOverlay", ["setPosition", "setVisible"]),
				jasmine.createSpyObj("infoMarker", ["addMarker", "setVisible"]),
				jasmine.createSpyObj("currentLocationMarker", ["setPosition", "setVisible"]),
				jasmine.createSpyObj("tripPolyline", ["setPoints", "getPoints", "setVisible"]),
				jasmine.createSpyObj("currentIncidentMarker", ["addMarker","setVisible"]),
			],
			on: jasmine.createSpy("on"),
			setCenter: jasmine.createSpy("setCenter"),
			animateCamera: jasmine.createSpy("animateCamera"),
			getCameraPosition: jasmine.createSpy("getCameraPosition"),
			setClickable: jasmine.createSpy("setClickable"),
			moveCamera: jasmine.createSpy("moveCamera"),
			setDiv: jasmine.createSpy("setDiv"),
			getLicenseInfo: jasmine.createSpy("getLicenseInfo")

		};
		tileOverlay = map.mapFeatures[0];
		infoMarker = map.mapFeatures[1];
		tripPolyline = map.mapFeatures[3];
    currentIncidentMarker = map.mapFeatures[4]
		// spyOn(service, "initMap").and.returnValue($q.when())
		spyOn(service, "location2LatLng").and.callFake(function(location) {
			return {
				lat: location.lat,
				lng: location.lng
			};
		});
		httpBackend.expect("GET", SERVICE_ENDPOINT + "?f=json")
			.respond(200, {
				data: 'value'
			});

		storageService.initalizeDb(true);
		service.testMap(map);
	}));
	describe("Initalize Map", function() {

	});
	describe("Set Current Location", function() {
		beforeEach(function() {
			service.setCurrentLocation({
				latitude: 40,
				longitude: 40
			});
			rootScope.$digest();
		});
		it("should set current location marker", function() {
			expect(service.currentLocation).toEqual({
				latitude: 40,
				longitude: 40
			});
		});
		it("should set marker to visible", function() {
			expect(service.currentLocationMarker.setVisible).toHaveBeenCalledWith(true);
		});
	});
	describe("Set Center", function() {
		it("should set center to location if duration is 0", function() {
			service.setCenter({
				lat: 40,
				lng: 40
			}, 0);
			rootScope.$digest();
			expect(map.setCenter).toHaveBeenCalledWith({
				lat: 40,
				lng: 40
			});
		});
		it("should animate camera with duration length", function() {
			var promise = service.setCenter({
				lat: 40,
				lng: 40
			}, 1);
			promise.then(function() {
				expect(map.getCameraPosition).toHaveBeenCalled();
				expect(true).toBeFalsy();
			});
			genPromise.resolve();
			rootScope.$apply();
			genPromise.resolve();
			// TODO: Figure out why this doesnt trigger the expect
		});
	});
	describe("Set Clicakable", function() {
		it("should set map clickable state", function() {
			service.setClickable(true);
			rootScope.$digest();
			expect(map.setClickable).toHaveBeenCalledWith(true);
		});
	});
	describe("Zoom to trip Polyline", function() {
		it("should move camer to Polyline", function() {
			service.zoomToTripPolyline();
			rootScope.$digest();
			expect(map.moveCamera).toHaveBeenCalled();

		});
	});
	describe("Reset Map", function() {
		it("should always hide elements", function() {
			service.resetMap("newType");
			rootScope.$digest();
			expect(infoMarker.setVisible).toHaveBeenCalledWith(false);
			expect(tripPolyline.setVisible).toHaveBeenCalledWith(false);
			expect(service.currentLocationMarker.setVisible).toHaveBeenCalledWith(false);
		});
		describe("same map", function() {
			beforeEach(function() {
				service.MAP_TYPE_CURRENT = "1";
				service.resetMap("1");
				rootScope.$digest();
			});
			it("should leave tileOverlay", function() {
				expect(tileOverlay.setVisible).toHaveBeenCalledWith(true);
			});
		});
		describe("new map", function() {
			beforeEach(function() {
				service.MAP_TYPE_CURRENT = "1";
				service.resetMap("2");
				rootScope.$digest();
			});
			it("should hide tileOverlay", function() {
				expect(tileOverlay.setVisible).toHaveBeenCalledWith(false);
			});
		});
	});
	describe("Get Legal Text", function() {
		it("should return License info", function() {
			service.getLegalText();
			expect(map.getLicenseInfo).toHaveBeenCalled();
		});
	});
	describe("Set Map State", function() {
		it("should set map state to input", function() {
			service.setMapState("report");
			expect(service.isReporting).toBeTruthy();
		});
		it("should set map to normal as default", function() {
			service.setMapState(null);
			expect(service.isReporting).toBeFalsy();
		});
	});
	describe("Remove Incident", function() {
		it("should hide marker", function() {
			service.removeIncident();
			expect(currentIncidentMarker.setVisible).toHaveBeenCalledWith(false);
		});
	});
});
