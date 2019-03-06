const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const aws = require('aws-sdk');
const atob = require('atob');
const md5 = require('md5');
const uuidv4 = require('uuid/v4');

router.param('campaign_hash', (req, res, next, campaign_hash) => {
  const campaignId = atob(campaign_hash);
  return req.pool.query({
    text: 'select * from campaigns where id = $1::bigint',
    values: [campaignId]
  }).then((result) => {
    req.campaign = result.rows[0];
    return req.pool.query({
      text: 'select u.* from portfolios p, users u where p.id = $1::bigint and p.user_id = u.id',
      values: [req.campaign.portfolio_id]
    }).then((result) => {
      req.user = result.rows[0];
      next();
    });
  }).catch((err) => {
    console.error(err);
    res.sendStatus(500);
  });
});

router.get('/campaigns/:campaign_hash', (req, res, next) => {
  return res.json(req.campaign);
});

aws.config.loadFromPath('./aws-config.json');

let transporter;
router.use((req, res, next) => {
  transporter = nodemailer.createTransport({
    SES: new aws.SES({
      apiVersion: '2010-12-01'
    })
  });
  next();
});

router.post('/user', (req, res, next) => {
  const values = req.body,
        email = values.email,
        password = values.password,
        hash = md5(password);
  return req.pool.query({
    text: 'insert into users (email, hashed_password) values ($1::text, $2::text) returning *',
    values: [email, hash]
  }).then((results) => {
    const user = results.rows[0];
    const session = uuidv4();
    return req.pool.query({
      text: 'update users set current_session = $1::text where id = $2::bigint',
      values: [session, user.id]
    }).then(() => {
      return res.json(session);
    }).catch((err) => {
      return res.json(err);
    });
  });
});

router.post('/session', (req, res, next) => {
  const values = req.body,
        email = values.email,
        password = values.password,
        hash = md5(password);
  return req.pool.query({
    text: 'select * from users where email = $1::text',
    values: [email]
  }).then((results) => {
    const user = results.rows[0],
          currentSession = user.current_session,
          passwordHash = user.hashed_password;
    if (passwordHash === hash) {
      if (currentSession) {
        return res.json(currentSession);
      }
      const session = uuidv4();
      return req.pool.query({
        text: 'update users set current_session = $1::text where id = $2::bigint',
        values: [session, user.id]
      }).then(() => {
        return res.json(session);
      });
    } else {
      return res.sendStatus(403);
    }
  })
});

router.post('/campaigns/:campaign_hash/jobs', (req, res, next) => {
  const values = req.body,
        email = values.email.toLowerCase(),
        jobs = values.jobs;
  return Promise.all(jobs.map((job) => {
    return req.pool.query({
      text: 'insert into jobs (email, campaign_id, survey, user_id) values($1::text, $2::bigint, $3::json[], $4::bigint) returning id',
      values: [email, req.campaign.id, job.questions, req.user.id]
    }).then((result) => {
      const newJob = result.rows[0];
      job.id = newJob.id;
    });
  })).then(() => {
    return Promise.all(jobs.filter((job) => job.id).map((job) => {
      const jobText = job.questions.map((q) => `${q.text}: ${q.value}`).join('\n');
      return transporter.sendMail({
        from: 'no-reply@counteroffer.me',
        to: req.user.email,
        subject: 'New job from ' + email,
        text: `${jobText}\nView discussion: http://counteroffer.io/#!?job=${job.id}`
      });
    })).then(() => res.sendStatus(200));
  });
});

router.get('/campaigns/:campaign_hash/jobs', (req, res, next) => {
  const email = req.query.email.toLowerCase();
  let jobs = [];
  return req.pool.query({
    text: 'select * from jobs where email = $1::text and campaign_id = $2::bigint',
    values: [email, req.campaign.id]
  }).then((result) => {
    jobs = result.rows;
    return Promise.all(jobs.map((job) => {
      return req.pool.query({
        text: 'select * from messages where job_id = $1::bigint',
        values: [job.id]
      }).then((result) => {
        const messages = result.rows;
        job.messages = messages;
      });
    }));
  }).then(() => {
    return res.json(jobs);
  })
});

// TODO: remove if I can't find a use case?
router.put('/campaigns/:campaign_hash/jobs/:job_id', (req, res, next) => {
  const values = req.body,
        job = values.job;
  return req.pool.query({
    text: 'update jobs set email = $1::text, campaign_id = $2::bigint, survey = $3::json where id = $4::bigint',
    values: [job.email, req.campaign.id, job.questions, job.id]
  }).then(() => {
    return res.sendStatus(200);
  });
});

router.delete('/campaigns/:campaign_hash/jobs/:job_id', (req, res, next) => {
  const jobID = req.params.job_id;
  return req.pool.query({
    text: 'delete from messages where job_id = $1::bigint',
    values: [jobID]
  }).then(() => {
    return req.pool.query({
      text: 'delete from facts where job_id = $1::bigint',
      values: [jobID]
    });
  }).then(() => {
    return req.pool.query({
      text: 'delete from jobs where id = $1::bigint',
      values: [jobID]
    });
  }).then(() => {
    return res.sendStatus(200);
  });
});

router.post('/campaigns/:campaign_hash/jobs/:job_id/messages', (req, res, next) => {
  const type = 'text',
        msg = req.body,
        sender = msg.sender.toLowerCase(),
        value = msg.value,
        jobID = req.params.job_id;
  const promises = [];
  promises.push(req.pool.query({
    text: 'insert into messages (type, value, job_id, datetime, sender) values ($1::text, $2::text, $3::bigint, NOW(), $4::text) returning *',
    values: [type, value, jobID, sender]
  }));
  promises.push(req.pool.query({
    text: 'update jobs set archived = $1::boolean where id = $2::bigint',
    values: [false, jobID]
  }));
  Promise.all(promises).then((results) => {
    const msg = results[0].rows[0];
    if (msg) {
      const url = 'http://counteroffer.io/#!/' + encodeURIComponent(req.campaign.theme_name) + `?job=${jobID}`;
      return transporter.sendMail({
        from: 'no-reply@counteroffer.me',
        to: req.user.email,
        subject: 'New message from ' + msg.sender,
        text: `${msg.value}\n\nView discussion: ${url}`
      }).then(() => {
        return res.json(msg);
      });
    }
  });
});

module.exports = router;
