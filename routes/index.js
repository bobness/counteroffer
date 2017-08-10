const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

router.get('/', function(req, res, next) {
  res.json({ message: 'hi there' });
});

router.post('/', function(req, res, next) {
  var transporter = nodemailer.createTransport(smtpTransport({
    host: 'localhost',
    port: 25
  }));
  
  const data = req.body;
  
  var mailOptions = {
    from: 'Counteroffer <no-reply@counteroffer.me>',
    to: 'bob@bobstark.me',
    subject: 'Counteroffer Contact',
    text: Object.keys(data).map((key) => { return `${key}: ${data[key]}`; }).join('\n')
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
