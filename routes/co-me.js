const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const atob = require('atob');
const md5 = require('md5');
const uuidv4 = require('uuid/v4');

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

router.post('/user', (req, res, next) => {
  const values = req.body,
        email = values.email,
        password = values.password,
        hash = md5(password);
  return req.client.query({
    text: 'insert into users (email, hashed_password) values ($1::text, $2::text) returning *',
    values: [email, hash]
  }).then((results) => {
    const user = results.rows[0];
    const session = uuidv4();
    return req.client.query({
      text: 'update users set current_session = $1::text where id = $2::bigint',
      values: [session, user.id]
    }).then(() => {
      req.client.end();
      return res.json(session);
    }).catch((err) => {
      req.client.end();
      return res.json(err);
    });
  });
});

router.post('/session', (req, res, next) => {
  const values = req.body,
        email = values.email,
        password = values.password,
        hash = md5(password);
  return req.client.query({
    text: 'select * from users where email = $1::text',
    values: [email]
  }).then((results) => {
    const user = results.rows[0],
          currentSession = user.current_session,
          passwordHash = user.hashed_password;
    if (passwordHash === hash) {
      if (currentSession) {
        req.client.end();
        return res.json(currentSession);
      }
      const session = uuidv4();
      return req.client.query({
        text: 'update users set current_session = $1::text where id = $2::bigint',
        values: [session, user.id]
      }).then(() => {
        req.client.end();
        return res.json(session);
      });
    } else {
      req.client.end();
      return res.sendStatus(403);
    }
  })
});

router.post('/jobs', (req, res, next) => {
  const values = req.body,
        email = values.email.toLowerCase(),
        campaignId = atob(values.campaign),
        username = values.username,
        jobs = values.jobs;
  return Promise.all(jobs.map((job) => {
    return req.client.query({
      text: 'insert into jobs (email, campaign_id) values($1::text, $2::bigint) returning id',
      values: [email, campaignId]
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
    return Promise.all(jobs.filter((job) => job.id).map((job) => {
      req.client.end();
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
  const campaignId = atob(req.query.campaign);
  let jobs = [];
  return req.client.query({
    text: 'select * from jobs where email = $1::text and campaign_id = $2::bigint',
    values: [email, campaignId]
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
    req.client.end();
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
    req.client.end();
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
    req.client.end();
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
