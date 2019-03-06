angular.module('counteroffer.app').directive('job', [
  '$http', '$timeout', '$q', '$cookies', '$sce', '$location', '$anchorScroll',
  function($http, $timeout, $q, $cookies, $sce, $location, $anchorScroll) {

  return {
    templateUrl: 'dashboard/job.html',
    scope: {
      data: '=',
      jobs: '<',
      campaignHash: '@',
      refreshFactClasses: '&',
      factClasses: '='
    },
    link: function(scope) {

      var session = $cookies.get('session');
      var email = $cookies.get('email');

      scope.factsCollapsed = false;

      scope.toggleFacts = function() {
        scope.factsCollapsed = !scope.factsCollapsed;
      };

      scope.newJob = {
        email: '',
        messages: []
      };

      scope.newMessage = {
        sender: email,
        value: ''
      };

      scope.sendMessage = function(message, job, archive) {
        var body = {
          message: message,
          email: job.email,
          archive: archive || false
        };
        return $http.post(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id + '/messages',
          body,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function(response) {
          if (message) {
            var newMsg = response.data;
            job.messages.push(newMsg);
          }
          scope.newMessage.value = '';
        });
      };

      scope.archiveJob = function(job, toArchive, message) {
        job.archived = toArchive;
        if (message) {
          return scope.sendMessage(message, job, true).then(function() {
            scope.setPath(toArchive ? 'archived' : '');
          });
        } else {
          return scope.updateJob(job).then(function() {
            scope.setPath(toArchive ? 'archived' : '');
          });
        }
      };

      scope.deleteJob = function(job) {
        var index = scope.jobs.indexOf(job);
        return $http.delete(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function() {
          scope.jobs.splice(index, 1);
          scope.selectedJob = null;
        });
      };

      var loadJobURL = function(job) {
        if (job) {
          return $location.search('job', job.id);
        }
        return $location.search('');
      };

      scope.toggleJob = function(job) {
        $timeout(function() {
          scope.jobs.forEach(function(job2) {
            job2.selected = $(`#heading${job2.id}`).attr('aria-expanded') === "true";
          });
          if (job.selected) {
            scope.selectedJob = job;
          } else {
            scope.selectedJob = null;
          }
          loadJobURL(scope.selectedJob);
        });
      };

      scope.$watch('selectedJob', function() {
        if (scope.selectedJob) {
          var promises = [];
          // get/show messages
          scope.$applyAsync(function() {
            scope.gettingMessages = true;
          });
          promises.push($http.get(
            '/api/campaigns/' + scope.campaignHash + '/jobs/' + scope.selectedJob.id + '/messages',
            { headers: { 'x-email': email, 'x-session-id': session } }
          ).then(function(response) {
            var messages = response.data;
            return scope.selectedJob.messages = messages;
          }).finally(function() {
            scope.$applyAsync(function() {
              scope.gettingMessages = false;
            });
          }));
          // get/show facts
          promises.push($http.get(
            '/api/campaigns/' + scope.campaignHash + '/jobs/' + scope.selectedJob.id + '/facts',
            { headers: { 'x-email': email, 'x-session-id': session } }
          ).then(function(response) {
            var facts = response.data;
            return scope.selectedJob.facts = facts;
          }).finally(function() {
            scope.$applyAsync(function() {
              scope.gettingFacts = false;
            });
          }));
          return $q.all(promises);
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

      scope.addFactFromSelection = function(job) {
        return scope.addFact(job, getSelectionText());
      };

      scope.addFact = function(job, textValue) {
        var fact = {
          key: 'Fact name',
          value: textValue || 'Fact value',
          job_id: job.id
        };
        return $http.post(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id + '/facts',
          fact,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function(response) {
          var fact = response.data[0];
          if (!job.facts) {
            job.facts = [];
          }
          job.facts.push(fact);
          scope.factClasses = scope.refreshFactClasses({jobs: scope.jobs });
          scope.factsCollapsed = false;
        });
      };

      scope.updateFact = function(job, fact) {
        return $http.put(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id + '/facts/' + fact.id,
          fact,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function() {
          scope.factClasses = scope.refreshFactClasses({ jobs: scope.jobs });
        });
      };

      scope.deleteFact = function(job, fact) {
        return $http.delete(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id + '/facts/' + fact.id,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function() {
          job.facts = job.facts.filter(function(f) { return f !== fact; });
          scope.factClasses = scope.refreshFactClasses({jobs: scope.jobs });
        });
      }

      scope.addJob = function(job) {
        return $http.post(
          '/api/campaigns/' + scope.campaignHash + '/jobs/',
          scope.newJob,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function(response) {
          const newJob = response.data;
          scope.newJob.email = '';
          scope.jobs.unshift(newJob);
        });
      };

      scope.updateJob = function(job) {
        return $http.put(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id,
          job,
          { headers: { 'x-email': email, 'x-session-id': session } }
        );
      };

      scope.getHTML = function(msg) {
        if (msg && typeof msg === 'string') {
          msg = msg.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank">$1</a>');
          msg = msg.replace(/\n/g, '<br>');
          return $sce.trustAsHtml(msg);
        }
        return msg;
      };

      scope.getMessageStyle = function(job, sender) {
        if (sender === job.email || !sender) { // recruiter || survey: align left
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

      scope.getMessageClass = function(job, sender) {
        if (sender === job.email || !sender) {
          return 'recruiter';
        } else {
          return 'candidate';
        }
      }

      var sortByKey = null;

      scope.sortByFactKey = function(key) {
        if (key) {
          $location.search('sort', key);
          sortByKey = key;
        } else {
          $location.search('sort', null);
          sortByKey = null;
        }
      };

      scope.sortJobs = function() {
        if (sortByKey) {
          // TODO
          return function(job) {
            var fact = job.facts.filter(function(fact) { return fact.key === sortByKey; })[0];
            if (fact) {
              return fact.value;
            }
            return "";
          };
        } else {
          return function(job) {
            return job.latest_msg;
          };
        }
      };

      scope.displayDate = function(job) {
        return (new Date(job.latest_msg)).toLocaleDateString();
      };

      scope.getFactClass = function(factKey) {
        return scope.factClasses[factKey] || 'label';
      };

      var jobInURL = $location.search().job;
      if (jobInURL && scope.data && jobInURL === scope.data.id) {
        $timeout(function() {
          scope.selectedJob = scope.data;
          scope.selectedJob.selected = true;
          $(`#collapse${scope.selectedJob.id}`).collapse('show');
          $anchorScroll(`heading${scope.selectedJob.id}`); // FIXME: not working
        });
      }
    }
  };
}]);
