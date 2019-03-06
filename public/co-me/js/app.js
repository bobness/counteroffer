angular.module('counteroffer.me', ['ngCookies'])
  .controller('controller', ['$scope', '$http', '$location', '$cookies', function($scope, $http, $location, $cookies) {
    $scope.savedEmail = $cookies.get('email');
    $scope.newMessage = {
      sender: $scope.savedEmail,
      value: ''
    };
    var campaignHash = $location.path().substring(1);
    // $scope.jobs = [];
    $http.get('/campaigns/' + campaignHash).then(function(res) {
      $scope.campaign = res.data;
      var json = $scope.campaign.content;
      $scope.experiences = json.experiences;
      $scope.tagCounts = countTags(json.experiences, json.tags);
      $scope.facts = json.facts;
      $scope.questions = json.questions;

      $http.get('/campaigns/' + campaignHash + '/jobs?email=' + $scope.savedEmail + '&campaign=' + $scope.campaign.url).then(function(response) {
        var data = response.data;
        if (data) {
          $scope.jobs = data;
          if ($scope.jobs && $scope.jobs.length === 0) {
            $scope.addJob(); // 1 minimum
          }
          var jobID = Number($location.search().job);
          if (jobID) {
            $scope.currentJob = $scope.jobs.filter(function(job) { return job.id == jobID; })[0];
            $location.hash('contact');
          } else {
            $scope.currentJob = $scope.jobs[0];
          }
        }
      });
    });

    var countTags = function(experiences, tags) {
      tags = tags.map(function(name) { return {name: name, count: 0 }; });
      experiences.forEach(function(exp) {
        exp.tags.forEach(function(name) {
          var index = tags.map(function(tag) { return tag.name; }).indexOf(name);
          if (index > -1) {
            tags[index].count++;
          }
        });
      });
      return tags.sort(function(a,b) { return b.count - a.count; });
    };

    $scope.parseDate = function(exp) {
      var date = exp['start'],
          parts = date.split('/');
      if (parts.length >= 2) {
	      var month = parts[0],
            year = parts[1];
        if (month.length === 1) {
          month = '0' + month;
        }
	      return new Date(year + '-' + month);
      } else {
	      return new Date(date);
      }
    };

    var filterFunc;
    $scope.setFilter = function(func) {
      filterFunc = func;
    };
    $scope.expFilter = function(exp) {
      if (filterFunc) {
        return filterFunc(exp);
      } else {
        return true;
      }
    };

    $scope.getExperiences = function() {
      return $scope.experiences;
    };
    $scope.selectedTags = [];

    $scope.goToPage = function(page) {
      if (page === $scope.getCurrentPage()) {
        return location.reload();
      }
      $location.search(''); // clear ?job=x param
      return $location.hash(page);
    };

    $scope.getCurrentPage = function() {
      return $location.hash();
    };

    $scope.login = function(email, password) {
      return $http.post('/session', { email, password }).then(function(response) {
        var session = response.data;
        $cookies.put('session', session);
        $cookies.put('email', email);
        location.reload();
      }).catch(function(response) {
        $scope.loginError = response.data;
      });
    };

    $scope.register = function(email, password) {
      return $http.post('/user', { email, password }).then(function(response) {
        var session = response.data;
        $cookies.put('session', session);
        $cookies.put('email', email);
        location.reload();
      }).catch(function(response) {
        $scope.loginError = response.data;
      });
    }

    $scope.loadJobURL = function(job) {
      $location.search('job', job.id);
      $scope.currentJob = job;
    };

    $scope.removeCookie = function() {
      $cookies.remove('email');
      location.reload();
    };

    $scope.emailQuestion = {
      required: true,
      value: $scope.savedEmail || null
    };

    $scope.password = '';

    var copyQuestion = function(question) {
      var obj = {};
      Object.keys(question).forEach(function(key) {
        obj[key] = question[key];
      });
      return obj;
    };

    $scope.addJob = function() {
      $scope.jobs.push({questions: $scope.questions.map(function(q) {
        return copyQuestion(q);
      })});
      $scope.currentJob = $scope.jobs[$scope.jobs.length - 1];
    };

    $scope.deleteJob = function() {
      var index = $scope.jobs.indexOf($scope.currentJob);
      $http.delete('/campaigns/' + campaignHash + '/jobs/' + $scope.currentJob.id).then(function() {
        $scope.jobs.splice(index, 1);
        $scope.currentJob = $scope.jobs[0];
      });
    };

    $scope.progress = function() {
      if ($scope.currentJob && $scope.currentJob.questions) {
        var questions = $scope.currentJob.questions.concat($scope.emailQuestion);
        var requiredQuestions = questions.filter(function(q) { return q.required; });
        var denominator = requiredQuestions.length;
        var numerator = requiredQuestions.filter(function(msg) {
          if (Array.isArray(msg.value)) {
            return msg.value.length > 0;
          }
          return msg.value;
        }).length;

        return Math.round((numerator/denominator)*100);
      }
    };

    $scope.$watchCollection('jobs', function(newVal, oldVal) {
      // add tags to a new job - don't break old jobs
      var newJobs;
      if (oldVal && newVal) {
        if (oldVal.length === 1 && newVal.length === 1) {
          newJobs = newVal;
        } else if (newVal.length > oldVal.length) {
          newJobs = newVal.filter(function(job) { return oldVal.indexOf(job) === -1; });
        }
        if (newJobs) {
          newJobs.forEach(function(job) {
            job.tags = $scope.tagCounts.map(function(tag) {
              return {
                name: tag.name,
                selected: false
              };
            });
          });
        }
      }
    });

    $scope.jobIsSelected = function(job) {
      if (!$scope.currentJob) {
        $scope.currentJob = $scope.jobs[0];
      }
      return $scope.currentJob === job;
    };

    $scope.submit = function() {
      $scope.state = 'busy';
      var obj = {campaign: $scope.campaign.id};
      if ($scope.savedEmail) {
        angular.extend(obj, {saved: true, job: $scope.currentJob, email: $scope.savedEmail});
      } else {
        angular.extend(obj, {email: $scope.emailQuestion.value, jobs: $scope.jobs});
      }
      return $scope.submitSurvey(obj).then(function() {
        $scope.state = 'ok';
        location.reload();
      }).catch(function(err) {
        $scope.state = 'error';
      });
    };

    $scope.messageFilter = function(message) {
      if ($scope.currentJob && $scope.currentJob.id) {
        return !!message.value;
      } else {
        return true;
      }
    };

    $scope.submitSurvey = function(obj) {
      var email = obj.email,
          jobs = obj.jobs,
          job = obj.job,
          saved = obj.saved;
      if (saved && job) {
        if (job.id) {
          return $http.put('/campaigns/' + campaignHash + '/jobs/' + job.id, {
            job: job
          });
        } else {
          return $http.post('/campaigns/' + campaignHash + '/jobs', {
            email: email,
            jobs: [job]
          });
        }
      } else {
        $cookies.put('email', email);
        return $http.post('/campaigns/' + campaignHash + '/jobs', {
          email: email,
          jobs: jobs
        });
      }
    };

    $scope.sendMessage = function(message, job) {
      return $http.post('/campaigns/' + campaignHash + '/jobs/' + job.id + '/messages', message).then(function(response) {
        var newMsg = response.data;
        $scope.currentJob.messages.push(newMsg);
        $scope.newMessage.value = '';
      });
    };

  }])
