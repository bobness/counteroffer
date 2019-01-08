angular.module('counteroffer.app').directive('facts', ['portfolioService', function(portfolioService) {
  return {
    templateUrl: 'html/facts.html',
    scope: {
      portfolio: '>',
      theme: '>'
    },
    link: function(scope) {
      scope.getThemeFacts = function() {
        if (scope.theme) {
          return scope.theme.facts || [];
        } else if (scope.portfolio) {
          return scope.portfolio.facts || [];
        }
      }

      scope.addFact = function() {
        var newFact = {name: 'Name (e.g., Objective)', value: 'value'};
        if (scope.theme) {
          return portfolioService.createFact(newFact, scope.theme);
        } else {
          return portfolioService.createFact(newFact).then(function(fact) {
            if (!scope.portfolio.facts) {
              scope.portfolio.facts = [];
            }
            scope.portfolio.facts.push(fact);
          });
        }
      };

      scope.updateFact = function(fact) {
        var theme = scope.getSelectedTheme();
        return portfolioService.updateFact(fact, theme);
      };

      scope.deleteFact = function(fact) {
        var theme = scope.getSelectedTheme();
        if (theme) {
          return portfolioService.deleteFact(fact, theme).then(function() {
            theme.facts = theme.facts.filter(function(f) { return f !== fact; });
          });
        } else {
          return portfolioService.deleteFact(fact).then(function() {
            scope.portfolio.facts = scope.portfolio.facts.filter(function(f) { return f !== fact; });
          });
        }
      };

      scope.$on('dragToReorder.dropped', function (evt, data) {
        if (data.newIndex != data.prevIndex) {
          var theme = scope.getSelectedTheme();
          portfolioService.updateFacts(data.list, theme).then(function(facts) {
            if (theme) {
              theme.facts = facts
            } else {
              scope.portfolio.facts = facts;
            }
          })
        }
      });
    }
  }
}]);
