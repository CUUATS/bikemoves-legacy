angular.module('bikemoves')
  .service('remoteService', function($http) {
    var service = this,
      ENDPOINT = 'https://api.bikemoves.me/v0.2/', //Live Edndpoint
      // ENDPOINT = 'http://209.174.185.114:8083/v0.2/', // Debug Endpoint
      POST_CONFIG = {
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        transformRequest: []
      },
      ENUM_LABELS = {
        User: {
          Gender: [
            ['NOT_SPECIFIED', ''],
            ['MALE', 'Male'],
            ['FEMALE', 'Female'],
            ['OTHER', 'Other']
          ],
          Age: [
            ['NOT_SPECIFIED', ''],
            ['AGE_UNDER_15', 'Under 15'],
            ['AGE_15_TO_19', '15 to 19'],
            ['AGE_20_TO_24', '20 to 24'],
            ['AGE_25_TO_34', '25 to 34'],
            ['AGE_35_TO_44', '35 to 44'],
            ['AGE_45_TO_54', '45 to 54'],
            ['AGE_55_TO_64', '55 to 64'],
            ['AGE_65_TO_74', '65 to 74'],
            ['AGE_75_AND_OLDER', '75 and older']
          ],
          ExperienceLevel: [
            ['NOT_SPECIFIED', ''],
            ['BEGINNER', 'Beginner'],
            ['INTERMEDIATE', 'Intermediate'],
            ['ADVANCED', 'Advanced']
          ]
        },
        Trip: {
          LocationType: [
            ['NOT_SPECIFIED', ''],
            ['HOME', 'Home'],
            ['WORK', 'Work'],
            ['K12_SCHOOL', 'K-12 School'],
            ['UNIVERSITY', 'University'],
            ['SHOPPING', 'Shopping'],
            ['OTHER', 'Other']
          ]
        }
      },
      messages = dcodeIO.ProtoBuf.loadJsonFile('js/messages.json').build(),
      postMessage = function(url, msg) {
        return $http.post(
          ENDPOINT + url, msg.encode().toArrayBuffer(), POST_CONFIG);
      },
      getEnum = function(msgName, enumName) {
        return messages.bikemoves[msgName][enumName];
      };

    service.getOptions = function(msgName, enumName) {
      var values = getEnum(msgName, enumName),
        labels = ENUM_LABELS[msgName][enumName];
      return labels.map(function(labelInfo) {
        return {
          id: values[labelInfo[0]],
          label: labelInfo[1]
        };
      });
    };

    service.getLabel = function(msgName, enumName, value) {
      var options = service.getOptions(msgName, enumName);
      for (i = 0; i < options.length; i++) {
        if (options[i].id == value) return options[i].label;
      }
    };

    service.postUser = function(profile) {
      var userMessage = new messages.bikemoves.User({
        deviceUuid: window.device.uuid,
        platformName: ionic.Platform.platform(),
        platformVersion: ionic.Platform.version(),
        age: profile.age,
        cyclingExperience: profile.cyclingExperience,
        gender: profile.gender
      });
      return postMessage('user', userMessage);
    };

    service.postTrip = function(trip) {
      var tripMessage = new messages.bikemoves.Trip(trip.serialize());
      return postMessage('trip', tripMessage);
    };
    service.postIncident = function(incident) {
      var incidentMessage = new messages.bikemoves.Incident(incident.serialize());
      return postMessage('incident', incidentMessage);
    };
  });
