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
      '../www/lib/ngCordova/dist/*.js',
      '../www/lib/karma-read-json/karma-read-json.js',
      // '../www/lib/**/*.js',
      '../www/js/app.js',

      '../www/js/*.js', {
        pattern: "../www/js/messages.json",
        included: false
      },
      '../www/js/controllers/*.js',
      '../www/js/services/*.js',
      // '../www/lib/angular-mocks/ngMock.js',
      '../www/lib/*.js',

      '../www/lib/angular-mocks/angular-mocks.js',

      // '../www/js/*.json',
      '../tests/unit-tests/spec-helper.js',
      '../tests/unit-tests/**/*.js'

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
    reporters: ['dots', 'coverage'],

    coverageReporter: {
      type: 'html',
      dir: '../coverage/',
      instrumenterOptions: {
        istanbul: {
          noCompact: true
        }
      }
    },

    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
