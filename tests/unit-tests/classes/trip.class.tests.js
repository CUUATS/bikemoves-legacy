describe("Trip Class Test", function() {
	var testTrip;
	beforeEach(function() {
		testTrip = new Trip();
	})
	describe("Append Location", function() {
		it("should add a location", function() {
			testTrip._appendLocation({
				lat: 40,
				lng: 40
			})
			expect(testTrip.locations).toEqual([{
				lat: 40,
				lng: 40
			}]);
		});
	});
	describe("Replace Locations", function() {
		it("should replace a locations", function() {
			testTrip._appendLocation({
				lat: 40,
				lng: 40
			});
			testTrip._replaceLocation({
				lat: 50,
				lng: 50
			});
			expect(testTrip.locations).toEqual([{
				lat: 50,
				lng: 50
			}]);
		});
	});
	describe("To Point", function() {
		it("should return a point", function() {
			var point = testTrip._toPoint({
				latitude: 40,
				longitude: 40
			})
			expect(point).toEqual(turf.point([40, 40]))
		});
	});
	describe("Get Distance", function() {
		it("should return the correct distance", function() {
			var pt1 = {
				latitude: 40,
				longitude: 40
			};
			var pt2 = {
				latitude: 50,
				longitude: 50
			};
			var dist = testTrip._getDistance(pt1, pt2);
			expect(dist).toEqual(turf.distance(testTrip._toPoint(pt1), testTrip._toPoint(pt2), 'kilometers') * 1000);
		});
	});
	describe("More Accurate", function() {
		it("Should return the point with higher accuracy", function() {
			//Lower # indicates higher accuracy
			var pt1 = {
				accuracy: 20,
				time: 40
			};
			var pt2 = {
				accuracy: 10,
				time: 15
			};
			var moreAccurate = testTrip._moreAccurate(pt1, pt2);
			expect(moreAccurate).toEqual(pt2);
		})
		it("Should return the most recent point if tie", function() {
			var pt1 = {
				accuracy: 10,
				time: 40
			};
			var pt2 = {
				accuracy: 10,
				time: 15
			};
			var moreAccurate = testTrip._moreAccurate(pt1, pt2);
			expect(moreAccurate).toEqual(pt1);
		});
	});
	describe("Get Location", function() {
		beforeEach(function() {
			testTrip.locations = [1, 2, 3, 4, 5, 6]
		});
		it("should return corresponding point", function() {
			var point = testTrip._getLocation(3);
			expect(point).toEqual(4);
		});
		it("should rollover", function() {
			var point = testTrip._getLocation(-1);
			expect(point).toEqual(6);
		});
	});
	describe("Location Info", function() {
		beforeEach(function() {
			testTrip.locations = [1, 2, 3, 4, 5, 6]
		});
		it("should return object", function() {
			var info = testTrip._locationInfo("test", 2);
			expect(info).toEqual({
				type: "test",
				location: 3
			});
		})
	})
	describe("Get OD Types", function() {
		it("should return types", function() {
			testTrip.locations = [1, 2, 3, 4, 5, 6];
			testTrip.origin = 1;
			testTrip.destination = 3
			var types = testTrip.getODTypes();
			expect(types).toEqual([{
				type: 1,
				location: 1
			}, {
				type: 3,
				location: 6
			}])
		});
		it("should return blank if less than 2 points", function() {
			testTrip.locations = [];
			var types = testTrip.getODTypes();
			expect(types).toEqual([])
		});
	});
	describe("Add Location", function() {
		var pt1, pt2, pt3;
		beforeEach(function() {
			pt1 = {
				latitude: 40,
				longitude: 40,
				accuracy: 40,
				time: 10,
				moving: true
			}
			pt2 = {
				latitude: 41,
				longitude: 41,
				accuracy: 10,
				time: 1100,
				moving: true
			}
			pt3 = {
				latitude: 40.0001,
				longitude: 40.0001,
				accuracy: 10,
				time: 11000000,
				moving: true
			}
			pt4 = {
				latitude: 40.0001,
				longitude: 40.0001,
				accuracy: 10,
				time: 11000000,
				isPausePoint: true
			}

		})
		it("should append location if no previous", function() {
			testTrip.addLocation(pt1, false);
			expect(testTrip.locations).toEqual([pt1])
		});
		it("should replace less accurate if too fast", function() {
			testTrip._appendLocation(pt1);
			testTrip.addLocation(pt2, false);
			expect(testTrip.locations).toEqual([pt2]);
		});
		it("should replace less accurate if too close", function() {
			testTrip._appendLocation(pt1);
			testTrip.addLocation(pt3, false);
			expect(testTrip.locations).toEqual([pt3]);
		});
		it("should app point if it is a pause point", function() {
			testTrip.addLocation(pt4, false);
			expect(testTrip.locations).toEqual([pt4]);
		});
	});
	describe("Guess OD Types", function() {
		var trip1, trip2, trips;
		beforeEach(function() {
			trip1 = new Trip([{
				longitude: 40,
				latitude: 40
			}, {
				longitude: 41,
				latitude: 41
			}], 1, 2, 4, 5)
			trip2 = new Trip([{
				longitude: 40,
				latitude: 40
			}, {
				longitude: 41,
				latitude: 41
			}])
			trips = [trip1]
		})
		it("should auto determine origin", function() {
			trip2.guessODTypes(trips);
			expect(trip2.origin).toEqual(trip1.origin);
		});
		it("should auto determine destination", function() {
			trip2.guessODTypes(trips);
			expect(trip2.destination).toEqual(trip1.destination);
		});
	})
	describe("Get Distance", function() {
		it("should return total distance", function() {
			testTrip.locations = [{
				latitude: 40,
				longitude: 40
			}, {
				latitude: 50,
				longitude: 50
			}, {
				latitude: 60,
				longitude: 60
			}]
			var total = testTrip._getDistance(testTrip.locations[0], testTrip.locations[1]) + testTrip._getDistance(testTrip.locations[1], testTrip.locations[2])
			var dist = testTrip.getDistance();
			expect(Math.abs(dist - total)).toBeLessThan(1);
		});
	});
	describe("To Line String", function() {
		it("should return line string", function() {
			testTrip.locations = [{
				latitude: 40,
				longitude: 40
			}, {
				latitude: 50,
				longitude: 50
			}, {
				latitude: 60,
				longitude: 60
			}]
			var testString = turf.linestring([
				[40, 40],
				[50, 50],
				[60, 60]
			]);
			var lineString = testTrip.toLineString();
			expect(testString).toEqual(lineString);
		});
	});
	describe("Calc Running Time", function() {
    beforeEach(function(){
      testTrip.startTime = 0;
      testTrip.endTime = 30;
    })
		it("Test Case, Pause Start", function() {
			testTrip.locations = [{time: 0, isPausePoint: true},{time:10,isPausePoint:true},{time:20},{time:30}];
			var runningTime = testTrip.calcRunningTime();
			expect(runningTime).toEqual(20)
		});
    it("Test Case, Pause Middle", function(){
      testTrip.locations = [{time: 0},{time:10,isPausePoint:true},{time:20, isPausePoint: true},{time:30}];
			var runningTime = testTrip.calcRunningTime();
			expect(runningTime).toEqual(20)
    });
    it("Test Case, Pause End", function(){
      testTrip.locations = [{time: 0},{time:10},{time:20, isPausePoint: true},{time:30,isPausePoint:true}];
			var runningTime = testTrip.calcRunningTime();
			expect(runningTime).toEqual(20)
    })
	});
});
