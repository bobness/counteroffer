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
  
  const data = req.body;
  
  var mailOptions = {
    from: 'Counteroffer <no-reply@counteroffer.me>',
    to: 'bob@bobstark.me',
    subject: 'Counteroffer Contact',
    text: data.map((question) => { 
      if (Array.isArray(question.value)) {
        return `${question.text}\n` + question.value.map((val) => `- ${val}`).join('\n');
      }
      return `${question.text} - ${question.value}`; 
    }).join('\n')
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
