const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

let transporter;
router.use((req, res, next) => {
  transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });
  next();
});

/*
router.get('/', function(req, res, next) {
  res.json({ message: 'hi there' });
});
*/

router.post('/jobs', (req, res, next) => {
  const values = req.body,
        email = values.email,
        username = values.username,
        jobs = values.jobs;
  return Promise.all(jobs.map((job) => {
    return req.client.query({
      text: 'insert into jobs (email) values($1) returning id', 
      values: [email]
    }).then((result) => {
      const newJob = result.rows[0];
      return job.messages.map((msg) => {
        return Promise.all([
          // the 'question' message
          req.client.query({
            text: 'insert into messages (type, value, job_id, datetime, sender) values($1::text, $2::text, $3::bigint, NOW(), $4::text) returning *',
            values: [msg.type, msg.text, newJob.id, username]
          }),
          // the 'answer' message
          req.client.query({
            text: 'insert into messages (type, value, job_id, datetime, sender) values($1::text, $2::text, $3::bigint, NOW(), $4::text) returning *',
            values: [msg.type, msg.value, newJob.id, email]
          })
        ]);
      });
    });
  })).then(() => {
    // req.client.end() // throws an error?
    return res.sendStatus(200);
  });
});

router.get('/jobs', (req, res, next) => {
  const email = req.query.email;
  let jobs = [];
  return req.client.query({
    text: 'select * from jobs where email = $1::text',
    values: [email]
  }).then((result) => {
    jobs = result.rows;
    return Promise.all(jobs.map((job) => {
      return req.client.query({
        text: 'select * from messages where job_id = $1::bigint',
        values: [job.id]
      }).then((result) => {
        const messages = result.rows;
        job.messages = messages;
      });
    }));
  }).then(() => {
    // req.client.end() // throws an error?
    return res.json(jobs);
  })
});

router.put('/jobs/:job_id', (req, res, next) => {
  const values = req.body,
        job = values.job;
  return Promise.all(job.messages.map((msg) => {
    return req.client.query({
      text: 'update messages set type = $1::text, text = $2::text, value = $3::text where id = $4::bigint',
      values: [msg.type, msg.text, msg.value, msg.id]
    });
  })).then(() => {
    // req.client.end() // throws an error?
    return res.sendStatus(200);
  });
});

router.delete('/jobs/:job_id', (req, res, next) => {
  const jobID = req.params.job_id;
  return req.client.query({
    text: 'delete from messages where job_id = $1::bigint',
    values: [jobID]
  }).then(() => {
    return req.client.query({
      text: 'delete from facts where job_id = $1::bigint',
      values: [jobID]
    });
  }).then(() => {
    return req.client.query({
      text: 'delete from jobs where id = $1::bigint',
      values: [jobID]
    });
  }).then(() => {
    // req.client.end() // throws an error?
    return res.sendStatus(200);
  });
});

router.post('/jobs/:job_id/messages', (req, res, next) => {
  const type = 'text',
        msg = req.body,
        email = msg.email,
        value = msg.value,
        jobID = req.params.job_id;
  return req.client.query({
    text: 'insert into messages (type, value, job_id, datetime, sender) values ($1::text, $2::text, $3::bigint, NOW(), $4::text) returning *',
    values: [type, value, jobID, email]
  }).then((results) => {
    const msg = results.rows[0];
    return transporter.sendMail({
      from: 'no-reply@conteroffer.me',
      to: email,
      subject: 'New message from ' + msg.sender,
      text: `${msg.value}\nView discussion: http://counteroffer.app/#!?job=${jobID}`
    }).then(() => {
      return res.json(msg);
    });
  });
});

module.exports = router;
