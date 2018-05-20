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
    $scope.showSurvey = function() {
      $location.hash('contact');
    };
    
    $scope.hideSurvey = function() {
      $location.hash('');
    };
    
    $scope.surveyVisible = function() {
      return $location.hash() === 'contact';
    };
    
    $scope.sendEmail = function(obj) {
      return $http.post('/email', obj.questions).then(function() {
        $scope.hideSurvey();
      });
    };
    
  }])
  .directive('experience', [function() {
    return {
      templateUrl: 'experience.html',
      scope: {
        data: '='
      },
      link: function(scope) {
        scope.getFormattedDescription = function() {
  	      if (scope.data.description) {
  	        return scope.data.description.split('\n').join('<br>');
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
        scope.progress = function() {
          var requiredQuestions = scope.questions.filter(function(question) { return question.required; });
          var denominator = requiredQuestions.length;
          var numerator = requiredQuestions.filter(function(question) { return !!question.value; }).length;
          
          return Math.round((numerator/denominator)*100);
        };
        
        scope.$watch('tagCounts', function() {
          if (scope.tagCounts) {
            scope.tags = scope.tagCounts.map(function(tag) {
              return {
                name: tag.name,
                selected: false
              };
            });
          }
        });
        
        scope.tagsSelected = null;
        
        scope.selectTag = function(tag) {
          if (tag.selected) {
            scope.tagsSelected = true;
          } else {
            scope.tagsSelected = scope.tags.reduce(function(anySelected, tag) {
              return tag.selected ||  anySelected;
            }, false);
          }
        };
        
        scope.submit = function() {
          scope.state = 'busy';
          var questions = scope.questions.filter(function(question) {
            if (question.type === 'skills') {
              question.value = scope.tags
                .filter(function(tag) { return tag.selected; })
                .map(function(tag) { return tag.name; });
            }
            if (question.type === 'textarea' && question.value) {
              question.value = question.value.split('\n');
            }
            return !!question.value;
          });
          return scope.submitFunc({questions: questions}).then(function() {
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