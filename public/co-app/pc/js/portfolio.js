angular.module('counteroffer.app').directive('portfolio',
['$uibModal', '$location', '$timeout', '$http', '$anchorScroll', 'portfolioService',
  function($uibModal, $location, $timeout, $http, $anchorScroll, portfolioService) {
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
        scope.showArchived = false;

        scope.setShowArchived = function(val) {
          scope.showArchived = val;
        };

        scope.getJobFilter = function(archiveValue) {
          return function(job) {
            return job.archived === archiveValue;
          };
        };

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

        var showTheme = function(name) {
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
              showTheme(theme.name);
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
          if (scope.theme) {
            portfolioService.getCampaign(scope.theme).then(function(campaign) {
              scope.campaign = campaign;
              scope.selectedJob = null;
              scope.newMessage = {
                value: '',
                email: scope.email
              };
              // scope.busy = true;
              return portfolioService.getCampaignJobs(scope.campaign.url).then(function(response) {
                scope.jobs = response.data;
                scope.refreshFactClasses(scope.jobs);
                var params = $location.search();
                var jobID = Number(params.job);
                sortByKey = params.sort;
              }).finally(() => {
                // scope.busy = false;
              });
            });
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
              controller: ['scope', '$uibModalInstance', '$sce', function(scope, $uibModalInstance, $sce) {
                scope.title = 'LinkedIn Import';

                scope.close = function() {
                  $uibModalInstance.dismiss('cancel');
                };

                scope.uploadCSV = function() { // TODO: change to parse the "quoted descriptions" correctly
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
                    scope.$applyAsync(function() {
                      experiences.forEach(function(exp) {
                        scope.createExperience(exp);
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
          return bootbox.confirm({
            size: 'small',
            message: 'Are you sure you want to delete this portfolio? All jobs associated with it will be lost, too.',
            callback: function(result) {
              if (result) {
                portfolioService.deleteTheme(name).then(function() {
                  scope.portfolioObj.themes = scope.portfolioObj.themes.filter(function(theme) { return theme.name !== name; });
                  showTheme('');
                });
              }
            }
          });
        };

        // TODO: enable updating an existing campaign
        scope.createCampaign = function() {
          if (scope.theme) {
            return portfolioService.createCampaign(scope.theme).then(function(campaignObj) {
              scope.campaign = campaignObj;
            });
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
        scope.factClasses = {};

        scope.getFactClass = function(factKey) {
          return scope.factClasses[factKey] || 'label';
        };

        scope.refreshFactClasses = function(jobs) {
          currentCssClassIndex = 0;
          var classes = jobs.reduce(function(keyClasses, job) {
            if (job.facts) {
              job.facts.map(function(fact) { return fact.key; }).forEach(function(key) {
                if (!keyClasses[key]) {
                  keyClasses[key] = cssClasses[currentCssClassIndex];
                  currentCssClassIndex = (currentCssClassIndex + 1) % cssClasses.length;
                }
              });
            }
            return keyClasses;
          }, {});
          scope.factClasses = classes;
          return classes;
        };

        scope.isInMode = function(m) {
          return $location.hash() === m;
        };
        scope.setMode = function(m) {
          $location.hash(m);
        };

        if ($location.search().job) {
          scope.setMode('jobs');
        }
      }
    }
  }
]);
