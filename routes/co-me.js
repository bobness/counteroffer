const express = require('express');
const router = express.Router();

/*
router.get('/', function(req, res, next) {
  res.json({ message: 'hi there' });
});
*/

router.post('/jobs', function(req, res, next) {
  const values = req.body,
        email = values.email,
        jobs = values.jobs;
  return req.client.query({text: 'insert into jobs (email) values($1) returning id', values: [email]}).then((result) => {
    const newJob = result.rows[0];
    return Promise.all(jobs.map((job) => {
      return job.questions.map((question) => {
        return req.client.query({
          text: 'insert into messages (type, text, value, job_id) values($1::text, $2::text, $3::text, $4::bigint) returning *',
          values: [question.type, question.text, question.value, newJob.id]
        });
      })
    })).then(() => {
      return res.sendStatus(200);
    });
  });
});

module.exports = router;
