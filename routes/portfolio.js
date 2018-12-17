'use strict';

const fs = require('fs');

const writeFile = (path, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, JSON.stringify(data), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

class Portfolio {
  constructor(filePath) {
    if (filePath) {      
      this.path = filePath;
      this.obj = JSON.parse(fs.readFileSync(this.path));
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
    } else {
	    throw new Error('Usage: node app.js [portfolioFile]');
    }
  }
  
  save(path = this.path, obj = this.obj) {
    return writeFile(path, obj);
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