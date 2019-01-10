angular.module('counteroffer.app').factory('portfolioService', ['$http', '$cookies',
function($http, $cookies) {
  var service = {};

  var portfolio;
  var campaign;

  var put = function(url, data) {
    return $http.put(
      url,
      data,
      { headers: { 'x-username': username, 'x-session-id': session } }
    ).then(function(res) {
      return res.data;
    });
  };

  var post = function(url, data) {
    return $http.post(
      url,
      data,
      { headers: { 'x-username': username, 'x-session-id': session } }
    ).then(function(res) {
      return res.data;
    });
  };

  var deleteRequest = function(url) {
    return $http.delete(
      url,
      { headers: { 'x-username': username, 'x-session-id': session } }
    );
  };

  const rootUrl = '/api/portfolio';

  const session = $cookies.get('session');
  const username = $cookies.get('username');

  service.getPortfolio = function() {
    return $http.get(
      rootUrl,
      { headers: { 'x-username': username, 'x-session-id': session } }
    ).then(function(res) {
	    portfolio = res.data;
      return portfolio;
    });
  };

  service.getCampaign = function() {
    return $http.get(
      rootUrl + '/campaign',
      { headers: { 'x-username': username, 'x-session-id': session } }
    ).then(function(res) {
      campaign = res.data;
      return campaign;
    });
  };

  service.addTag = function(tag, experience) {
	  var index = portfolio.experiences.indexOf(experience);
    var expUrl = rootUrl + '/experiences/' + index;
    experience.tags.push(tag);
    return put(expUrl, experience);
  };

  service.removeTag = function(tag, experience) {
	  var index = portfolio.experiences.indexOf(experience);
    var expUrl = rootUrl + '/experiences/' + index;
    experience.tags.splice()
    experience.tags = experience.tags.filter(function(item) {
      return item !== tag;
    });
    return put(expUrl, experience);
  };

  service.createExperience = function(experience) {
    return post(rootUrl + '/experiences', experience);
  };

  service.updateExperience = function(experience) {
	  var index = portfolio.experiences.indexOf(experience);
    return put(rootUrl + '/experiences/' + index, experience);
  };

  service.deleteExperience = function(experience) {
	  var index = portfolio.experiences.indexOf(experience);
	  return deleteRequest(rootUrl + '/experiences/' + index);
  };

  service.createTheme = function(theme) {
    return post(rootUrl + '/themes', theme);
  };

  service.deleteTheme = function(themeName) {
	  var index = portfolio.themes.map(function(theme) { return theme.name; }).indexOf(themeName);
	  return deleteRequest(rootUrl + '/themes/' + index);
  };

  service.updateTheme = function(theme) {
	  var index = portfolio.themes.indexOf(theme);
    return put(rootUrl + '/themes/' + index, theme);
  };

  service.createFact = function(fact, theme) {
    if (theme) {
      if (!theme.facts) {
        theme.facts = [];
      }
      theme.facts.push(fact);
      return this.updateTheme(theme).then(function(theme) {
        return theme.facts.filter(function(f) { return f === fact; })[0];
      });
    } else {
      return post(rootUrl + '/facts', fact);
    }
  };

  service.updateFact = function(fact, theme) {
    if (theme) {
      if (theme.facts.indexOf(fact) === -1) {
        theme.facts.push(fact);
      }
      var index = portfolio.themes.indexOf(theme);
      return put(rootUrl + '/themes/' + index, theme);
    } else {
      var index = portfolio.facts.indexOf(fact);
      return put(rootUrl + '/facts/' + index, fact);
    }
  };

  service.deleteFact = function(fact, theme) {
    if (theme) {
      theme.facts = theme.facts.filter(function(f) { return f !== fact; });
      return this.updateTheme(theme);
    } else {
      var index = portfolio.facts.indexOf(fact);
      return deleteRequest(rootUrl + '/facts/' + index);
    }
  };

  service.updateFacts = function(facts, theme) {
    if (theme) {
      theme.facts = facts;
      return this.updateTheme(theme).then(function() {
        return facts;
      });
    } else {
      return put(rootUrl + '/facts', facts).then(function() {
        return facts;
      });
    }
  };

  service.createQuestion = function(question, theme) {
    if (theme) {
      if (!theme.questions) {
        theme.questions = [];
      }
      theme.questions.push(question);
      return this.updateTheme(theme).then(function(theme) {
        return theme.questions.filter(function(q) { return q === question; })[0];
      });
    } else {
      return post(rootUrl + '/questions', question);
    }
  };

  service.updateQuestion = function(question, theme) {
    if (theme) {
      if (theme.questions.indexOf(question) === -1) {
        theme.questions.push(question);
      }
      return this.updateTheme(theme);
    } else {
      var index = portfolio.questions.indexOf(question);
      return put(rootUrl + '/questions/' + index, question);
    }
  };

  service.deleteQuestion = function(question, theme) {
    if (theme) {
      theme.questions = theme.questions.filter(function(q) { return q !== question; });
      return this.updateTheme(theme);
    } else {
      var index = portfolio.questions.indexOf(question);
      return deleteRequest(rootUrl + '/questions/' + index);
    }
  };

  service.createCampaign = function(themeName, path = '.') {
    var body = {
      theme: themeName,
      path: path + '/' + themeName + '.json'
    };
    return post(rootUrl + '/campaign', body).then(function(campaignObj) {
      campaign = campaignObj;
      return campaign;
    });
  };

  return service;
}]);
