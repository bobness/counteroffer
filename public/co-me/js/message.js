angular.module('counteroffer.me').directive('message', ['$sce', function($sce) {
  return {
    templateUrl: 'html/message.html',
    scope: {
      data: '=',
      tagCounts: '<',
      job: '<'
    },
    link: function(scope) {

      scope.getHTML = function(msg) {
        if (msg) {
          msg = msg.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank">$1</a>');
          msg = msg.replace(/\n/g, '<br>');
          return $sce.trustAsHtml(msg);
        }
        return msg;
      };

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
  }
}]);
