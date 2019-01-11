angular.module('counteroffer.me').directive('experience', ['$sce', function($sce) {
  return {
    templateUrl: 'html/experience.html',
    scope: {
      data: '=',
      page: '<'
    },
    link: function(scope) {
      scope.getFormattedDescription = function() {
        if (scope.data.description) {
          return $sce.trustAsHtml(scope.data.description.split('\n').join('<br>'));
        }
        return '';
      };
    }
  };
}]);
