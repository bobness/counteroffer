angular.module('counteroffer.app')
.controller('mainController', ['$scope', '$location', 'portfolioService',
  function($scope, $location, portfolioService) {

    portfolioService.getPortfolio().then((portfolio) => {
      $scope.portfolio = portfolio;
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

    $scope.currentTheme = getSelectedTheme();

    $scope.showTheme = function(name) {
      $location.path(name);
      $scope.currentTheme = getSelectedTheme();
    };

    $scope.deleteSelectedTheme = function() {
      var name = selectedThemeName();
      return portfolioService.deleteTheme(name).then(function() {
        $scope.portfolio.themes = $scope.portfolio.themes.filter(function(theme) { return theme.name !== name; });
        $scope.showTheme('');
      });
    };
}]);
