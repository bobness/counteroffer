const express = require('express');
const router = express.Router();
const md5 = require('md5');
const uuidv4 = require('uuid/v4');

// TODO: in the future, validate sessions on every request if I want to allow them to timeout
/*
router.use((req, res, next) => {
  const session = req.get('session'),
        username = req.get('username');
  return req.client.query({
    text: 'select current_session from users where username = $1::text',
    values: [username]
  }).then((results) => {
    const user = results.rows[0],
          currentSession = user.current_session;
    if (currentSession === session) {
      return next();
    } else {
      return res.sendStatus(401);
    }
  })
});
*/

/*
router.get('/', function(req, res, next) {
  res.json({ message: 'hi there' });
});
*/

router.get('/jobs', function(req, res, next) {
  return req.client.query({text: 'select * from jobs'}).then((results) => {
    req.client.end();
    return res.json(results.rows);
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
})

router.post('/jobs/:job_id/messages', (req, res, next) => {
  const type = 'text',
        msg = req.body,
        username = msg.username,
        text = `Message from ${username}`,
        value = msg.value;
  return req.client.query({
    text: 'insert into messages (type, text, value, job_id) values ($1::text, $2::text, $3::text, $4::bigint) returning *',
    values: [type, text, value, req.params.job_id]
  }).then((results) => {
    const msg = results.rows[0];
    return res.json(msg);
  });
});

router.get('/jobs/:job_id/messages', (req, res, next) => {
	return req.client.query({
  	text: 'select * from messages where job_id = $1::bigint',
  	values: [req.params.job_id]
  }).then((results) => {
    req.client.end();
    return res.json(results.rows);
  });
});

router.get('/jobs/:job_id/facts', (req, res, next) => {
  return req.client.query({
    text: 'select * from facts where job_id = $1::bigint',
    values: [Number(req.params.job_id)]
  }).then((results) => {
    req.client.end();
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
    req.client.end();
    return results.rows && results.rows.length === 1 ? res.json(results.rows)[0] : null;
  });
});

router.put('/jobs/:job_id/facts/:fact_id', (req, res, next) => {
  const fact = req.body;
  return req.client.query({
    text: 'update facts set key = $1::text, value = $2::text where id = $3::bigint',
    values: [fact.key, fact.value, fact.id]
  }).then(() => {
    req.client.end();
    return res.sendStatus(200);
  });
});

router.post('/session', (req, res, next) => {
  const values = req.body,
        username = values.username,
        password = values.password,
        hash = md5(password);
  return req.client.query({
    text: 'select * from users where username = $1::text',
    values: [username]
  }).then((results) => {
    const user = results.rows[0],
          currentSession = user.current_session,
          passwordHash = user.hashed_password;
    if (passwordHash === hash) {
      if (currentSession) {
        return res.json(currentSession);
      }
      const session = uuidv4();
      return req.client.query({
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

module.exports = router;
