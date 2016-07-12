// Karma configuration
// Generated on Tue Jul 05 2016 13:38:39 GMT-0500 (CDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser

    files: [
      '../www/lib/ionic/js/ionic.bundle.js',
      '../www/lib/ngCordova/dist/ng-cordova-mocks.js',
      '../plugins/cordova-plugin-googlemaps/www/googlemaps-cdv-plugin.js'
      // '../www/lib/**/*.js',
      '../www/js/app.js',

      '../www/js/*.js',
      '../www/js/controllers/*.js',
      '../www/js/services/*.js',
      // '../www/lib/angular-mocks/ngMock.js',
      '../www/lib/*.js',

      '../www/lib/angular-mocks/angular-mocks.js',

      // '../www/js/*.json',
      '../tests/unit-tests/spec-service-helper.js',
      '../tests/unit-tests/services/*.js'

    ],
    // list of files to exclude
    exclude: [],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '../www/js/**/*.js': ['coverage'],
      // '../www/js/trip.js': ['coverage'],
      // '../www/js/incident.js': ['coverage'],
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha', 'coverage'],

    coverageReporter: {
      type: 'html',
      dir: '../coverage/',
      instrumenterOptions: {
        istanbul: {
          noCompact: true
        }
      }
    },

    mochaReporter:{
      output: 'error'
    },


    // web server port
    port: 9876,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


//rency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
