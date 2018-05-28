angular.module('counteroffer.app', [])
  .controller('controller', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
    $scope.busy = true;
    $http.get('/jobs').then(function(response) {
      $scope.jobs = response.data;
      return $scope.jobs.map(function(job, jobix) {
        return $http.get('/jobs/' + job.id + '/messages').then(function(response) {
          const messages = response.data;
          return $scope.jobs[jobix].messages = messages;
        });
      });
    }).finally(() => {
      $scope.busy = false;
    });
    
    $scope.toggleJob = function(job) {
      job.selected = !job.selected;
      if (job.selected) {
        $timeout(function() {
          var top = $('.panel-heading[aria-expanded="true"').offset().top;
          $('#scratchPad').css('top', top).show();
        });
      } else {
        $('#scratchPad').hide();
      }
    };
  }])