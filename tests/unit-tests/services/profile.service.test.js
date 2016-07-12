describe("Profile Service Test", function() {
  var service, storageService, q;
  beforeEach(inject(function(profileService, _storageService_) {
    service = profileService;
    storageService = _storageService_;
  }));
  beforeEach(function() {
    storageService.initalizeDb(true);
    service.clearAll();
  });
  describe("Get Profile", function() {
    it("should return profile", function() {
      service.getProfile().then(function(profile) {
        expect(profile.age).toEqual(0);
        expect(profile.sex).toEqual(0);
        expect(profile.cyclingExperience).toEqual(0);
      });
      rootScope.$digest();
    });
  });
  describe("Update Profile", function() {
    it("should update profile", function() {
      profile = {
        age: 1,
        cyclingExperience: 2,
        sex: 3
      };
      service.updateProfile(profile).then(function(res) {
        service.getProfile().then(function(newProfile) {
          expect(newProfile.age).toEqual(profile.age);
          expect(newProfile.sex).toEqual(profile.sex);
          expect(newProfile.cyclingExperience).toEqual(profile.cyclingExperience);
        });
      });
      rootScope.$digest();
    });
  });
  describe("Clear Profile", function() {
    it("should delete profile", function() {
      profile = {
        age: 1,
        cyclingExperience: 2,
        sex: 3
      };
      service.updateProfile(profile).then(function(res) {
        service.clearAll();
        service.getProfile().then(function(profile) {
          expect(profile.age).toEqual(0);
          expect(profile.sex).toEqual(0);
          expect(profile.cyclingExperience).toEqual(0);
        });
      })
      rootScope.$digest();
    })
  });
});
