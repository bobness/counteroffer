angular.module('counteroffer.me').directive('histogram', [function() {
  return {
    templateUrl: 'html/histogram.html',
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
}]);
