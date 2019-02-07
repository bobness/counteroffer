angular.module('counteroffer.app')
.controller('mainController', ['$scope', '$location', '$cookies', '$http', 'portfolioService',
  function($scope, $location, $cookies, $http, portfolioService) {

    portfolioService.getPortfolio().then((portfolio) => {
      $scope.portfolio = portfolio;
      $scope.currentTheme = getSelectedTheme();
    });

    $scope.themeIsSelected = function(name) {
      if (name) {
        return selectedThemeName() === name;
      }
      if ($scope.portfolio) {
        return $scope.portfolio.themes.map(function(theme) { return theme.name; }).indexOf(selectedThemeName()) > -1;
      }
      return false;
    };

    var selectedThemeName = function() {
      return $location.path().substring(1);
    };

    var getSelectedTheme = function() {
      var themeName = selectedThemeName();
      if ($scope.portfolio) {
        var theme = $scope.portfolio.themes.filter(function(theme) { return theme.name === themeName; })[0];
        return theme;
      }
    };

    $scope.showTheme = function(name) {
      $location.path(name);
      $scope.currentTheme = getSelectedTheme();
    };

    var username = $cookies.get('username'),
        session = $cookies.get('session');
    if (username && session) {
      $scope.selectedJob = null;
      $scope.newMessage = {
        value: '',
        username: username
      };
      $scope.busy = true;
      // $http.get('/jobs').then(function(response) {
      //   $scope.jobs = response.data;
      //   $scope.factClasses = refreshFactClasses($scope.jobs);
      //   var params = $location.search();
      //   var jobID = Number(params.job);
      //   sortByKey = params.sort;
      //   if (jobID) {
      //     $scope.selectedJob = $scope.jobs.filter(function(job) { return job.id == jobID; })[0];
      //     $timeout(function() {
      //       $(`#collapse${jobID}`).collapse('show');
      //       $anchorScroll(`heading${jobID}`);
      //     });
      //   }
      // }).finally(() => {
      //   $scope.busy = false;
      // });
    } else {
      $scope.notLoggedIn = true;
    }

    $scope.login = function(username, password) {
      return $http.post('/api/session', {
        email: email,
        password: password
      }).then(function(response) {
        var session = response.data;
        $cookies.put('session', session);
        $cookies.put('email', email);
        location.reload();
      });
    };
}]);
