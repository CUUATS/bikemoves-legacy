# bikemoves
Mobile app for bicycle route recording and assistance

##Setup:  

1. Install ionic by following http://ionicframework.com/docs/guide/installation.html  
2. Open a command prompt in the directory of the project  
3. Run 'ionic state restore' to load required modules  
4. Install the cordova background geolocation plugin manually (for premium version)  
5. Run the app by following http://ionicframework.com/docs/guide/testing.html  

##Testing
###Unit tests
To run unit tests run:
```sh
npm run tests
```
This will open grunt which will run the controller tests and the service tests. They are run separately due to conflicts in the spies required to run them.

The test suites will automatically rerun on file change.

Coverage reports can be found in ./coverage.
