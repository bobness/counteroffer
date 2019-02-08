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

    $scope.email = $cookies.get('email');
    $scope.session = $cookies.get('session');
    if (!$scope.email || !$scope.session) {
      $scope.notLoggedIn = true;
    }

    $scope.login = function(email, password) {
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
