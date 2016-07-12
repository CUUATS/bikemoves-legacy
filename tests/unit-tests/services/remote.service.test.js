describe("Remote Service Test", function() {
  var service, messages = {
    bikemoves: {
      Trip: function() {}
    }
  }, post;
  beforeEach(inject(function(remoteService) {
    service = remoteService;
  }));
  beforeEach(function() {
    window.device = {
      uuid: "SAAMPLEUIUD"
    }
    window.ionic.Platform.platform = function() {
      return "ANDROID";
    }
    window.ionic.Platform.version = function() {
        return 6.01;
      }
      post = spyOn(service, "postMessage")
  });
  describe("Post Message", function() {
    it("should post to server", function() {
      post.and.callThrough();
      var url = "trips";
      httpBackend.when("POST", "https://api.bikemoves.me/v0.2/" + url)
        .respond(200, "S")

      var response = service.postMessage(url, {
        encode: function() {
          return {
            toArrayBuffer: function() {
              return;
            }
          };
        }
      });
      expect(httpBackend.flush).not.toThrow();
    });
  });

  describe("Post User", function() {
    it("should create a message", function() {
      var profile = {
        age: 2,
        cyclingExperience: 3,
        gender: 1
      };
      service.postUser(profile);
      expect(service.postMessage.calls.argsFor(0)[0]).toEqual("user");
    });
  });
  describe("Post Trip", function() {
    it("should create a message", function() {
      // TODO: Figure out how to get around long js error
    });
  });
  describe("Post Incident", function() {
    it("should create a message", function() {
      service.postIncident(new Incident());
      expect(service.postMessage.calls.argsFor(0)[0]).toEqual("incident");
    });
  });
});
