const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const atob = require('atob');

router.get('/campaign/:campaign_hash', (req, res, next) => {
  const hash = req.params.campaign_hash,
        id = atob(hash);
  return req.client.query({
    text: 'select * from campaigns where id = $1::bigint',
    values: [id]
  }).then((campaign) => {
    res.json(campaign);
  })
});

let transporter;
router.use((req, res, next) => {
  transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });
  next();
});

router.post('/jobs', (req, res, next) => {
  const values = req.body,
        email = values.email.toLowerCase(),
        username = values.username,
        jobs = values.jobs;
  return Promise.all(jobs.map((job) => {
    return req.client.query({
      text: 'insert into jobs (email) values($1) returning id',
      values: [email]
    }).then((result) => {
      const newJob = result.rows[0];
      job.id = newJob.id;
      return job.messages.map((msg) => {
        return Promise.all([
          // the 'question' message
          req.client.query({
            text: 'insert into messages (type, value, job_id, datetime, sender) values($1::text, $2::text, $3::bigint, NOW(), $4::text)',
            values: [msg.type, msg.text, job.id, username]
          }),
          // the 'answer' message
          req.client.query({
            text: 'insert into messages (type, value, job_id, datetime, sender) values($1::text, $2::text, $3::bigint, NOW(), $4::text)',
            values: [msg.type, msg.value, job.id, email]
          })
        ]);
      });
    });
  })).then(() => {
    // req.client.end() // throws an error?
    return Promise.all(jobs.filter((job) => job.id).map((job) => {
      const jobText = job.messages.map((msg) => `${msg.text}: ${msg.value}`).join('\n');
      return transporter.sendMail({
        from: 'no-reply@counteroffer.me',
        to: 'bob@bobstark.me', // TODO: link candidates with email addresses
        subject: 'New job from ' + email,
        text: `${jobText}\nView discussion: http://counteroffer.io/#!?job=${job.id}`
      });
    })).then(() => res.sendStatus(200));
  });
});

router.get('/jobs', (req, res, next) => {
  const email = req.query.email.toLowerCase();
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
    req.client.end();
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
        email = msg.email.toLowerCase(),
        value = msg.value,
        jobID = req.params.job_id;
  const promises = [];
  promises.push(req.client.query({
    text: 'insert into messages (type, value, job_id, datetime, sender) values ($1::text, $2::text, $3::bigint, NOW(), $4::text) returning *',
    values: [type, value, jobID, email]
  }));
  promises.push(req.client.query({
    text: 'update jobs set archived = $1::boolean where id = $2::bigint',
    values: [false, jobID]
  }));
  Promise.all(promises).then((results) => {
    const msg = results[0].rows[0];
    return transporter.sendMail({
      from: 'no-reply@counteroffer.me',
      to: 'bob@bobstark.me', // TODO: link candidates with email addresses
      subject: 'New message from ' + msg.sender,
      text: `${msg.value}\nView discussion: http://counteroffer.io/#!?job=${jobID}`
    }).then(() => {
      return res.json(msg);
    });
  });
});

module.exports = router;
