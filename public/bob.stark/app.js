angular.module('counteroffer', [])
  .controller('controller', ['$scope', '$http', '$location', function($scope, $http, $location) {
    $http.get(('Counteroffer.json')).then(function(res) {
      var json = res.data;
      $scope.experiences = json.experiences;
      $scope.tagCounts = countTags(json.experiences, json.tags);
      $scope.facts = json.facts;
      $scope.questions = json.questions;
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
      return $location.hash(page);
    };
    
    $scope.getCurrentPage = function() {
      return $location.hash();
    };
    
    $scope.sendEmail = function(obj) {
      var emailQuestion = obj.emailQuestion,
          jobs = obj.jobs;
      return $http.post('/email', [emailQuestion, jobs]).then(function() {
        $scope.hideSurvey();
      });
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
  .directive('survey', function() {
    return {
      templateUrl: 'survey.html',
      scope: {
        tagCounts: '<',
        questions: '<',
        submitFunc: '&'
      },
      link: function(scope, elem, attrs) {
        scope.state = 'ok';
        scope.emailQuestion = {
          required: true,
          value: null
        };
        scope.jobs = [];
        
        var copyQuestion = function(question) {
          var obj = {};
          Object.keys(question).forEach(function(key) {
            obj[key] = question[key];
          });
          return obj;
        };
        
        scope.addJob = function() {
          scope.jobs.push({questions: scope.questions.map(function(question) {
            return copyQuestion(question);
          })});
        };
        
        scope.deleteJob = function(index) {
          scope.jobs.splice(index, 1);
        };
        
        scope.addJob(); // 1 minimum
        
        scope.progress = function() {
          var questions = [].concat(scope.emailQuestion);
          questions = scope.jobs.reduce(function(questions, job) {
            return questions.concat(job.questions);
          }, questions);
          var requiredQuestions = questions.filter(function(question) { return question.required; });
          var denominator = requiredQuestions.length;
          var numerator = requiredQuestions.filter(function(question) { 
            if (Array.isArray(question.value)) {
              return question.value.length > 0;
            }
            return question.value; 
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
          newJobs.forEach(function(job) {
            job.tags = scope.tagCounts.map(function(tag) {
              return {
                name: tag.name,
                selected: false
              };
            });
          });
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
        
        scope.submit = function() {
          scope.state = 'busy';
          return scope.submitFunc({emailQuestion: scope.emailQuestion, jobs: scope.jobs}).then(function() {
            scope.state = 'ok';
            scope.questions.forEach(function(question) {
              question.value = null;
            });
          }).catch(function(err) {
            scope.state = 'error';
          });
        };
        
      }
    };
  });