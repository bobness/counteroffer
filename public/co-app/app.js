angular.module('counteroffer.app', [])
  .controller('controller', ['$scope', '$http', function($scope, $http) {
    $scope.busy = true;
    $http.get('/jobs').then(function(response) {
      $scope.jobs = response.data;
      return $scope.jobs.map(function(job, jobix) {
        return $http.get('/jobs/' + job.id + '/facts').then(function(response) {
          const facts = response.data;
          return $scope.jobs[jobix].facts = facts;
        });
      });
    }).finally(() => {
      $scope.busy = false;
    });
  }])