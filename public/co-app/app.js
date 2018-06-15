angular.module('counteroffer.app', [
  'xeditable',
  'ngCookies',
  'ui.router'
])
  .run(function(editableOptions) {
    editableOptions.theme = 'bs3';
  })
  .config(function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/jobs');
    $stateProvider
      .state({
        name: 'portfolio',
        url: '/portfolio',
        templateUrl: './portfolio-creator/index.html',
        controller: 'portfolioController'
      })
      .state({
        name: 'jobs',
        url: '/jobs',
        templateUrl: './jobs.html',
        controller: 'jobsController'
      });
  });