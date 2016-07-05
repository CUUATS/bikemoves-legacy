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
      // Messages has to be directly included for unit testing to work
      messages = dcodeIO.ProtoBuf.loadJson({
          "package": "bikemoves",
          "messages": [
              {
                  "name": "User",
                  "fields": [
                      {
                          "rule": "required",
                          "type": "string",
                          "name": "deviceUuid",
                          "id": 1
                      },
                      {
                          "rule": "required",
                          "type": "string",
                          "name": "platformName",
                          "id": 2
                      },
                      {
                          "rule": "required",
                          "type": "float",
                          "name": "platformVersion",
                          "id": 3
                      },
                      {
                          "rule": "optional",
                          "type": "Gender",
                          "name": "gender",
                          "id": 4
                      },
                      {
                          "rule": "optional",
                          "type": "Age",
                          "name": "age",
                          "id": 5
                      },
                      {
                          "rule": "optional",
                          "type": "ExperienceLevel",
                          "name": "cyclingExperience",
                          "id": 6
                      }
                  ],
                  "enums": [
                      {
                          "name": "Gender",
                          "values": [
                              {
                                  "name": "NOT_SPECIFIED",
                                  "id": 0
                              },
                              {
                                  "name": "MALE",
                                  "id": 1
                              },
                              {
                                  "name": "FEMALE",
                                  "id": 2
                              },
                              {
                                  "name": "OTHER",
                                  "id": 3
                              }
                          ]
                      },
                      {
                          "name": "Age",
                          "values": [
                              {
                                  "name": "NOT_SPECIFIED",
                                  "id": 0
                              },
                              {
                                  "name": "AGE_UNDER_15",
                                  "id": 1
                              },
                              {
                                  "name": "AGE_15_TO_19",
                                  "id": 2
                              },
                              {
                                  "name": "AGE_20_TO_24",
                                  "id": 3
                              },
                              {
                                  "name": "AGE_25_TO_34",
                                  "id": 4
                              },
                              {
                                  "name": "AGE_35_TO_44",
                                  "id": 5
                              },
                              {
                                  "name": "AGE_45_TO_54",
                                  "id": 6
                              },
                              {
                                  "name": "AGE_55_TO_64",
                                  "id": 7
                              },
                              {
                                  "name": "AGE_65_TO_74",
                                  "id": 8
                              },
                              {
                                  "name": "AGE_75_AND_OLDER",
                                  "id": 9
                              }
                          ]
                      },
                      {
                          "name": "ExperienceLevel",
                          "values": [
                              {
                                  "name": "NOT_SPECIFIED",
                                  "id": 0
                              },
                              {
                                  "name": "BEGINNER",
                                  "id": 1
                              },
                              {
                                  "name": "INTERMEDIATE",
                                  "id": 2
                              },
                              {
                                  "name": "ADVANCED",
                                  "id": 3
                              }
                          ]
                      }
                  ]
              },
              {
                  "name": "Trip",
                  "fields": [
                      {
                          "rule": "required",
                          "type": "string",
                          "name": "deviceUuid",
                          "id": 1
                      },
                      {
                          "rule": "repeated",
                          "type": "Location",
                          "name": "locations",
                          "id": 2
                      },
                      {
                          "rule": "required",
                          "type": "uint64",
                          "name": "startTime",
                          "id": 3
                      },
                      {
                          "rule": "required",
                          "type": "uint64",
                          "name": "endTime",
                          "id": 4
                      },
                      {
                          "rule": "required",
                          "type": "double",
                          "name": "desiredAccuracy",
                          "id": 5
                      },
                      {
                          "rule": "required",
                          "type": "bool",
                          "name": "transit",
                          "id": 6
                      },
                      {
                          "rule": "optional",
                          "type": "LocationType",
                          "name": "origin",
                          "id": 7
                      },
                      {
                          "rule": "optional",
                          "type": "LocationType",
                          "name": "destination",
                          "id": 8
                      },
                      {
                        "rule": "optional",
                        "type": "bool",
                        "name": "debug",
                        "id": 9
                      }
                  ],
                  "messages": [
                      {
                          "name": "Location",
                          "fields": [
                              {
                                  "rule": "required",
                                  "type": "double",
                                  "name": "longitude",
                                  "id": 1
                              },
                              {
                                  "rule": "required",
                                  "type": "double",
                                  "name": "latitude",
                                  "id": 2
                              },
                              {
                                  "rule": "required",
                                  "type": "uint64",
                                  "name": "time",
                                  "id": 3
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "accuracy",
                                  "id": 4
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "altitude",
                                  "id": 5
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "heading",
                                  "id": 6
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "speed",
                                  "id": 7
                              },
                              {
                                  "rule": "optional",
                                  "type": "bool",
                                  "name": "moving",
                                  "id": 8
                              }
                          ]
                      }
                  ],
                  "enums": [
                      {
                          "name": "LocationType",
                          "values": [
                              {
                                  "name": "NOT_SPECIFIED",
                                  "id": 0
                              },
                              {
                                  "name": "HOME",
                                  "id": 1
                              },
                              {
                                  "name": "WORK",
                                  "id": 2
                              },
                              {
                                  "name": "K12_SCHOOL",
                                  "id": 3
                              },
                              {
                                  "name": "UNIVERSITY",
                                  "id": 4
                              },
                              {
                                  "name": "SHOPPING",
                                  "id": 5
                              },
                              {
                                  "name": "OTHER",
                                  "id": 6
                              }
                          ]
                      }
                  ]
              },
              {
                  "name": "Incident",
                  "fields": [
                      {
                          "rule": "required",
                          "type": "string",
                          "name": "deviceUuid",
                          "id": 1
                      },
                      {
                          "rule": "optional",
                          "type": "string",
                          "name": "comment",
                          "id": 2
                      },
                      {
                          "rule": "required",
                          "type": "uint64",
                          "name": "time",
                          "id": 3
                      },
                      {
                          "rule": "required",
                          "type": "Position",
                          "name": "position",
                          "id": 4
                      },
                      {
                          "rule": "required",
                          "type": "string",
                          "name": "category",
                          "id": 5
                      }
                  ],
                  "messages": [
                      {
                          "name": "Position",
                          "fields": [
                              {
                                  "rule": "required",
                                  "type": "double",
                                  "name": "longitude",
                                  "id": 1
                              },
                              {
                                  "rule": "required",
                                  "type": "double",
                                  "name": "latitude",
                                  "id": 2
                              },
                              {
                                  "rule": "optional",
                                  "type": "uint64",
                                  "name": "time",
                                  "id": 3
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "accuracy",
                                  "id": 4
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "altitude",
                                  "id": 5
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "heading",
                                  "id": 6
                              },
                              {
                                  "rule": "optional",
                                  "type": "double",
                                  "name": "speed",
                                  "id": 7
                              },
                              {
                                  "rule": "optional",
                                  "type": "bool",
                                  "name": "moving",
                                  "id": 8
                              }
                          ]
                      }
                  ]
              }
          ]
      }
).build(),
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
