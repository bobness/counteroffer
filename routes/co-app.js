const express = require('express');
const router = express.Router();

/*
router.get('/', function(req, res, next) {
  res.json({ message: 'hi there' });
});
*/

router.get('/jobs', function(req, res, next) {
  return req.client.query({text: 'select * from jobs'}).then((results) => {
    return res.json(results.rows);
  });
});

router.get('/jobs/:job_id/messages', (req, res, next) => {
	return req.client.query({
  	text: 'select * from messages where job_id = $1::bigint',
  	values: [req.params.job_id]
  }).then((results) => {
    return res.json(results.rows);
  });
});

module.exports = router;
