const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

router.get('/', function(req, res, next) {
  res.json({ message: 'hi there' });
});

router.post('/', function(req, res, next) {
  var transporter = nodemailer.createTransport(smtpTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: 'bob@bobstark.me',
        pass: 'i0t4*375'
    }
  }));
  
  console.log('req.body: ', req.body);
  
  const [emailQuestion, jobs] = req.body;
  
  var mailOptions = {
//     from: emailQuestion.value || 'Counteroffer', // TODO: always has it from bob@bobstark.me
    to: 'bobness@gmail.com',
    subject: 'Counteroffer Contact',
    text: jobs.map((job, index) => {
      let ret = `Job #${index+1} ***\n`;
      ret += `Email - ${emailQuestion.value}\n`;
      return ret + job.questions.map((question) => {
        if (Array.isArray(question.value)) {
          return `${question.text} - \n` + question.value.map((val) => `- ${val}`).join('\n');
        }
        return `${question.text} - ${question.value}`; 
      }).join('\n');
    }).join('\n\n')
  };
  
  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      next(error);
    } else {
      return res.json({ message: 'Successful' });
    }
  });
});

module.exports = router;
