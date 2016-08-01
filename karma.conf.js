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


    // list of files to exclude
    exclude: [],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      './www/js/**/*.js': ['coverage'],
      // '../www/js/trip.js': ['coverage'],
      // '../www/js/incident.js': ['coverage'],
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha', 'coverage'],

    coverageReporter: {
      type: 'html',
      dir: './coverage/',
      instrumenterOptions: {
        istanbul: {
          noCompact: true
        }
      }
    },

    mochaReporter:{
      output: 'minimal'
    },


    // web server port
    port: 9876,


    // enable / disable watching file and executing tests whenever any file changes
    // autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


//rency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  });
};
