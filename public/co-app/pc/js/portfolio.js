angular.module('counteroffer.app').directive('portfolio', ['$uibModal', '$location', 'portfolioService',
  function($uibModal, $location, portfolioService) {
    var today = new Date();

    var zeroPadMonth = function(month) {
      month = '' + month;
      if (month.length === 1) {
        return '0' + month;
      }
      return month;
    };

    var Experience = function() {
      this.company = 'Company name';
      this.title = 'Title';
      this.description = 'Description';
      this.start = zeroPadMonth(today.getMonth() + 1) + '/' + today.getFullYear();
      this.end = 'End date (MM/YYYY, YYYY, or empty)';
      this.tags = [];
    };

    return {
      templateUrl: PC_PREFIX + '/html/portfolio.html',
      scope: {
        theme: '<',
        portfolioObj: '='
      },
      link: function(scope) {
        scope.alerts = [];

        var addAlert = function(type, msg) {
          scope.alerts.push({
            type: type,
            msg: msg
          });
        };

        scope.success = function(msg) {
          addAlert('success', msg);
        };

        scope.closeAlert = function(index) {
          scope.alerts.splice(index, 1);
        };

        var filterFunc;
        scope.setFilter = function(func) {
          filterFunc = func;
        };

        scope.selectedTags = [];

        scope.showTheme = function(name) {
          $location.path(name);
          scope.theme = scope.portfolioObj.themes.filter((theme) => theme.name === name)[0];
        };

        scope.createTheme = function(selectedTags) {
          var name = prompt('Theme name');
          if (name) {
            var theme = {
              name: name,
              tags: selectedTags.map(function(tag) { return tag.name; }),
              facts: scope.portfolioObj.facts || [],
              questions: scope.portfolioObj.questions || []
            };
            return portfolioService.createTheme(theme).then(function(theme) {
              scope.portfolioObj.themes.push(theme);
              scope.selectedTags = [];
              scope.showTheme(theme.name);
            });
          }
        };

        scope.expFilter = function(exp) {
          if (filterFunc) {
            return filterFunc(exp);
          } else {
            return true;
          }
        };

        var updateTagCounts = function() {
          if (scope.portfolioObj) {
            scope.tagCounts = countTags(scope.portfolioObj.experiences, scope.theme);
          }
        };

        scope.$watch('portfolioObj', function(newValue, oldValue) {
          if (newValue !== oldValue) {
            updateTagCounts();
          }
        });

        scope.$watchCollection('portfolioObj.experiences', function(value) {
          if (value) {
            updateTagCounts();
          }
        });

        scope.$watch('theme', function(newTheme, oldTheme) {
          var oldThemeName = oldTheme ? oldTheme.name : '';
          var newThemeName = newTheme ? newTheme.name : '';
          if (oldThemeName !== newThemeName) {
            updateTagCounts();
          }
        })

        scope.getExperiences = function() {
          return scope.portfolioObj.experiences;
        };

        scope.parseDate = function(exp) {
          var date = exp['start'],
              parts = date.split('/');
          if (parts.length >= 2) {
    	      var month = zeroPadMonth(parts[0]),
                year = parts[1];
    	      return new Date(year + '-' + month);
          } else {
    	      return new Date(date);
          }
        };

        var countTags = function(experiences, selectedTheme) {
          var tags;
          if (selectedTheme) {
            tags = selectedTheme.tags
          } else {
            tags = experiences.reduce(function(tags, exp) {
              return tags.concat(exp.tags);
            }, []);
          }
          // remove dupes
          tags = tags.filter(function(tag, index) {
            return tags.indexOf(tag) === index;
          });
          tags = tags.map(function(tagName) {
            return {
              name: tagName,
              count: 0
            };
          });
          experiences.forEach(function(exp) {
            var expTags = exp.tags;
            expTags.forEach(function(name) {
              var tag = tags.filter(function(tag2) { return tag2.name === name; })[0];
              if (tag) {
                tag.count++;
              }
            });
          });
          return tags.sort(function(a,b) { return b.count - a.count; })
        };

        scope.createExperience = function() {
          return portfolioService.createExperience(new Experience()).then(function(newexp) {
    	      scope.$applyAsync(function() {
            	scope.portfolioObj.experiences.push(newexp);
    	      });
          });
        };

        scope.showSurvey = function() {
          $location.hash('contact');
        };

        scope.hideSurvey = function() {
          $location.hash('');
        };

        scope.surveyVisible = function() {
          return $location.hash() === 'contact';
        };

        scope.getQuestions = function() {
          var theme = scope.theme;
          if (theme) {
            return theme.questions;
          } else {
            return scope.portfolioObj.questions;
          }
        };

        scope.refreshExperiences = function(callObj) {
    	    var removedExp = callObj.exp;
    	    scope.$applyAsync(function() {
    		    scope.portfolioObj.experiences = scope.portfolioObj.experiences.filter(function(exp) {
      		    return exp !== removedExp;
      		  });
    		  });
        };

        scope.openLinkedInModal = function() {
            var modal = $uibModal.open({
              templateUrl: PC_PREFIX + '/html/linkedin-modal.html',
              transclude: true,
              scope: scope,
              controller: ['$scope', '$uibModalInstance', '$sce', function($scope, $uibModalInstance, $sce) {
                $scope.title = 'LinkedIn Import';

                $scope.close = function() {
                  $uibModalInstance.dismiss('cancel');
                };

                $scope.uploadCSV = function() { // TODO: change to parse the "quoted descriptions" correctly
                  var file = document.getElementById('csvFile').files[0];
                  var reader = new FileReader();
                  reader.onload = function() {
                    var rows = reader.result.split('\n');
                    var cols = rows.shift().split('\t');
                    var experiences = [];
                    var currentExp;
                    rows.forEach(function(row) {
                      if (row) {
                       var items = row.split('\t');
                        if (items.length === cols.length || items.length === 2) {
                          currentExp = {};
                          for (var i = 0; i < items.length; i++) {
                            var item = items[i];
                            var col = cols[i];
                            currentExp[col] = item;
                          }
                          experiences.push(currentExp);
                        } else if (items.length === 1) {
                            currentExp.description += '\n' + row;
                        } else if (items.length === 5) {
                            currentExp.description += '\n' + items[0];
                            currentExp.Location = items[1];
                            currentExp['start'] = items[2];
                            currentExp['End Date'] = items[3];
                            currentExp.Title = items[4];
                        }
                      }
                    });
                    $scope.$applyAsync(function() {
                      experiences.forEach(function(exp) {
                        $scope.createExperience(exp);
                      });
                    });
                  };
                  reader.readAsText(file);
                };
              }]
            });
        };

        scope.deleteSelectedTheme = function() {
          var name = scope.theme.name;
          return portfolioService.deleteTheme(name).then(function() {
            scope.portfolioObj.themes = scope.portfolioObj.themes.filter(function(theme) { return theme.name !== name; });
            scope.showTheme('');
          });
        };

        scope.createCampaign = function() {
          var path = 'public/export';
          var themeName = scope.theme ? scope.theme.name : '';
          return portfolioService.createCampaign(themeName, path).then(function() {
            scope.success('Created campaign JSON file: ' + path + '/' + themeName + '.json');
          });
        };
      }
    }
  }
]);
