angular.module('counteroffer.me', ['ngCookies'])
  .controller('controller', ['$scope', '$http', '$location', '$cookies', function($scope, $http, $location, $cookies) {
    $http.get(('Counteroffer.json')).then(function(res) {
      var json = res.data;
      $scope.experiences = json.experiences;
      $scope.tagCounts = countTags(json.experiences, json.tags);
      $scope.facts = json.facts;
      $scope.messages = json.questions;
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
      return $location.path(page);
    };
    
    $scope.getCurrentPage = function() {
      return $location.path().substring(1);
    };
    
/*
    $scope.sendEmail = function(obj) {
      var emailQuestion = obj.emailQuestion,
          jobs = obj.jobs;
      return $http.post('/email', [emailQuestion, jobs]).then(function() {
        $scope.hideSurvey();
      });
    };
*/
    
    $scope.submitSurvey = function(obj) {
      var email = obj.email,
          username = obj.username,
          jobs = obj.jobs,
          job = obj.job,
          saved = obj.saved;
      if (saved && job) {
        if (job.id) {
          return $http.put('/jobs/' + job.id, {
            job: job
          }).then(function() {
            location.reload();
          });
        } else {
          return $http.post('/jobs', {
            email: email,
            username: username,
            jobs: [job]
          }).then(function() {
            location.reload();
          });
        }
      } else {
        var rememberMe = obj.rememberMe;
        if (rememberMe) {
          $cookies.put('email', email);
        }
        return $http.post('/jobs', {
          email: email,
          username: username,
          jobs: jobs
        }).then(function() {
          location.reload();
        });
      }
    };
    
  }])
  .directive('experience', ['$sce', function($sce) {
    return {
      templateUrl: 'experience.html',
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
  }])
  .directive('histogram', [function() {
    return {
      templateUrl: 'histogram.html',
      scope: {
        tagCounts: '=',
        setFilter: '&',
        getExperiences: '&',
        selectedTags: '='
      },
      link: function(scope) {
        
        scope.selectTag = function(tag) {
          var index = scope.selectedTags
            .map(function(tag) { return tag.name; })
            .indexOf(tag.name);
          if (index === -1) {
            scope.selectedTags.push(tag);
          } else {
            scope.selectedTags.splice(index, 1);
          }
        };
        
        var filterExperiencesByTags = function(exp, tags) {
          return tags.reduce(function(matched, tag) {
            var name = tag.name || tag;
            return matched && (exp.tags.indexOf(name) > -1);
          }, true);
        };
        
        var filterExperiencesBySelectedTags = function(exp) {
          return filterExperiencesByTags(exp, scope.selectedTags);
        };
        
        scope.isSelected = function(tag) {
          return scope.selectedTags.map(function(tag) { return tag.name; }).indexOf(tag.name) > -1;
        };
        
        var selectedExperiences = [];
        var oldTagName = '';
        
        scope.selectExperiencesFromTag = function(tagName) {
          selectedExperiences = scope.getExperiences().filter(function(exp) { return exp.tags.indexOf(tagName) > -1; });
          oldTagName = tagName;
        };
        
        scope.$watchCollection('selectedTags', function() {
          if (scope.setFilter) {
            if (scope.selectedTags.length > 0) {
              scope.setFilter({func: filterExperiencesBySelectedTags});
            } else {
              scope.setFilter({func: null});
            }
          }
        });
        
        scope.$watch('filter', function() {
          if (scope.setFilter && (!scope.filter || scope.filter.length === 0)) {
            scope.setFilter({func: null});
          }
        });
      }
    };
  }])
  .directive('survey', ['$cookies', '$http', '$sce', '$location', function($cookies, $http, $sce, $location) {
    return {
      templateUrl: 'survey.html',
      scope: {
        tagCounts: '<',
        messages: '<',
        submitFunc: '&'
      },
      link: function(scope, elem, attrs) {
        scope.state = 'ok';
        scope.jobs = [];
        
        if ($cookies.get('email')) {
          scope.state = 'busy';
          scope.savedEmail = $cookies.get('email');
          scope.newMessage = {
            value: '',
            email: scope.savedEmail
          };
          $http.get('/jobs?email=' + scope.savedEmail).then(function(response) {
            var data = response.data;
            if (data && data.length > 0) {
              scope.jobs = data;
              var jobID = Number($location.search().job);
              if (jobID) {
                scope.currentJob = scope.jobs.filter(function(job) { return job.id == jobID; })[0];
              } else {
                scope.currentJob = scope.jobs[0];
              }
              scope.state = 'ok';
            }
          });
        }
        
        scope.jobIsSelected = function(job) {
          if (!scope.currentJob) {
            scope.currentJob = scope.jobs[0];
          }
          return scope.currentJob === job;
        };
        
        scope.emailQuestion = {
          required: true,
          value: scope.savedEmail || null
        };
        
        var copyQuestion = function(question) {
          var obj = {};
          Object.keys(question).forEach(function(key) {
            obj[key] = question[key];
          });
          return obj;
        };
        
        scope.addJob = function() {
          scope.jobs.push({messages: scope.messages.map(function(msg) {
            return copyQuestion(msg);
          })});
          scope.currentJob = scope.jobs[scope.jobs.length - 1];
        };
        
        scope.$watch('messages', function() {
          if (scope.messages) {
            scope.addJob(); // 1 minimum
          }
        });
        
        scope.deleteJob = function() {
          var index = scope.jobs.indexOf(scope.currentJob);
          $http.delete('/jobs/' + scope.currentJob.id).then(function() {
            scope.jobs.splice(index, 1);
            scope.currentJob = scope.jobs[0];
          });
        };
        
        scope.progress = function() {
          var messages = [].concat(scope.emailQuestion);
          messages = scope.jobs.reduce(function(messages, job) {
            return messages.concat(job.messages);
          }, messages);
          var requiredQuestions = messages.filter(function(msg) { return msg.required; });
          var denominator = requiredQuestions.length;
          var numerator = requiredQuestions.filter(function(msg) { 
            if (Array.isArray(msg.value)) {
              return msg.value.length > 0;
            }
            return msg.value; 
          }).length;
          
          return Math.round((numerator/denominator)*100);
        };
        
        scope.$watchCollection('jobs', function(newVal, oldVal) {
          // add tags to a new job - don't break old jobs
          var newJobs;
          if (oldVal.length === 1 && newVal.length === 1) {
            newJobs = newVal;
          } else if (newVal.length > oldVal.length) {
            newJobs = newVal.filter(function(job) { return oldVal.indexOf(job) === -1; });
          }
          if (newJobs) {
            newJobs.forEach(function(job) {
              job.tags = scope.tagCounts.map(function(tag) {
                return {
                  name: tag.name,
                  selected: false
                };
              });
            });
          }
        });
        
        scope.selectTag = function(question, tag) {
          if (tag.selected) {
            if (!Array.isArray(question.value)) {
              question.value = [];
            }
            question.value.push(tag.name);
          } else {
            question.value = scope.tags.reduce(function(tagNames, tag) {
              return tag.selected ? tagNames.concat(tag.name) : tagNames;
            }, []);
          }
        };
        
        scope.getPanelClass = function(question) {
          if (question.required) {
            if (Array.isArray(question.value)) {
              if (question.value.length > 0) {
                return 'panel-success';
              }
              return 'panel-danger';
            }
            if (question.value) {
              return 'panel-success';
            } else if (question.value === '') {
              return 'panel-danger';
            }
          }
          return 'panel-primary';
        };
        
        var getUsername = function() {
          // TODO: make dynamic once I add more people
          return 'bob.stark';
        };
        
        scope.submit = function() {
          scope.state = 'busy';
          var obj = {username: getUsername()};
          if (scope.savedEmail) {
            angular.extend(obj, {saved: true, job: scope.currentJob, email: scope.savedEmail});
          } else {
            angular.extend(obj, {email: scope.emailQuestion.value, jobs: scope.jobs, rememberMe: scope.emailQuestion.rememberMe});
          }
          return scope.submitFunc(obj).then(function() {
            scope.state = 'ok';
            scope.messages.forEach(function(msg) {
              msg.value = null;
            });
          }).catch(function(err) {
            scope.state = 'error';
          });
        };
        
        scope.sendMessage = function(message, job) {
          return $http.post('/jobs/' + job.id + '/messages', message).then(function(response) {
            var newMsg = response.data;
            scope.currentJob.messages.push(newMsg);
            scope.newMessage.value = '';
          });
        };
        
        scope.messageFilter = function(message) {
          if (scope.currentJob && scope.currentJob.id) {
            return !!message.value;
          } else {
            return true;
          }
        };
        
        scope.createLinks = function(msg) {
          if (msg) {
            return $sce.trustAsHtml(msg.replace(/(https?:\/\/\S+)/, '<a href="$1" target="_blank">$1</a>'));
          }
          return msg;
        };
        
        scope.getJobs = function(emailQuestion) {
          var email = emailQuestion.value;
          $cookies.put('email', email);
          location.reload();
        };
        
        scope.loadJobURL = function(job) {
          $location.search('job', job.id);
          scope.currentJob = job;
        };
        
      }
    };
  }])