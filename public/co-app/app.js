angular.module('counteroffer.app', [
  'xeditable',
  'ngCookies'
])
  .run(function(editableOptions) {
    editableOptions.theme = 'bs3';
  })
  .controller('mainController', function($scope) {
      $scope.currentPageSrc = 'dashboard/';
      $scope.show = function(pageSrc) {
        $scope.currentPageSrc = pageSrc;
      }
  });
