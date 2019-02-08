angular.module('counteroffer.app').directive('job', [
  '$http', '$timeout', '$q', '$cookies', '$sce', '$location', '$anchorScroll',
  function($http, $timeout, $q, $cookies, $sce, $location, $anchorScroll) {

  return {
    templateUrl: 'dashboard/job.html',
    scope: {
      data: '=',
      jobs: '<',
      campaignHash: '@'
    },
    link: function(scope) {

      var session = $cookies.get('session');
      var email = $cookies.get('email');

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

      scope.getJobFilter = function(archiveValue) {
        return function(job) {
          return job.archived === archiveValue;
        };
      };

      var moveScratchPad = function() {
        var $elem = $('.panel-heading[aria-expanded="true"');
        var top = 15;
        if ($elem.length === 1) {
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
          scope.$watch('gettingMessages', function() {
            if (scope.selectedJob && !scope.gettingMessages) {
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
          scope.factClasess = refreshFactClasses(scope.jobs);
        });
      };

      scope.updateFact = function(job, fact) {
        return $http.put(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id + '/facts/' + fact.id,
          fact,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function() {
          scope.factClasess = refreshFactClasses(scope.jobs);
        });
      };

      scope.deleteFact = function(job, fact) {
        return $http.delete(
          '/api/campaigns/' + scope.campaignHash + '/jobs/' + job.id + '/facts/' + fact.id,
          { headers: { 'x-email': email, 'x-session-id': session } }
        ).then(function() {
          job.facts = job.facts.filter(function(f) { return f !== fact; });
          scope.factClasess = refreshFactClasses(scope.jobs);
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

      var cssClasses = [
        'label label-primary',
        'label label-danger',
        'label label-success',
        'label label-default',
        'label label-warning'
      ];
      var currentCssClassIndex = 0; // for round-robin usage of classes

      scope.getFactClass = function(factKey) {
        return scope.factClasses[factKey] || 'label';
      };

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
    }
  };
}]);
