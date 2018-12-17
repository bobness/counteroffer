function Question() {
  this.type = 'text';
  this.text = 'Question text';
  this.required = false;
  this.value = null;
}

angular.module('pc').directive('survey', ['portfolioService', function(portfolioService) {
  return {
    templateUrl: 'html/survey.html',
    scope: {
      theme: '<',
      questions: '<',
      tagCounts: '<'
    },
    link: function(scope, elem, attrs) {
      
      scope.questionTypes = ['text', 'textarea', 'skills'];
      
      scope.capitalizeFirstLetter = function(text) {
        var firstLetter = text[0];
        return firstLetter.toUpperCase() + text.substr(1);
      };
      
      scope.questions = scope.questions || [];
      
      scope.addQuestion = function() {
        return portfolioService.createQuestion(new Question(), scope.theme).then(function(question) {
          scope.questions.push(question);
        });
      };
      
      scope.updateQuestion = function(question) {
        return portfolioService.updateQuestion(question, scope.theme);
      };
      
      scope.deleteQuestion = function(question) {
        return portfolioService.deleteQuestion(question, scope.theme).then(function() {
          scope.questions = scope.questions.filter(function(q) { return q !== question; });
        });
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
    }
  };
}])