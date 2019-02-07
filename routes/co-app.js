const express = require('express');
const router = express.Router();
const md5 = require('md5');
const uuidv4 = require('uuid/v4');
const nodemailer = require('nodemailer');

const Portfolio = require('./portfolio')

let transporter;
router.use((req, res, next) => {
  transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
  });
  next();
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

router.use(async (req, res, next) => {
  const session = req.get('x-session-id'),
        username = req.get('x-username');
  const results = await req.client.query({
    text: 'select * from users where username = $1::text',
    values: [username]
  });
  const user = results.rows[0],
        currentSession = user.current_session;
  if (currentSession === session) {
    req.userId = user.id;
    const portfolio = new Portfolio(req.client, user.id);
    await portfolio.fetchData();
    req.app.set('portfolio', portfolio);
    return next();
  } else {
    req.client.end();
    return res.sendStatus(401);
  }
});

const pc = require('./pc-routes');
router.use('/portfolio', pc);

const getMessagesFromJobID = (client, userId, jobID) => {
  return client.query({
  	text: 'select * from messages where user_id = $1::bigint and job_id = $2::bigint',
  	values: [userId, jobID]
  });
};

const getFactsFromJobID = (client, userId, jobID) => {
  return client.query({
    text: 'select * from facts where user_id = $1::bigint and job_id = $2::bigint',
    values: [jobID]
  });
};

router.post('/jobs', (req, res, next) => {
  const job = req.body,
        email = job.email;
  return req.client.query({
    text: 'insert into jobs (email, user_id) values($1::text, $2::bigint) returning *',
    values: [email, req.userId]
  }).then((result) => {
    const newJob = result.rows[0];
    req.client.end();
    return res.json(newJob);
  });
});

router.get('/jobs', function(req, res, next) {
  return req.client.query({
    text: `select j.*, m.latest_msg, f.key, f.value from jobs j
      left outer join (select job_id, max(datetime) as latest_msg from messages group by job_id) m on m.job_id=j.id
      left outer join facts f on f.job_id=j.id
      where j.user_id = $1::bigint and m.user_id = $1::bigint and f.user_id = $1::bigint`,
    values: [req.userId]
  }).then((results) => {
    const jobObj = {};
    results.rows.forEach((job) => {
      if (!jobObj[job.id]) {
        jobObj[job.id] = {
          id: job.id,
          email: job.email,
          archived: job.archived,
          company: job.company,
          latest_msg: job.latest_msg,
          facts: []
        };
      }
      if (job.key && job.value) {
        jobObj[job.id].facts.push({key: job.key, value: job.value});
      }
    });
    const jobs = Object.keys(jobObj).map((key) => jobObj[key]);
    req.client.end();
    return res.json(jobs);
  });
});

router.put('/jobs/:job_id', (req, res, next) => {
  const job = req.body;
  return req.client.query({
    text: 'update jobs set company = $1::text, archived = $2::boolean where user_id = $3::bigint and id=$4::bigint',
    values: [job.company, job.archived, req.userId, req.params.job_id]
  }).then(() => {
    req.client.end();
    res.sendStatus(200);
  });
});

router.delete('/jobs/:job_id', (req, res, next) => {
  const jobID = req.params.job_id;
  return req.client.query({
    text: 'delete from messages where user_id = $1::bigint job_id = $2::bigint',
    values: [req.userId, jobID]
  }).then(() => {
    return req.client.query({
      text: 'delete from facts where user_id = $1::bigint and job_id = $2::bigint',
      values: [req.userId, jobID]
    });
  }).then(() => {
    return req.client.query({
      text: 'delete from jobs where user_id = $1::bigint and id = $1::bigint',
      values: [req.userId, jobID]
    });
  }).then(() => {
    req.client.end();
    return res.sendStatus(200);
  });
});

// TODO: add user_id to the queries below to make them more secure

router.post('/jobs/:job_id/messages', (req, res, next) => {
  const type = 'text',
        email = req.body.email,
        archive = req.body.archive,
        msg = req.body.message,
        username = msg.username,
        value = msg.value,
        jobID = req.params.job_id;
  const promises = [];
  if (value) {
    promises.push(req.client.query({
      text: 'insert into messages (type, value, job_id, datetime, sender) values ($1::text, $2::text, $3::bigint, NOW(), $4::text) returning *',
      values: [type, value, jobID, username]
    }));
  }
  if (archive) {
    promises.push(req.client.query({
      text: 'update jobs set archived = $1::boolean where id = $2::bigint',
      values: [archive, jobID]
    }));
  }
  Promise.all(promises).then((results) => {
    const msg = results[0].rows[0];
    if (msg) {
      return transporter.sendMail({
        from: 'no-reply@counteroffer.me',
        to: email,
        subject: 'New message from ' + msg.sender,
        text: `${msg.value}\nView discussion: http://counteroffer.me/${username}/#!/contact?job=${jobID}`
      }).then(() => {
        req.client.end();
        return res.json(msg);
      });
    } else {
      req.client.end();
      return res.sendStatus(200);
    }
  });
});

router.get('/jobs/:job_id/messages', (req, res, next) => {
	return getMessagesFromJobID(req.client, req.params.job_id).then((results) => {
    req.client.end();
    return res.json(results.rows);
  });
});

router.get('/jobs/:job_id/facts', (req, res, next) => {
  return getFactsFromJobID(req.client, req.params.job_id).then((results) => {
    req.client.end()
    return res.json(results.rows);
  });
});

router.post('/jobs/:job_id/facts', (req, res, next) => {
  const fact = req.body,
        jobID = req.params.job_id,
        key = fact.key,
        value = fact.value;
  return req.client.query({
    text: 'insert into facts (key, value, job_id) values ($1::text, $2::text, $3::bigint) returning *',
    values: [key, value, jobID]
  }).then((results) => {
    req.client.end()
    return results.rows && results.rows.length === 1 ? res.json(results.rows)[0] : null;
  });
});

router.put('/jobs/:job_id/facts/:fact_id', (req, res, next) => {
  const fact = req.body;
  return req.client.query({
    text: 'update facts set key = $1::text, value = $2::text where id = $3::bigint',
    values: [fact.key, fact.value, fact.id]
  }).then(() => {
    req.client.end()
    return res.sendStatus(200);
  });
});

router.delete('/jobs/:job_id/facts/:fact_id', (req, res, next) => {
  return req.client.query({
    text: 'delete from facts where id=$1::bigint and job_id=$2::bigint',
    values: [req.params.fact_id, req.params.job_id]
  }).then(() => {
    req.client.end()
    return res.sendStatus(200);
  })
});

module.exports = router;
