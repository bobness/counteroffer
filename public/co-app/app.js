angular.module('counteroffer.app', [
  'xeditable',
  'ngCookies'
])
  .run(function(editableOptions) {
    editableOptions.theme = 'bs3';
  })
  .controller('controller', [
    '$scope', '$http', '$timeout', '$q', '$cookies', '$sce', '$location', '$anchorScroll',
    function($scope, $http, $timeout, $q, $cookies, $sce, $location, $anchorScroll) {
      
    $scope.path = $location.path().substr(1);
    
    $scope.setPath = function(path) {
      $location.path(path);
      $scope.path = path;
    };
    
    $scope.newJob = {
      email: '',
      messages: []
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
      $http.get('/jobs').then(function(response) {
        $scope.jobs = response.data;
        var jobID = Number($location.search().job);
        if (jobID) {
          $scope.selectedJob = $scope.jobs.filter(function(job) { return job.id == jobID; })[0];
          $timeout(function() {
            $(`#collapse${jobID}`).collapse('show');
            $anchorScroll(`heading${jobID}`);
          });
        }
      }).finally(() => {
        $scope.busy = false;
      });
    } else {
      $scope.notLoggedIn = true;
    }
    
    $scope.login = function(username, password) {
      return $http.post('/session', {
        username: username,
        password: password
      }).then((response) => {
        var session = response.data;
        $cookies.put('session', session);
        $cookies.put('username', username);
        location.reload();
      });
    };
    
    $scope.sendMessage = function(message, job, archive) {
      var body = {
        message: message,
        email: job.email,
        archive: archive || false
      };
      return $http.post('/jobs/' + job.id + '/messages', body).then(function(response) {
        var newMsg = response.data;
        job.messages.push(newMsg);
        $scope.newMessage.value = '';
      });
    };
    
    $scope.archiveJob = function(message, job) {
      job.archived = true;
      return $scope.sendMessage(message, job, true).then(function() {
        $scope.toggleJob(job);
      });
    };
    
    $scope.deleteJob = function(job) {
      var index = $scope.jobs.indexOf(job);
      return $http.delete('/jobs/' + job.id).then(function() {
        $scope.jobs.splice(index, 1);
        $scope.selectedJob = null;
      });
    };
    
    $scope.getJobFilter = function(archiveValue) {
      return function(job) {
        return job.archived === archiveValue;
      };
    };
    
    var moveScratchPad = function() {
      var $elem = $('.panel-heading[aria-expanded="true"');
      var top = 15;
      if ($elem.size() === 1) {
        top = $elem.offset().top - $("#scratchPad").parent().offset().top; 
      }
      $('#scratchPad').css('top', top);
    };
    
    var loadJobURL = function(job) {
      if (job) {
        return $location.search('job', job.id);        
      }
      return $location.search('');
    };
    
    $scope.toggleJob = function(job) {
      $timeout(function() {
        $scope.jobs.forEach(function(job2) {
          job2.selected = $(`#heading${job2.id}`).attr('aria-expanded') === "true";
        });
        if (job.selected) {
          $scope.selectedJob = job;
        } else {
          $scope.selectedJob = null;
        }
        loadJobURL($scope.selectedJob);
      });
    };
    
    $scope.$watch('selectedJob', function() {
      if ($scope.selectedJob) {
        var promises = [];
        // get/show messages
        $scope.$applyAsync(function() {
          $scope.gettingMessages = true;
        });
        promises.push($http.get('/jobs/' + $scope.selectedJob.id + '/messages').then(function(response) {
          var messages = response.data;
          return $scope.selectedJob.messages = messages;
        }).finally(function() {
          $scope.$applyAsync(function() {
            $scope.gettingMessages = false;
          });
        }));
        // get/show facts
        promises.push($http.get('/jobs/' + $scope.selectedJob.id + '/facts').then(function(response) {
          var facts = response.data;
          return $scope.selectedJob.facts = facts;
        }).finally(function() {
          $scope.$applyAsync(function() {
            $scope.gettingFacts = false;
          });
        }));
        $scope.$watch('gettingMessages', function() {
          if ($scope.selectedJob && !$scope.gettingMessages) {
            // $('#scratchPad').hide();
            moveScratchPad();
            // $('#scratchPad').show();
          }
        });
        return $q.all(promises);
      } else {
        $timeout(function() {
          moveScratchPad();
        });
      }
    });
    
    function getSelectionText() { // https://stackoverflow.com/questions/5379120/get-the-highlighted-selected-text
      var text = "";
      if (window.getSelection) {
        text = window.getSelection().toString();
      } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
      }
      return text;
    }
    
    $scope.addFactFromSelection = function(job) {
      return $scope.addFact(job, getSelectionText());
    };
    
    $scope.addFact = function(job, textValue) {
      var fact = {
        key: 'Fact name',
        value: textValue || 'Fact value',
        job_id: job.id
      };
      return $http.post('/jobs/' + job.id + '/facts', fact).then(function(response) {
        var fact = response.data[0];
        if (!job.facts) {
          job.facts = [];
        }
	    	job.facts.push(fact);
      });
    };
    
    $scope.updateFact = function(job, fact) {
      return $http.put('/jobs/' + job.id + '/facts/' + fact.id, fact);
    };
    
    $scope.addJob = function(job) {
      return $http.post('/jobs', $scope.newJob).then(function(response) {
        const newJob = response.data;
        $scope.newJob.email = '';
        $scope.jobs.unshift(newJob);
      });
    };
    
    $scope.getHTML = function(msg) {
      if (msg) {
        msg = msg.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank">$1</a>');
        msg = msg.replace(/\n/g, '<br>');
        return $sce.trustAsHtml(msg);
      }
      return msg;
    };
    
    $scope.getMessageStyle = function(job, sender) {
      if (sender === job.email) { // recruiter: align left
        return {
          'text-align': 'left',
          'padding': '5px'
        };
      } else { // candidate: align right
        return {
          'text-align': 'right',
          'padding': '5px'
        };
      }
    };
  }]);