'use strict';

const fs = require('fs');

class Portfolio {
  constructor(client, userId) {
    if (client && userId) {
      this.client = client;
      this.userId = userId;
    } else {
	    throw new Error('Missing argument to Portfolio constructor');
    }
  }

  save(obj = this.obj) {
    this.client.query({
      text: 'update portfolios set json = $1::json where id = $2::bigint',
      values: [obj, this.id]
    }).then(() => {
      this.client.release();
    });
  }

  fetchData() {
    return this.client.query({
      text: 'select json from portfolios where user_id = $1::bigint',
      values: [this.userId]
    }).then((result) => {
      this.obj = result.rows[0].json;
      if (!this.obj.themes) {
        this.obj.themes = [];
      }
      if (!this.obj.experiences) {
        this.obj.experiences = [];
      }
      if (!this.obj.facts) {
        this.obj.facts = [];
      }
      if (!this.obj.questions) {
        this.obj.questions = [];
      }
      return this.obj
    });
  }

  get experiences() {
	  return Array.from(this.obj.experiences);
  }

  addExperience(exp) {
    this.obj.experiences.push(exp);
    return exp;
  }

  updateExperience(index, exp) {
    this.obj.experiences[index] = exp;
  }

  deleteExperience(index) {
    this.obj.experiences.splice(index, 1);
  }

  get themes() {
	  return Array.from(this.obj.themes);
  }

  addTheme(theme) {
    this.obj.themes.push(theme);
    return theme;
  }

  updateTheme(index, theme) {
    this.obj.themes[index] = theme;
  }

  deleteTheme(index) {
    this.obj.themes.splice(index, 1);
  }

  get facts() {
    return this.obj.facts;
  }

  set facts(facts) {
    this.obj.facts = facts;
  }

  addFact(fact) {
    this.obj.facts.push(fact);
    return fact;
  }

  updateFact(index, fact) {
    this.obj.facts[index] = fact;
  }

  deleteFact(index) {
    this.obj.facts.splice(index, 1);
  }

  get questions() {
    return this.obj.questions;
  }

  addQuestion(question) {
    this.obj.questions.push(question);
    return question;
  }

  updateQuestion(index, question) {
    this.obj.questions[index] = question;
  }

  deleteQuestion(index) {
    this.obj.questions.splice(index, 1);
  }

  writeCampaignFile(path, themeName) {
    const theme = this.obj.themes.find((theme) => theme.name === themeName),
          experiences = theme.tags.reduce((experiences, tag) => {
            return experiences.concat(this.obj.experiences.filter((exp) => {
              return exp.tags.indexOf(tag) > -1 && experiences.indexOf(exp) === -1;
            }));
          }, []),
          data = {
            experiences: experiences,
            tags: theme.tags,
            facts: theme.facts,
            questions: theme.questions
          };
    return writeFile(path, data);
  }
}

module.exports = Portfolio;
