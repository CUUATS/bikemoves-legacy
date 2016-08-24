describe('Map Controller Test', function() {
  var MapCtrl;
  beforeEach(inject(function($rootScope, $controller, $q) {
    scope = $rootScope.$new();
    confirm = $q.defer();
    scope.status = {};
    MapCtrl = $controller('MapCtrl', {
      $scope: scope,
    });
    spyOn(MapCtrl, "resetTrip").and.callThrough();
  }));
  describe("Start Recording", function() {
    it("should clear database and start recording if stopped", function() {
      scope.status.isStopped = true;
      scope.startRecording();
      expect(locationServiceMock.clearDatabase).toHaveBeenCalled();
    });
    it("should set status to recording", function() {
      scope.status.isStopped = false;
      scope.startRecording();
      expect(scope.status.isRecording).toBeTruthy();
    });
  });
  describe("Pause Recording", function() {
    beforeEach(function() {
      scope.pauseRecording();
    });
    it("should set status to paused", function() {
      expect(scope.status.isPaused).toBeTruthy();
    });
    it("should add a pause point", function(){
      genPromise.resolve({lat:40, lng:40})
      scope.$digest();
      expect(scope.trip.locations).toEqual([{lat: 40, lng: 40, isPausePoint: true}])
    })
  });
  describe("Stop Recording", function() {
    beforeEach(function() {
      scope.stopRecording();
    });
    it("should set status to paused", function() {
      expect(scope.status.isPaused).toBeTruthy();

    });
    it("should call analytics event", function() {
      expect(analyticsServiceMock.trackEvent).toHaveBeenCalledWith("Trip", 'Stopped Recording');
    });
    it("should open modal", function() {
      genPromise.resolve();
      scope.$digest();
      expect(tripSubmitModal.show).toHaveBeenCalled();
    });
  });
  describe("Submit Trip", function() {
    beforeEach(function() {
    });
    it("should call analytics event", function() {
      scope.submitTrip();
      expect(analyticsServiceMock.trackEvent).toHaveBeenCalledWith("Trip", 'Submitted Trip');
    });
    it("should hide modal", function() {
      scope.submitTrip();
      expect(tripSubmitModal.hide).toHaveBeenCalled();
    });
    it("should set status to stopped", function() {
      scope.submitTrip();
      expect(scope.status.isStopped).toBeTruthy();
    });
    it("should submit trip if trip has length", function() {
      scope.trip.locations = [1, 2];
      scope.submitTrip();
      genPromise.resolve({
        status: 200
      });
      expect(remoteServiceMock.postTrip).toHaveBeenCalled();
    });
    it("should save trip if trip has no length", function() {
      scope.submitTrip();

      expect(tripServiceMock.saveTrip).toHaveBeenCalledWith();
    });
    describe("On Connction Failure", function() {
      beforeEach(function() {
        scope.trip.locations = [1, 2];
        scope.submitTrip();
        genPromise.resolve({
          status: 202
        });
        scope.$digest();
      })
      it("should report error if status isn't 200", function() {
        expect(ionicPopupMock.alert).toHaveBeenCalled();
      })
      it("should report error if promise rejects", function() {
        expect(ionicPopupMock.alert).toHaveBeenCalled();
      })
      it("should save trip", function(){
        expect(tripServiceMock.saveTrip).toHaveBeenCalledWith(scope.trip)
      })
    })
  });
  describe("Save Trip", function() {
    beforeEach(function() {
      scope.saveTrip();
    });
    it("should save trip", function() {
      expect(tripServiceMock.saveTrip).toHaveBeenCalled();
    });
    it("should set status to stopped", function() {
      expect(scope.status.isStopped).toBeTruthy();
    });
    it("should hide modal", function() {
      expect(tripSubmitModal.hide).toHaveBeenCalled();
    });
  });
  describe("Resume Trip", function() {
    beforeEach(function() {
      scope.resumeTrip();
    });
    it("should set status to recording", function() {
      expect(scope.status.isRecording).toBeTruthy();
    });
    it("should hide modal", function() {
      expect(tripSubmitModal.hide).toHaveBeenCalled();
    });
  });
  describe("Discard Trip", function() {
    beforeEach(function() {
      scope.discardTrip();
    });
    it("should reset the trip", function() {
      expect(MapCtrl.resetTrip).toHaveBeenCalled();
    });
    it("should set status to stopped", function() {
      expect(scope.status.isStopped).toBeTruthy();
    });
    it("should hide modal", function() {
      expect(tripSubmitModal.hide).toHaveBeenCalled();
    });
  });
  describe("Get Current Position", function() {
    beforeEach(function() {
      scope.getCurrentPosition();
    });
    it("should call get current position", function() {
      expect(locationServiceMock.getCurrentPosition).toHaveBeenCalled();
    });
  });
  describe("On Modal Hidden", function() {
    beforeEach(function() {
      scope.$emit("modal.hidden");
      scope.$digest();
    });
    it("should set map to clickable", function() {
      expect(mapServiceMock.setClickable).toHaveBeenCalledWith(true);
    });
  });
  describe("On Modal destroy", function() {
    beforeEach(function() {
      scope.$emit("$destroy");
      scope.$digest();
    });
    it("should remove trip submit modal", function() {
      expect(tripSubmitModal.remove).toHaveBeenCalled();
    });
    it("shoul remove incident report modal", function() {
      expect(incidentReportModal.remove).toHaveBeenCalled();
    });
  });
  describe("On Incident Report", function() {
    beforeEach(function() {
      scope.$emit("IncidentReport", "SDF");
      scope.$digest();
    });
    it("should map to unclickable", function() {
      expect(mapServiceMock.setClickable).toHaveBeenCalledWith(false);
    });
    it("should get an address on success", function() {
      expect(incidentServiceMock.getAddress).toHaveBeenCalled();
      genPromise.resolve("1776 Washington");
      scope.$digest();
      expect(scope.incidentAddress).toBe("1776 Washington");
    });
    it("should still open modal on failure", function() {
      expect(incidentServiceMock.getAddress).toHaveBeenCalled();
      genPromise.reject();
      scope.$digest();
      expect(ionicPopupMock.confirm).toHaveBeenCalled();
    });
    describe("Incident Popup", function() {
      beforeEach(function() {
        genPromise.reject();
        scope.$digest();
      });
      it("should open incident modal on success", function() {
        confirm.resolve(true);
        scope.$digest();
        expect(mapServiceMock.setMapState).toHaveBeenCalled();
      });
      it("should set map to clickable on reject", function() {
        confirm.resolve(false);
        scope.$digest();
        expect(mapServiceMock.setClickable).toHaveBeenCalledWith(true);
      });
      it("should remove marker", function() {
        confirm.resolve(false);
        scope.$digest();
        expect(mapServiceMock.removeIncident).toHaveBeenCalled();
      });
    });
  });
  describe("Submit Incident", function() {
    beforeEach(function() {
      scope.submitIncident();
    });
    it("should call analytics event", function() {
      expect(analyticsServiceMock.trackEvent).toHaveBeenCalledWith("Incident", "Submitted Incident");
    });
    it("should save incident", function() {
      expect(incidentServiceMock.saveIncident).toHaveBeenCalled();
    });
    it("should hide modal", function() {
      expect(incidentReportModal.hide).toHaveBeenCalled();
    });
    it("should reset form", function() {
      expect(scope.incident.category).toBe("None");
    });
  });
  describe("Discard Incident", function() {
    beforeEach(function() {
      scope.discardIncident();
    });
    it("should hide modal", function() {
      expect(incidentReportModal.hide).toHaveBeenCalled();
    });
    it("should reset form", function() {
      expect(scope.incident.category).toBe("None");
    });
  });
  describe("On View", function() {
    beforeEach(function() {
      scope.$emit("$ionicView.enter");
      scope.$digest();
    });
    it("should reset the map", function() {
      expect(mapServiceMock.resetMap).toHaveBeenCalled();
    });
    it("should get settings", function() {
      expect(settingsServiceMock.getSettings).toHaveBeenCalled();
    });
  });
  describe("Watch for Bike Crashes", function() {
    it("should warn user", function() {
      scope.incident.Ui = "crash";
      scope.$digest();
      expect(ionicPopupMock.alert).toHaveBeenCalled();
    });
  });
  describe("Report Incident Button", function() {
    describe("Not recording", function() {
      beforeEach(function() {
        scope.status.isRecording = false;
      });
      it("should change state to normal if reporting", function() {
        scope.isReport = true;
        scope.reportIncident();
        expect(mapServiceMock.setMapState).toHaveBeenCalledWith('normal');
      });

      it("should change state to report if normal", function() {
        scope.isReport = false;
        scope.reportIncident();
        expect(mapServiceMock.setMapState).toHaveBeenCalledWith('report');

      });
      it("should call analytics event if normal", function() {
        scope.isReport = false;
        scope.reportIncident();
        expect(analyticsServiceMock.trackEvent).toHaveBeenCalledWith("Incident", "Entered Reporting State");

      });
    });
  });
  describe("Wifi Watchers", function() {
    it("should post on connect", function() {
      scope.$emit("$cordovaNetwork:online");
      scope.$digest();
      expect(incidentServiceMock.postUnposted).toHaveBeenCalled();
    });
    it("should set state to offline on disconnect", function() {
      scope.$emit("$cordovaNetwork:offline");
      scope.$digest();
      expect(scope.online).toBeFalsy();
    });
  });

  describe("Update Map", function() {
    beforeEach(function() {
      MapCtrl.currentLocation = "here"
      MapCtrl.updateMap();
    })
    it("should update map location", function() {
      expect(mapServiceMock.setCurrentLocation).toHaveBeenCalledWith("here");
      expect(mapServiceMock.setCenter).toHaveBeenCalledWith("here")
    })
  })
});
